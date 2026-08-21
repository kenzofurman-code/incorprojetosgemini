import { chromium } from 'playwright'
import fs from 'fs'

async function runWithInput() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  const PROTOCOLO = '2.2.01.24.0001728614-08'
  const CNPJ = '49197425000121'

  try {
    await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Preencher Processo
    await page.locator('input[name="edicao.numeroProcesso"]').fill(PROTOCOLO)

    // Preencher CNPJ
    const doc = page.locator('#documento')
    await doc.click()
    await doc.clear()
    await doc.pressSequentially(CNPJ, { delay: 30 })

    // Salvar Captcha
    const captchaEl = page.locator('#ImgCaptcha')
    await captchaEl.screenshot({ path: 'scripts/live-captcha.png' })
    console.log('📸 Captcha capturado: scripts/live-captcha.png')

    // Esperar arquivo scripts/captcha-code.txt ser escrito
    if (fs.existsSync('scripts/captcha-code.txt')) fs.unlinkSync('scripts/captcha-code.txt')

    console.log('⏳ Aguardando leitura do Captcha...')
    let code = ''
    for (let i = 0; i < 40; i++) {
      if (fs.existsSync('scripts/captcha-code.txt')) {
        code = fs.readFileSync('scripts/captcha-code.txt', 'utf-8').trim()
        if (code) break
      }
      await new Promise(r => setTimeout(r, 500))
    }

    if (!code) {
      console.log('⏱️ Timeout aguardando captcha.')
      return
    }

    console.log(`🚀 Digitando captcha "${code}" e submetendo...`)
    const kap = page.locator('#kaptcha')
    await kap.click()
    await kap.fill(code)
    await page.waitForTimeout(300)

    await page.locator('input[type="submit"][value="Continuar"]').click()
    await page.waitForTimeout(6000)

    await page.screenshot({ path: 'scripts/bombeiros-resultado-real.png', fullPage: true })
    console.log('📸 Screenshot salvo: scripts/bombeiros-resultado-real.png')

    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 CONTEÚDO EXTRAÍDO DO PREVFOGO:\n')
    console.log(bodyText)

    fs.writeFileSync('scripts/bombeiros-dados-completos.txt', bodyText, 'utf-8')

  } finally {
    await browser.close()
  }
}

runWithInput()
