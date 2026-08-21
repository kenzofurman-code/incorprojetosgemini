import { chromium } from 'playwright'
import fs from 'fs'

async function inspectWindowProperties() {
  console.log('🔍 Inspecionando propriedades globais de dados no SYDLE ONE...')

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

    const formObjects = await page.evaluate(() => {
      const dialog = document.querySelector('sy-dialog, sy-sd-dialog-one-form')
      if (!dialog) return null

      // No SYDLE ONE / Angular, elementos tem propriedades como __ngContext__ ou _model ou data
      const keys = Object.keys(dialog)
      const dataProps = {}
      for (const k of keys) {
        try {
          dataProps[k] = typeof dialog[k]
        } catch {}
      }

      // Procurar todos os links dentro do shadowRoot de cada card
      const links = []
      function extractLinks(root) {
        if (!root) return
        if (root.shadowRoot) extractLinks(root.shadowRoot)
        if (root.children) {
          for (const c of root.children) {
            extractLinks(c)
            if (c.tagName === 'A' && c.href) {
              links.push({ href: c.href, text: c.innerText })
            }
            if (c.onclick || c.getAttribute('onclick')) {
              links.push({ onclick: String(c.onclick), text: c.innerText })
            }
          }
        }
      }
      extractLinks(dialog)

      return { keys, links }
    })

    console.log('Dados encontrados no diálogo:', formObjects)
    fs.writeFileSync('scripts/sydle-form-objects.json', JSON.stringify(formObjects, null, 2))

  } finally {
    await browser.close()
  }
}

inspectWindowProperties()
