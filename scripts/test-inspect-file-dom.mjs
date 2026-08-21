import { chromium } from 'playwright'
import fs from 'fs'

async function inspectDownloadActions() {
  console.log('🔍 Investigando como o SYDLE ONE realiza o download dos arquivos...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(6000)

    const buttons = page.locator('sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    const btn = buttons.nth(count - 1)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(6000)

    // Investigar os botões de ação e menus de arquivo dentro do shadow DOM
    const details = await page.evaluate(() => {
      const results = []
      function explore(root) {
        if (!root) return
        if (root.shadowRoot) explore(root.shadowRoot)
        if (root.children) {
          for (const c of root.children) {
            explore(c)
            if (c.tagName.toLowerCase().includes('file') || c.tagName.toLowerCase().includes('attachment') || c.className?.toString().includes('file')) {
              results.push({
                tag: c.tagName,
                class: c.className?.toString() || '',
                id: c.id || '',
                innerHTML: c.innerHTML ? c.innerHTML.slice(0, 300) : ''
              })
            }
          }
        }
      }
      explore(document.querySelector('sy-dialog, sy-sd-dialog-one-form') || document.body)
      return results
    })

    console.log(`Elementos de arquivo/anexo no DOM: ${details.length}`)
    fs.writeFileSync('scripts/sydle-file-dom.json', JSON.stringify(details.slice(0, 15), null, 2))
    console.log('Salvo em scripts/sydle-file-dom.json')

  } finally {
    await browser.close()
  }
}

inspectDownloadActions()
