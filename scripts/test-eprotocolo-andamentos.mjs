import { chromium } from 'playwright'
import fs from 'fs'

async function extractAndamentos() {
  console.log('🔍 Clicando na aba "Andamentos" no eProtocolo...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.eprotocolo.pr.gov.br/spiweb/consultarProtocoloDigital.do?action=iniciarProcesso', { waitUntil: 'networkidle' })
    await page.locator('#numeroProtocolo').fill('19.749.934-6')
    await page.locator('#btnPesquisar').click()
    await page.waitForTimeout(6000)

    // Clicar no accordion/link "Andamentos"
    const andamentosBtn = page.locator('text=Andamentos, a[href*="andamento" i], button:has-text("Andamentos"), .accordion-button:has-text("Andamentos")').first()
    if (await andamentosBtn.isVisible()) {
      console.log('👉 Clicando em "Andamentos"...')
      await andamentosBtn.click()
      await page.waitForTimeout(4000)
    }

    await page.screenshot({ path: 'scripts/eprotocolo-andamentos.png', fullPage: true })
    console.log('📸 Screenshot salvo: scripts/eprotocolo-andamentos.png')

    // Extrair tabela de andamentos
    const andamentosData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.tab-content tr, .accordion-body tr, table tr'))
      return rows.map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim()))
    })

    console.log('\n📊 ANDAMENTOS HISTÓRICOS EXTRAÍDOS:')
    console.log(JSON.stringify(andamentosData.filter(r => r.length > 0), null, 2))

    fs.writeFileSync('scripts/eprotocolo-andamentos.json', JSON.stringify(andamentosData, null, 2), 'utf-8')

  } finally {
    await browser.close()
  }
}

extractAndamentos()
