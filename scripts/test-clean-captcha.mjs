import { chromium } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs'

async function testCleanCaptcha() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Preencher Processo
    const proc = page.locator('input[name="edicao.numeroProcesso"]')
    await proc.click()
    await proc.fill('2.2.01.24.0001728614-08')

    // Preencher CNPJ com limpeza prévia
    const doc = page.locator('#documento')
    await doc.click()
    await doc.clear()
    await doc.pressSequentially('49197425000121', { delay: 60 })

    // Capturar o captcha em alta resolução (scale: 3x para melhor leitura OCR)
    const captchaEl = page.locator('#ImgCaptcha')
    const captchaBuf = await captchaEl.screenshot({ scale: 'css' })

    const { data: { text, confidence } } = await Tesseract.recognize(captchaBuf, 'eng', {
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyz0123456789'
    })

    const cleanCaptcha = text.replace(/[^a-z0-9]/gi, '').trim().toLowerCase()
    console.log(`Captcha reconhecido: "${cleanCaptcha}" (Confiança: ${confidence}%)`)

    const kap = page.locator('#kaptcha')
    await kap.click()
    await kap.fill(cleanCaptcha)

    const values = await page.evaluate(() => ({
      processo: document.querySelector('input[name="edicao.numeroProcesso"]')?.value,
      documento: document.querySelector('#documento')?.value,
      kaptcha: document.querySelector('#kaptcha')?.value,
    }))
    console.log('Valores validados no DOM:', values)

    await page.locator('input[type="submit"][value="Continuar"]').click()
    await page.waitForTimeout(6000)

    await page.screenshot({ path: 'scripts/prevfogo-teste-2.png', fullPage: true })
    console.log('📸 Screenshot salvo: scripts/prevfogo-teste-2.png')

    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 RESULTADO:\n', bodyText.slice(0, 1500))

  } finally {
    await browser.close()
  }
}

testCleanCaptcha()
