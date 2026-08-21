import { chromium } from 'playwright'
import fs from 'fs'

async function crawlPrevFogoSesp() {
  console.log('🚒 INICIANDO CRAWLER DO PREVFOGO (SESP PR)...')
  console.log('🌐 Alvo Oficial: https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true')
  console.log('📋 Protocolo: 2.2.01.24.0001728614-08 | CNPJ: 49197425000121\n')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'scripts/prevfogo-sesp-home.png' })
    console.log('📸 Screenshot inicial salvo: scripts/prevfogo-sesp-home.png')

    // Inspecionar inputs
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, button')).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        value: el.value,
        text: el.innerText ? el.innerText.trim().slice(0, 30) : ''
      }))
    })

    console.log('Inputs encontrados no PrevFogo:')
    console.log(inputs)

    // Preencher número de processo/protocolo
    // No PrevFogo, campos comuns: numeroProcesso, nrProtocolo, nrProcesso, nrCgcCpf
    const procInput = page.locator('input[name*="processo" i], input[id*="processo" i], input[name*="protocolo" i], input[type="text"]').first()
    const cpfCnpjInput = page.locator('input[name*="cpf" i], input[name*="cgc" i], input[name*="cnpj" i], input[id*="cpf" i], input[id*="cgc" i], input[id*="cnpj" i]').first()

    if (await procInput.isVisible()) {
      console.log('👉 Preenchendo número do processo: 2.2.01.24.0001728614-08...')
      await procInput.fill('2.2.01.24.0001728614-08')
    }

    if (await cpfCnpjInput.isVisible()) {
      console.log('👉 Preenchendo CNPJ: 49197425000121...')
      await cpfCnpjInput.fill('49.197.425/0001-21')
    }

    await page.waitForTimeout(1000)

    // Clicar em Pesquisar
    const searchBtn = page.locator('input[value*="Pesquisar" i], button:has-text("Pesquisar"), input[value*="Consultar" i], button:has-text("Consultar")').first()
    if (await searchBtn.isVisible()) {
      console.log('👉 Clicando em Pesquisar...')
      await searchBtn.click()
      await page.waitForTimeout(6000)
    }

    await page.screenshot({ path: 'scripts/prevfogo-sesp-resultado.png', fullPage: true })
    console.log('📸 Screenshot resultado salvo: scripts/prevfogo-sesp-resultado.png')

    // Extrair todo o texto
    const pageText = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 CONTEÚDO EXTRAÍDO DO CORPO DE BOMBEIROS (PREVFOGO):\n')
    console.log(pageText)

    fs.writeFileSync('scripts/prevfogo-sesp-resultado.txt', pageText, 'utf-8')

  } catch (err) {
    console.error('❌ Erro:', err.message)
  } finally {
    await browser.close()
  }
}

crawlPrevFogoSesp()
