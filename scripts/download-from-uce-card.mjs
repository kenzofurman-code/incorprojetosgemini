import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadFromUCECard() {
  console.log('🚀 Localizando card da UCE e baixando fotos...')
  const outDir = 'public/vistorias/hall_design'
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    // Localizar o card da UCE com precisão
    const uceCard = page.locator('sy-sd-comment').filter({ hasText: 'Departamento de Controle de Edificações' }).first()
    const btn = uceCard.locator('sy-button')
    
    console.log('Card da UCE encontrado! Clicando em Visualizar...')
    await btn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await btn.click({ force: true })
    await page.waitForTimeout(7000)

    // Extrair lista de arquivos
    const fileList = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('sy-file-item'))
      return items.map(node => {
        const d = node.data || {}
        return {
          id: d._id || d.id,
          name: d.name || node.querySelector('.file-name')?.innerText || 'arquivo',
          ext: d.extension || node.querySelector('.file-extension')?.innerText || 'jpg'
        }
      }).filter(f => f.id)
    })

    console.log(`🎯 Encontrados ${fileList.length} arquivos! Iniciando download...`)

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      const cleanName = f.name.replace(/[/\\?%*:|"<>]/g, '_') + '.' + f.ext
      const destPath = path.join(outDir, cleanName)

      const url = `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_classId/00000000000000000000000f/_get/${f.id}`
      const res = await page.request.get(url)
      if (res.ok()) {
        const buf = await res.body()
        fs.writeFileSync(destPath, buf)
        console.log(`   ✅ [${i + 1}/${fileList.length}] Salvo: ${cleanName} (${Math.round(buf.length / 1024)} KB)`)
      }
    }

    console.log(`\n🎉 Total de arquivos salvos em public/vistorias/hall_design/: ${fs.readdirSync(outDir).length}`)

  } finally {
    await browser.close()
  }
}

downloadFromUCECard()
