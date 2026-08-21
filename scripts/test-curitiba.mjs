import { chromium } from 'playwright'
import fs from 'fs'

async function runTest() {
  console.log('🚀 Iniciando teste do Crawler Curitiba (SYDLE ONE)...')
  
  const targetUrl = 'https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477'
  console.log(`🌐 Acessando URL: ${targetUrl}`)

  const browser = await chromium.launch({
    headless: true, // Modo invisível
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  const page = await context.newPage()

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    console.log(`📡 Status da Resposta HTTP: ${response ? response.status() : 'N/A'}`)

    // Aguardar 5 segundos para renderização dos scripts SYDLE
    console.log('⏳ Aguardando renderização dos componentes SYDLE...')
    await page.waitForTimeout(5000)

    const finalUrl = page.url()
    const pageTitle = await page.title()
    console.log(`📍 URL Final: ${finalUrl}`)
    console.log(`📑 Título da Página: ${pageTitle}`)

    // Capturar Screenshot
    const screenshotPath = 'scripts/curitiba-screen.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Screenshot salvo em: ${screenshotPath}`)

    // Extrair texto da página
    const pageText = await page.evaluate(() => document.body.innerText)
    console.log('--- 📝 TEXTO EXTRAÍDO DA PÁGINA ---')
    console.log(pageText.slice(0, 1000))
    console.log('-----------------------------------')

    // Verificar se há formulário de login na tela
    const hasLoginForm = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        id: i.id,
      }))
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim())
      return { inputs, buttons }
    })

    console.log('🔍 Elementos Interativos Detectados (Inputs & Botões):', JSON.stringify(hasLoginForm, null, 2))

  } catch (err) {
    console.error('❌ Erro durante o teste:', err)
  } finally {
    await browser.close()
    console.log('🏁 Teste finalizado.')
  }
}

runTest()
