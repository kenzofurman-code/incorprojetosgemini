import { chromium } from 'playwright'
import fs from 'fs'

async function inspectShadowElements() {
  console.log('🔍 Inspecionando Shadow DOM dos cards de arquivos e fotos...')

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

    const components = await page.evaluate(() => {
      const list = []
      function inspect(el) {
        if (!el) return
        if (el.tagName && (el.tagName.startsWith('SY-') || el.tagName === 'A' || el.tagName === 'BUTTON')) {
          list.push({
            tag: el.tagName,
            class: el.className || '',
            text: el.innerText ? el.innerText.slice(0, 40) : '',
            hasShadow: !!el.shadowRoot
          })
        }
        if (el.shadowRoot) inspect(el.shadowRoot)
        if (el.children) {
          for (const c of el.children) inspect(c)
        }
      }
      inspect(document.querySelector('sy-dialog, sy-sd-dialog-one-form') || document.body)
      return list
    })

    console.log(`Componentes encontrados: ${components.length}`)
    const fileComponents = components.filter(c => c.text.includes('Fachada') || c.text.includes('pdf') || c.text.includes('JPG') || c.text.includes('jpeg') || c.tag.includes('FILE') || c.tag.includes('ATTACHMENT'))
    console.log(fileComponents.slice(0, 20))

  } finally {
    await browser.close()
  }
}

inspectShadowElements()
