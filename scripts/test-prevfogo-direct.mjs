import { chromium } from 'playwright'
import fs from 'fs'

async function extractPrevFogoDirect() {
  console.log('🚒 Acessando diretamente o iframe: https://sysprevfogo.bombeiros.pr.gov.br/prevfogo/processo/acompanhar...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto('https://sysprevfogo.bombeiros.pr.gov.br/prevfogo/processo/acompanhar', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'scripts/prevfogo-direct-home.png' })
    console.log('📸 Screenshot direto salvo: scripts/prevfogo-direct-home.png')

    // Inspecionar inputs
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, button, a')).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        value: el.value,
        text: el.innerText ? el.innerText.trim().slice(0, 40) : ''
      }))
    })

    console.log('Inputs encontrados no PrevFogo direto:')
    console.log(inputs)

    // Preencher os inputs corretos
    // 1. Protocolo: 2.2.01.24.0001728614-08
    const inputProt = page.locator('input[name*="protocolo" i], input[id*="protocolo" i], input[type="text"]').first()
    await inputProt.fill('2.2.01.24.0001728614-08')

    // 2. CNPJ: 49197425000121 ou formatado
    const inputCnpj = page.locator('input[name*="cnpj" i], input[id*="cnpj" i], input[name*="cpf" i], input[id*="cpf" i], input[type="text"]').nth(1)
    await inputCnpj.fill('49.197.425/0001-21')

    await page.waitForTimeout(1000)

    // 3. Botão Pesquisar
    const btnPesquisar = page.locator('button:has-text("Pesquisar"), input[value*="Pesquisar" i], button:has-text("Consultar"), input[type="submit"]').first()
    console.log('👉 Clicando em Pesquisar no PrevFogo...')
    await btnPesquisar.click()
    await page.waitForTimeout(8000)

    await page.screenshot({ path: 'scripts/prevfogo-resultado.png', fullPage: true })
    console.log('📸 Screenshot resultado salvo: scripts/prevfogo-resultado.png')

    // Extrair todo o texto do resultado
    const text = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 CONTEÚDO EXTRAÍDO DO PREVFOGO:\n')
    console.log(text)

    fs.writeFileSync('scripts/prevfogo-resultado.txt', text, 'utf-8')

  } catch (err) {
    console.error('❌ Erro:', err.message)
    await page.screenshot({ path: 'scripts/prevfogo-erro.png' }).catch(() => {})
  } finally {
    await browser.close()
  }
}

extractPrevFogoDirect()
