import { chromium } from 'playwright'
import fs from 'fs'

async function expandAllSections() {
  console.log('🚀 Expandindo todas as seções do eProtocolo...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })

  try {
    await page.goto('https://www.eprotocolo.pr.gov.br/spiweb/consultarProtocoloDigital.do?action=iniciarProcesso', { waitUntil: 'networkidle' })
    await page.locator('#numeroProtocolo').fill('19.749.934-6')
    await page.locator('#btnPesquisar').click()
    await page.waitForTimeout(6000)

    // Chamar mostrarSecao para todas as seções
    await page.evaluate(() => {
      if (typeof window.mostrarSecao === 'function') {
        window.mostrarSecao('Andamentos')
        window.mostrarSecao('CaixaPasta')
        window.mostrarSecao('Eliminacao')
        window.mostrarSecao('MaisInformacoes')
      }
    })

    await page.waitForTimeout(4000)

    await page.screenshot({ path: 'scripts/eprotocolo-expandido.png', fullPage: true })
    console.log('📸 Screenshot expandido salvo: scripts/eprotocolo-expandido.png')

    // Extrair todo o texto detalhado pós-expansão
    const fullText = await page.evaluate(() => document.body.innerText)
    fs.writeFileSync('scripts/eprotocolo-detalhado.txt', fullText, 'utf-8')

    // Extrair todas as tabelas
    const tables = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table')).map((table, tIdx) => {
        const rows = Array.from(table.querySelectorAll('tr'))
        return {
          tabela: tIdx + 1,
          dados: rows.map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim()))
        }
      })
    })

    console.log(`Tabelas encontradas: ${tables.length}`)
    console.log(JSON.stringify(tables, null, 2))
    fs.writeFileSync('scripts/eprotocolo-tabelas-detalhadas.json', JSON.stringify(tables, null, 2), 'utf-8')

  } finally {
    await browser.close()
  }
}

expandAllSections()
