import { chromium } from 'playwright'
import fs from 'fs'

async function inspectItemDirect() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  const apis = []
  page.on('response', async res => {
    if (res.url().includes('/api/1/') && res.headers()['content-type']?.includes('json')) {
      try {
        const json = await res.json()
        apis.push({ url: res.url(), json })
        console.log(`📡 API: ${res.url()}`)
      } catch {}
    }
  })

  // Testar navegar direto no item da pendência
  const itemId = '69b2d3ab4bf7537d96bad54c'
  console.log(`🌐 Navegando para o item da pendência: /i/${itemId}`)
  await page.goto(`https://servicodigital.curitiba.pr.gov.br/i/${itemId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)

  console.log(`📍 URL final: ${page.url()}`)
  console.log(`📑 Título: ${await page.title()}`)

  await page.screenshot({ path: 'scripts/pendencia-item.png', fullPage: true })

  fs.writeFileSync('scripts/pendencia-api.json', JSON.stringify(apis, null, 2))
  console.log('🏁 Terminado.')
  await browser.close()
}

inspectItemDirect()
