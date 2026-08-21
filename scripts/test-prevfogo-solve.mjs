import { chromium } from 'playwright'
import fs from 'fs'

async function solveAndSubmitPrevFogo() {
  console.log('🚒 Conectando ao PrevFogo para submeter Protocolo e CNPJ...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Preencher campos
    await page.locator('input[name="edicao.numeroProcesso"]').fill('2.2.01.24.0001728614-08')
    await page.locator('input[name="edicao.documento"]').fill('49.197.425/0001-21')

    // Salvar o captcha da sessão atual
    const captchaEl = page.locator('#ImgCaptcha')
    await captchaEl.screenshot({ path: 'scripts/current-captcha.png' })
    console.log('📸 Captcha da sessão salvo: scripts/current-captcha.png')

    // Salvar página para podermos injetar a resposta
    fs.writeFileSync('scripts/prevfogo-session.json', JSON.stringify({ ready: true }))

  } finally {
    await browser.close()
  }
}

solveAndSubmitPrevFogo()
