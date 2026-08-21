import { chromium } from 'playwright'
import fs from 'fs'

async function inspectFileItemData() {
  console.log('🔍 Extraindo o objeto `.data` de todos os 50 arquivos/fotos...')

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

    const fileDatas = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('sy-file-item'))
      return items.map(el => {
        return {
          fileName: el.querySelector('.file-name')?.innerText,
          data: el.data
        }
      })
    })

    console.log(`Extraídos dados de ${fileDatas.length} arquivos!`)
    console.log(JSON.stringify(fileDatas.slice(0, 3), null, 2))
    fs.writeFileSync('scripts/sydle-file-data-raw.json', JSON.stringify(fileDatas, null, 2))

  } finally {
    await browser.close()
  }
}

inspectFileItemData()
