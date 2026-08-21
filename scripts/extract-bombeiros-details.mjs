import { chromium } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs'

async function extractFullBombeirosDetails() {
  console.log('🚒 EXTRAINDO DETALHES COMPLETOS DO PROJETO NO PREVFOGO...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })

  const PROTOCOLO = '2.2.01.24.0001728614-08'
  const CNPJ = '49197425000121'

  try {
    const url = 'https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true'
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    let success = false
    let attempt = 0

    while (!success && attempt < 15) {
      attempt++
      await page.locator('input[name="edicao.numeroProcesso"]').fill(PROTOCOLO)
      const doc = page.locator('#documento')
      await doc.click()
      await doc.clear()
      await doc.pressSequentially(CNPJ, { delay: 30 })

      // Captura e OCR
      const cleanedBase64 = await page.evaluate(() => {
        const img = document.querySelector('#ImgCaptcha')
        if (!img) return null
        const origCanvas = document.createElement('canvas')
        origCanvas.width = img.naturalWidth || img.width
        origCanvas.height = img.naturalHeight || img.height
        const origCtx = origCanvas.getContext('2d')
        origCtx.drawImage(img, 0, 0)
        const imgData = origCtx.getImageData(0, 0, origCanvas.width, origCanvas.height)
        const d = imgData.data
        for (let i = 0; i < d.length; i += 4) {
          const brightness = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
          const val = brightness < 125 ? 0 : 255
          d[i] = val; d[i+1] = val; d[i+2] = val
        }
        for (let y = 2; y < origCanvas.height - 2; y++) {
          for (let x = 0; x < origCanvas.width; x++) {
            const idx = (y * origCanvas.width + x) * 4
            if (d[idx] === 0) {
              const top1 = ((y - 1) * origCanvas.width + x) * 4
              const bot1 = ((y + 1) * origCanvas.width + x) * 4
              if (d[top1] === 255 && d[bot1] === 255) {
                d[idx] = 255; d[idx+1] = 255; d[idx+2] = 255
              }
            }
          }
        }
        origCtx.putImageData(imgData, 0, 0)
        origCtx.fillStyle = '#FFFFFF'
        origCtx.fillRect(0, 0, origCanvas.width, 4); origCtx.fillRect(0, 0, 4, origCanvas.height)
        origCtx.fillRect(origCanvas.width - 4, 0, 4, origCanvas.height); origCtx.fillRect(0, origCanvas.height - 4, origCanvas.width, 4)
        const finalCanvas = document.createElement('canvas')
        finalCanvas.width = origCanvas.width * 3 + 40; finalCanvas.height = origCanvas.height * 3 + 40
        const finalCtx = finalCanvas.getContext('2d')
        finalCtx.fillStyle = '#FFFFFF'; finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)
        finalCtx.drawImage(origCanvas, 20, 20, origCanvas.width * 3, origCanvas.height * 3)
        return finalCanvas.toDataURL('image/png')
      })

      const buf = Buffer.from(cleanedBase64.replace(/^data:image\/png;base64,/, ''), 'base64')
      const { data: { text } } = await Tesseract.recognize(buf, 'eng', { tessedit_pageseg_mode: '7' })
      const cleanCaptcha = text.replace(/[^a-z0-9]/gi, '').trim().toLowerCase()

      if (!cleanCaptcha || cleanCaptcha.length < 4) {
        await page.locator('input[value="Recarregar"]').click().catch(() => {})
        await page.waitForTimeout(1000)
        continue
      }

      await page.locator('#kaptcha').fill(cleanCaptcha)
      await page.locator('input[type="submit"][value="Continuar"]').click()
      await page.waitForTimeout(5000)

      const bodyText = await page.evaluate(() => document.body.innerText)
      if (bodyText.includes('não confere') || bodyText.includes('inválido')) {
        await page.locator('input[value="Recarregar"]').click().catch(() => {})
        await page.waitForTimeout(1000)
        continue
      }

      console.log('🎉 Página de detalhes carregada!')
      success = true

      // Clicar em "Informações do Estabelecimento" e "Informações do Processo" se forem links/abas
      const tabs = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'))
        return links.map(l => ({ text: l.innerText || l.value, href: l.href, onclick: l.getAttribute('onclick') }))
      })
      console.log('Abas e botões disponíveis:', tabs)

      // Clicar em Informações do Processo se houver
      const infoBtn = page.locator('text="Informações do Processo", a:has-text("Informações do Processo"), input[value*="Processo" i]').first()
      if (await infoBtn.isVisible().catch(() => false)) {
        await infoBtn.click().catch(() => {})
        await page.waitForTimeout(3000)
      }

      await page.screenshot({ path: 'scripts/bombeiros-detalhe-completo.png', fullPage: true })
      console.log('📸 Screenshot detalhado salvo: scripts/bombeiros-detalhe-completo.png')

      const fullPageText = await page.evaluate(() => document.body.innerText)
      console.log('\n📄 CONTEÚDO INTEGRAL DO PROCESSO:\n')
      console.log(fullPageText)

      fs.writeFileSync('scripts/bombeiros-detalhes.txt', fullPageText, 'utf-8')
      break
    }

  } finally {
    await browser.close()
  }
}

extractFullBombeirosDetails()
