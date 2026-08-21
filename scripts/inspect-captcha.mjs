import { chromium } from 'playwright'
import fs from 'fs'

async function inspectCaptcha() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const captchaImg = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs.map(i => ({
        src: i.src,
        id: i.id,
        className: i.className
      }))
    })

    console.log('Imagens encontradas na página do PrevFogo:')
    console.log(captchaImg)

    // Salvar o recorte do captcha
    const captchaElement = page.locator('img[src*="kaptcha" i], img[src*="captcha" i]').first()
    if (await captchaElement.isVisible()) {
      await captchaElement.screenshot({ path: 'scripts/prevfogo-captcha.png' })
      console.log('📸 Recorte do Captcha salvo: scripts/prevfogo-captcha.png')
    }

  } finally {
    await browser.close()
  }
}

inspectCaptcha()
