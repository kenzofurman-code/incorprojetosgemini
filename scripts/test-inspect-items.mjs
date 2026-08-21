import { chromium } from 'playwright'
import fs from 'fs'

async function inspectItems() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
  await page.waitForTimeout(8000)

  // Clicar no 3º botão
  const btn = page.locator('sy-button:has-text("Visualizar")').nth(2)
  await btn.click({ force: true })
  await page.waitForTimeout(6000)

  const sample = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('sy-file-item'))
    return items.map(el => ({
      title: el.getAttribute('title'),
      hasData: !!el.data,
      dataKeys: el.data ? Object.keys(el.data) : [],
      dataId: el.data?._id || el.data?.id || el.getAttribute('file-id') || el.getAttribute('id')
    }))
  })

  console.log(`Total de sy-file-item encontrados: ${sample.length}`)
  console.log(sample.slice(0, 10))
  fs.writeFileSync('scripts/sample-items.json', JSON.stringify(sample, null, 2))

  await browser.close()
}

inspectItems()
