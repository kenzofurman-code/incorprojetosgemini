/**
 * crawler-bombeiros.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Oficial do Corpo de Bombeiros Militar do Paraná (CBMPR / PrevFogo).
 * Resolve o captcha automaticamente com pré-processamento avançado
 * e extrai a ficha técnica, laudos de vistoria e status de aprovação.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright'
import Tesseract from 'tesseract.js'
import fs from 'fs'

async function runPrevFogoCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🚒 ROBÔ CBMPR - CONSULTA PREVFOGO COM AUTO-OCR')
  console.log('═══════════════════════════════════════════════════════════════')

  const PROTOCOLO = '2.2.01.24.0001728614-08'
  const CNPJ = '49197425000121'

  console.log(`📋 Processo: ${PROTOCOLO}`)
  console.log(`🏢 CNPJ: 49.197.425/0001-21\n`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  try {
    const url = 'https://www.prevfogo.sesp.pr.gov.br/vcbinternet/acompanharProcesso.do?action=iniciarProcesso&resetar=true'
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    let success = false
    let attempt = 0
    const maxAttempts = 15

    while (!success && attempt < maxAttempts) {
      attempt++
      console.log(`👉 [Tentativa ${attempt}/${maxAttempts}] Processando Captcha e Formulário...`)

      // 1. Preencher Processo
      const proc = page.locator('input[name="edicao.numeroProcesso"]')
      await proc.click()
      await proc.fill(PROTOCOLO)

      // 2. Preencher CNPJ
      const doc = page.locator('#documento')
      await doc.click()
      await doc.clear()
      await doc.pressSequentially(CNPJ, { delay: 30 })
      await page.waitForTimeout(300)

      // 3. Pré-processar a imagem do Captcha
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

        origCtx.putImageData(imgData, 0, 0)

        // Remover borda de 4px
        origCtx.fillStyle = '#FFFFFF'
        origCtx.fillRect(0, 0, origCanvas.width, 4)
        origCtx.fillRect(0, 0, 4, origCanvas.height)
        origCtx.fillRect(origCanvas.width - 4, 0, 4, origCanvas.height)
        origCtx.fillRect(0, origCanvas.height - 4, origCanvas.width, 4)

        // Ampliar 3x com padding branco
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

      if (!cleanedBase64) break

      const buf = Buffer.from(cleanedBase64.replace(/^data:image\/png;base64,/, ''), 'base64')

      const { data: { text } } = await Tesseract.recognize(buf, 'eng', {
        tessedit_pageseg_mode: '7'
      })

      const cleanCaptcha = text.replace(/[^a-z0-9]/gi, '').trim().toLowerCase()
      console.log(`   🔤 Captcha reconhecido: "${cleanCaptcha}"`)

      if (!cleanCaptcha || cleanCaptcha.length < 4) {
        console.log('   ⚠️ Captcha inconsistente (<4 chars), recarregando...')
        await page.locator('input[value="Recarregar"]').click().catch(() => {})
        await page.waitForTimeout(1500)
        continue
      }

      // 4. Preencher o captcha
      const kap = page.locator('#kaptcha')
      await kap.click()
      await kap.fill(cleanCaptcha)
      await page.waitForTimeout(300)

      // 5. Submeter
      console.log('   🚀 Submetendo consulta...')
      await page.locator('input[type="submit"][value="Continuar"]').click()
      await page.waitForTimeout(5000)

      // Verificar se a tela mudou (se o campo kaptcha sumiu ou se apareceu resultado)
      const hasKaptchaField = await page.locator('#kaptcha').isVisible().catch(() => false)
      const bodyText = await page.evaluate(() => document.body.innerText)

      if (hasKaptchaField && (bodyText.includes('não confere') || bodyText.includes('inválido') || bodyText.includes('obrigatório'))) {
        console.log('   ❌ Código não conferiu com a imagem. Recarregando e tentando novamente...')
        await page.locator('input[value="Recarregar"]').click().catch(() => {})
        await page.waitForTimeout(1500)
        continue
      }

      // Se saiu da tela inicial ou não tem mais #kaptcha
      console.log('\n🎉 SUCESSO! CONSULTA DO PROCESSO LOCALIZADA NO CORPO DE BOMBEIROS!')
      success = true

      await page.screenshot({ path: 'scripts/prevfogo-resultado-oficial.png', fullPage: true })
      console.log('📸 Screenshot salvo: scripts/prevfogo-resultado-oficial.png')

      console.log('\n📄 CONTEÚDO EXTRAÍDO DO CORPO DE BOMBEIROS:\n')
      console.log(bodyText)

      fs.writeFileSync('scripts/bombeiros-resultado-oficial.txt', bodyText, 'utf-8')

      // Extrair tabelas
      const tables = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('table')).map(t => {
          return Array.from(t.querySelectorAll('tr')).map(r => 
            Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim())
          )
        })
      })

      fs.writeFileSync('scripts/bombeiros-tabelas-oficiais.json', JSON.stringify(tables, null, 2), 'utf-8')
      break
    }

  } catch (err) {
    console.error('❌ Erro durante execução:', err.message)
  } finally {
    await browser.close()
    console.log('🏁 Robô CBMPR finalizado.')
  }
}

runPrevFogoCrawler()
