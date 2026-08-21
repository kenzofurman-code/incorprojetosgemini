import { chromium } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs'

async function testCanvasFilter() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Pré-processar a imagem do Captcha via Canvas com remoção de borda e padding
    const cleanedBase64 = await page.evaluate(() => {
      const img = document.querySelector('#ImgCaptcha')
      const origCanvas = document.createElement('canvas')
      origCanvas.width = img.naturalWidth || img.width
      origCanvas.height = img.naturalHeight || img.height
      const origCtx = origCanvas.getContext('2d')
      origCtx.drawImage(img, 0, 0)

      const imgData = origCtx.getImageData(0, 0, origCanvas.width, origCanvas.height)
      const d = imgData.data

      // Binarização
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2]
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b
        const val = brightness < 125 ? 0 : 255
        d[i] = val
        d[i+1] = val
        d[i+2] = val
      }
      // Remover linha horizontal fina (strike-through de 1-2px)
      for (let y = 2; y < origCanvas.height - 2; y++) {
        for (let x = 0; x < origCanvas.width; x++) {
          const idx = (y * origCanvas.width + x) * 4
          if (d[idx] === 0) {
            const top1 = ((y - 1) * origCanvas.width + x) * 4
            const top2 = ((y - 2) * origCanvas.width + x) * 4
            const bot1 = ((y + 1) * origCanvas.width + x) * 4
            const bot2 = ((y + 2) * origCanvas.width + x) * 4

            if ((d[top1] === 255 || d[top2] === 255) && (d[bot1] === 255 || d[bot2] === 255)) {
              d[idx] = 255
              d[idx+1] = 255
              d[idx+2] = 255
            }
          }
        }
      }

      // Salvar os dados processados de volta no canvas
      origCtx.putImageData(imgData, 0, 0)

      // Remover borda externa de 4px
      origCtx.fillStyle = '#FFFFFF'
      origCtx.fillRect(0, 0, origCanvas.width, 4)
      origCtx.fillRect(0, 0, 4, origCanvas.height)
      origCtx.fillRect(origCanvas.width - 4, 0, 4, origCanvas.height)
      origCtx.fillRect(0, origCanvas.height - 4, origCanvas.width, 4)

      // Criar canvas ampliado 3x com borda branca para Tesseract
      const finalCanvas = document.createElement('canvas')
      const scale = 3
      const padding = 20
      finalCanvas.width = origCanvas.width * scale + padding * 2
      finalCanvas.height = origCanvas.height * scale + padding * 2
      const finalCtx = finalCanvas.getContext('2d')
      finalCtx.fillStyle = '#FFFFFF'
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)
      finalCtx.drawImage(origCanvas, padding, padding, origCanvas.width * scale, origCanvas.height * scale)

      return finalCanvas.toDataURL('image/png')
    })

    const buf = Buffer.from(cleanedBase64.replace(/^data:image\/png;base64,/, ''), 'base64')
    fs.writeFileSync('scripts/captcha-clean.png', buf)

    const { data: { text, confidence } } = await Tesseract.recognize(buf, 'eng', {
      tessedit_pageseg_mode: '7' // Single line text
    })
    const cleanCaptcha = text.replace(/[^a-z0-9]/gi, '').trim().toLowerCase()
    console.log(`🔤 Captcha processado: "${cleanCaptcha}" (Confiança: ${confidence}%)`)

  } finally {
    await browser.close()
  }
}

testCanvasFilter()
