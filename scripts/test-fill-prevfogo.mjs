import { chromium } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs'

async function testFillAndCheck() {
  console.log('🔍 Testando preenchimento com disparo de eventos no PrevFogo...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    const url = 'https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true'
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Preencher número de processo usando type e disparando onchange/onblur
    const proc = page.locator('input[name="edicao.numeroProcesso"]')
    await proc.click()
    await proc.fill('2.2.01.24.0001728614-08')
    await proc.dispatchEvent('change')
    await proc.dispatchEvent('blur')

    // Preencher documento usando type e evaluate
    const doc = page.locator('#documento')
    await doc.click()
    await page.evaluate(() => {
      const el = document.querySelector('#documento')
      if (el) el.value = '49.197.425/0001-21'
    })
    await doc.pressSequentially('49197425000121', { delay: 50 }).catch(() => {})
    await page.evaluate(() => {
      const el = document.querySelector('#documento')
      if (el && !el.value) el.value = '49.197.425/0001-21'
    })

    // Capturar o captcha
    const captchaEl = page.locator('#ImgCaptcha')
    const captchaBuf = await captchaEl.screenshot()

    const { data: { text } } = await Tesseract.recognize(captchaBuf, 'eng')
    const cleanCaptcha = text.replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase()
    console.log(`Captcha lido: ${cleanCaptcha}`)

    const kap = page.locator('#kaptcha')
    await kap.click()
    await kap.fill(cleanCaptcha)
    await kap.dispatchEvent('change')

    // Verificar valores dos inputs no DOM
    const values = await page.evaluate(() => ({
      processo: document.querySelector('input[name="edicao.numeroProcesso"]')?.value,
      documento: document.querySelector('input[name="edicao.documento"]')?.value,
      kaptcha: document.querySelector('#kaptcha')?.value,
    }))
    console.log('Valores confirmados no DOM antes do submit:', values)

    // Submeter
    await page.locator('input[type="submit"][value="Continuar"]').click()
    await page.waitForTimeout(6000)

    await page.screenshot({ path: 'scripts/prevfogo-teste-resultado.png', fullPage: true })
    console.log('📸 Screenshot salvo: scripts/prevfogo-teste-resultado.png')

    const resultText = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 RESULTADO DA CONSULTA:\n', resultText)

  } finally {
    await browser.close()
  }
}

testFillAndCheck()
