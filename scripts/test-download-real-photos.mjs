import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadRealPhotos() {
  console.log('🚀 Baixando fotos e PDFs reais da Prefeitura de Curitiba...')

  const outDir = path.resolve('public', 'vistorias', 'hall_design')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(6000)

    // Clicar na ação "Visualizar" da UCE (onde estão todas as fotos da vistoria)
    const btn = page.locator('sy-button:has-text("Visualizar")').first()
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(5000)

    // Capturar todos os elementos de imagem e links de download do formulário
    const mediaItems = await page.evaluate(() => {
      const results = []
      function searchNodes(root) {
        if (!root) return
        if (root.shadowRoot) searchNodes(root.shadowRoot)
        if (root.children) {
          for (const c of root.children) {
            searchNodes(c)
            if (c.tagName === 'IMG' && c.src) {
              results.push({ type: 'img', src: c.src, alt: c.alt || '' })
            }
            if (c.tagName === 'A' && c.href) {
              results.push({ type: 'link', href: c.href, text: c.innerText.trim() })
            }
          }
        }
      }
      searchNodes(document.querySelector('sy-dialog, sy-sd-dialog-one-form') || document.body)
      return results
    })

    console.log(`Encontrados ${mediaItems.length} elementos de mídia no formulário da vistoria!`)
    console.log(mediaItems.slice(0, 10))

  } catch (err) {
    console.error('Erro:', err.message)
  } finally {
    await browser.close()
  }
}

downloadRealPhotos()
