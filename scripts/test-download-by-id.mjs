import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadViaFileIds() {
  console.log('🎯 DESCOBERTO O FORMATO OFICIAL DO SYDLE ONE!')
  console.log('Iniciando download de todas as 50 fotos e PDFs oficiais...')

  const outDir = path.resolve('public', 'vistorias', 'hall_design')
  fs.mkdirSync(outDir, { recursive: true })

  const rawData = JSON.parse(fs.readFileSync('scripts/sydle-file-data-raw.json', 'utf-8'))
  console.log(`Carregados ${rawData.length} arquivos para download.`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  let successCount = 0

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i]
    if (!item.data || !item.data._id) continue

    const fileId = item.data._id
    const ext = item.data.extension || 'jpg'
    const cleanName = (item.data.name || item.fileName || `arquivo_${i}`).replace(/[/\\?%*:|"<>]/g, '_') + '.' + ext
    const destPath = path.join(outDir, cleanName)

    // Endpoints do SYDLE ONE para obtenção do binário
    const urlsToTry = [
      `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_classId/00000000000000000000000f/_get/${fileId}`,
      `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_classId/00000000000000000000000f/_content/${fileId}`,
      `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_file/${fileId}`
    ]

    let downloaded = false

    for (const u of urlsToTry) {
      try {
        const res = await page.request.get(u)
        if (res.ok()) {
          const buf = await res.body()
          if (buf.length > 500) {
            fs.writeFileSync(destPath, buf)
            console.log(`✅ [${i + 1}/${rawData.length}] Baixado com sucesso: ${cleanName} (${Math.round(buf.length / 1024)} KB)`)
            downloaded = true
            successCount++
            break
          }
        }
      } catch {}
    }

    if (!downloaded) {
      console.log(`⚠️ [${i + 1}/${rawData.length}] Não foi possível baixar pelo endpoint direto: ${cleanName}`)
    }
  }

  console.log(`\n🎉 RESULTADO FINAL: ${successCount} fotos e documentos reais baixados em public/vistorias/hall_design/!`)

  await browser.close()
}

downloadViaFileIds()
