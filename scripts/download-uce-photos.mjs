import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadUCEPhotos() {
  console.log('🚀 Localizando e baixando todas as fotos da vistoria da UCE...')

  const outDir = path.resolve('public', 'vistorias', 'hall_design')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    // Localizar especificamente os botões dentro dos cards de comentários
    const actionButtons = page.locator('.sy-sd-action-container sy-button, sy-button:has-text("Visualizar")')
    const total = await actionButtons.count()
    console.log(`Total de botões de ação: ${total}`)

    for (let b = 0; b < total; b++) {
      const btn = actionButtons.nth(b)
      await btn.scrollIntoViewIfNeeded()
      await btn.click({ force: true })
      await page.waitForTimeout(5000)

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

      if (fileList.length > 0) {
        console.log(`🎯 Encontrados ${fileList.length} arquivos neste formulário (Botão ${b + 1})! Iniciando download...`)

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
              console.log(`   ✅ [${i + 1}/${fileList.length}] Baixado: ${cleanName} (${Math.round(buf.length / 1024)} KB)`)
            }
          } catch (err) {
            console.log(`   ⚠️ Erro ao baixar ${cleanName}: ${err.message}`)
          }
        }
        break
      } else {
        // Fechar modal vazio
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1500)
      }
    }

    const saved = fs.readdirSync(outDir)
    console.log(`\n🎉 Total de arquivos salvos na pasta public/vistorias/hall_design/: ${saved.length}`)

  } finally {
    await browser.close()
  }
}

downloadUCEPhotos()
