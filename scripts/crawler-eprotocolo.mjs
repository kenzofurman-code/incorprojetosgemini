import { chromium } from 'playwright'
import fs from 'fs'

async function inspectEprotocolo() {
  console.log('🤖 INICIANDO CRAWLER DO ePROTOCOLO PARANÁ (SPIWEB)...')
  console.log('🌐 Alvo: https://www.eprotocolo.pr.gov.br/spiweb/consultarProtocoloDigital.do?action=iniciarProcesso')
  console.log('📋 Protocolo: 19.749.934-6\n')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.eprotocolo.pr.gov.br/spiweb/consultarProtocoloDigital.do?action=iniciarProcesso', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'scripts/eprotocolo-home.png' })
    console.log('📸 Screenshot da tela inicial salvo: scripts/eprotocolo-home.png')

    // Inspecionar inputs da página
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, button, a')).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        value: el.value,
        text: el.innerText ? el.innerText.trim().slice(0, 30) : ''
      }))
    })

    console.log('Inputs e botões encontrados:')
    console.log(inputs.filter(i => i.name || i.id || i.type === 'submit'))

    console.log('👉 Preenchendo número do protocolo no #numeroProtocolo...')
    const input = page.locator('#numeroProtocolo')
    await input.click()
    await input.fill('19.749.934-6')
    await page.waitForTimeout(1000)

    console.log('👉 Clicando no #btnPesquisar...')
    await page.locator('#btnPesquisar').click()
    await page.waitForTimeout(8000)

    await page.screenshot({ path: 'scripts/eprotocolo-resultado.png', fullPage: true })
    console.log('📸 Screenshot do resultado salvo: scripts/eprotocolo-resultado.png')

    // Extrair todo o texto da página
    const pageText = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 CONTEÚDO EXTRAÍDO DO RESULTADO:\n')
    console.log(pageText.slice(0, 3000))
    fs.writeFileSync('scripts/eprotocolo-resultado.txt', pageText, 'utf-8')

    // Extrair tabelas e dados estruturados
    const tableData = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'))
      return tables.map(t => {
        const rows = Array.from(t.querySelectorAll('tr'))
        return rows.map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim()))
      })
    })

    console.log('\n📊 TABELAS EXTRAÍDAS:', JSON.stringify(tableData, null, 2))
    fs.writeFileSync('scripts/eprotocolo-tabelas.json', JSON.stringify(tableData, null, 2), 'utf-8')

  } catch (err) {
    console.error('❌ Erro durante inspeção:', err.message)
    await page.screenshot({ path: 'scripts/eprotocolo-erro.png' }).catch(() => {})
  } finally {
    await browser.close()
  }
}

inspectEprotocolo()
