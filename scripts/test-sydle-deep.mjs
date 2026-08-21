/**
 * Teste com Shadow DOM piercing + Network API Interception
 */
import { chromium } from 'playwright'
import fs from 'fs'

async function testExtraction() {
  const browser = await chromium.launch({ headless: true })
  
  // Usar a sessão salva que já está logada
  let context
  if (fs.existsSync('scripts/session-curitiba.json')) {
    context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  } else {
    context = await browser.newContext()
  }

  const page = await context.newPage()

  // 1. Interceptar todas as respostas de API JSON
  const apiPayloads = []
  page.on('response', async (response) => {
    const url = response.url()
    const contentType = response.headers()['content-type'] || ''
    if (url.includes('/api/') && (contentType.includes('json') || contentType.includes('javascript'))) {
      try {
        const json = await response.json()
        apiPayloads.push({ url, data: json })
        console.log(`📡 [API Interceptada] ${url}`)
      } catch { /* ignore non-json */ }
    }
  })

  try {
    console.log('🌐 Acessando o ticket...')
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(10000)

    // 2. Extração profunda de Shadow DOM
    const shadowData = await page.evaluate(() => {
      function extractFromShadow(root) {
        let results = []

        if (!root) return results

        // Se tiver shadowRoot, entra nele
        if (root.shadowRoot) {
          results.push(...extractFromShadow(root.shadowRoot))
        }

        // Percorre nós filhos
        if (root.children) {
          for (const el of root.children) {
            // Se for card, campo, texto ou tabela
            const tag = el.tagName.toLowerCase()
            const text = el.innerText || el.textContent || ''
            
            if (text.trim() && (tag.startsWith('sy-') || tag === 'div' || tag === 'section' || tag === 'table' || tag === 'p' || tag === 'span')) {
              results.push({
                tag,
                classes: el.className,
                text: text.trim(),
              })
            }

            results.push(...extractFromShadow(el))
          }
        }

        return results
      }

      return extractFromShadow(document.body)
    })

    console.log(`📦 Elementos de Shadow DOM encontrados: ${shadowData.length}`)
    console.log(`📡 Payloads de API capturados: ${apiPayloads.length}`)

    fs.writeFileSync('scripts/debug-shadow.json', JSON.stringify(shadowData.slice(0, 100), null, 2))
    fs.writeFileSync('scripts/debug-api.json', JSON.stringify(apiPayloads, null, 2))

  } finally {
    await browser.close()
  }
}

testExtraction()
