import { chromium } from 'playwright'
import fs from 'fs'

async function stagePrevFogo() {
  console.log('🚒 Abrindo PrevFogo e gerando Captcha de alta precisão...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const PROTOCOLO = '2.2.01.24.0001728614-08'
  const CNPJ = '49197425000121'

  await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  await page.locator('input[name="edicao.numeroProcesso"]').fill(PROTOCOLO)
  const doc = page.locator('#documento')
  await doc.click()
  await doc.clear()
  await doc.pressSequentially(CNPJ, { delay: 30 })

  // Salvar Captcha
  const captchaEl = page.locator('#ImgCaptcha')
  await captchaEl.screenshot({ path: 'scripts/prevfogo-live-captcha.png' })
  console.log('📸 Captcha salvo em: scripts/prevfogo-live-captcha.png')

  // Salvar estado para continuação
  await page.context().storageState({ path: 'scripts/prevfogo-storage.json' })
  await browser.close()
}

stagePrevFogo()
