import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadRealImagesNow() {
  console.log('🚀 Conectando e baixando todas as fotos da vistoria...')

  const outDir = path.resolve('public', 'vistorias', 'hall_design')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(6000)

    // Clicar no botão Visualizar da UCE
    const buttons = page.locator('sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    const btn = buttons.nth(count - 1)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(6000)

    const fileList = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('sy-file-item'))
      return items.map(item => {
        return {
          id: item.data?._id || item.data?.id,
          name: item.data?.name || item.querySelector('.file-name')?.innerText || 'arquivo',
          ext: item.data?.extension || item.querySelector('.file-extension')?.innerText || 'jpg',
          size: item.data?.size || 0
        }
      }).filter(f => f.id)
    })

    console.log(`Encontrados ${fileList.length} arquivos com IDs oficiais de download:`)

    let downloadedCount = 0

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      const cleanName = f.name.replace(/[/\\?%*:|"<>]/g, '_') + '.' + f.ext
      const destPath = path.join(outDir, cleanName)

      const url = `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_classId/00000000000000000000000f/_get/${f.id}`

      try {
        const res = await page.request.get(url)
        if (res.ok()) {
          const buf = await res.body()
          fs.writeFileSync(destPath, buf)
          console.log(`✅ [${i + 1}/${fileList.length}] Baixado: ${cleanName} (${Math.round(buf.length / 1024)} KB)`)
          downloadedCount++
        } else {
          console.log(`⚠️ Falha HTTP ${res.status()} para ${cleanName}`)
        }
      } catch (err) {
        console.log(`⚠️ Erro ao baixar ${cleanName}: ${err.message}`)
      }
    }

    console.log(`\n🎉 SUCESSO TOTAL: ${downloadedCount} fotos e documentos salvos em public/vistorias/hall_design/!`)

  } finally {
    await browser.close()
  }
}

downloadRealImagesNow()
