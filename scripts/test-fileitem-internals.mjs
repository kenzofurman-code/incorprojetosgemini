import { chromium } from 'playwright'
import fs from 'fs'

async function inspectFileItemInternals() {
  console.log('🔍 Inspecionando propriedades internas do sy-file-item...')

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

    const fileObjects = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('sy-file-item, sy-one-file-field'))
      return items.map(el => {
        // Obter shadow root e inner elements
        const nameEl = el.querySelector('.file-name, sy-text.file-name')
        const extEl = el.querySelector('.file-extension, sy-text.file-extension')
        const sizeEl = el.querySelector('.file-size, sy-text.file-size')
        
        // Verificar propriedades JS anexadas ao elemento
        const val = el.value || el.file || el.data || el._file || (el.__ngContext__ ? 'tem_angular_context' : null)

        return {
          tagName: el.tagName,
          fileName: nameEl ? nameEl.innerText : null,
          extension: extEl ? extEl.innerText : null,
          size: sizeEl ? sizeEl.innerText : null,
          customProps: Object.keys(el).filter(k => !k.startsWith('on') && typeof el[k] !== 'function'),
          val: typeof val === 'object' ? val : String(val)
        }
      })
    })

    console.log(`Extraídos ${fileObjects.length} objetos de arquivo!`)
    console.log(fileObjects.slice(0, 5))
    fs.writeFileSync('scripts/sydle-file-objects.json', JSON.stringify(fileObjects, null, 2))

  } finally {
    await browser.close()
  }
}

inspectFileItemInternals()
