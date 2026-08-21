import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadWithShadowPierce() {
  console.log('🚀 Baixando com shadow piercer...')
  const outDir = 'public/vistorias/hall_design'
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    const buttons = page.locator('sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    console.log(`Total de botões: ${count}`)
    
    // Clicar no botão da UCE (3º de baixo pra cima ou índice 2 da timeline)
    const btn = buttons.nth(2)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(6000)

    // Extrair todos os IDs de arquivos com busca recursiva no Shadow DOM
    const fileList = await page.evaluate(() => {
      const results = []
      function search(node) {
        if (!node) return
        if (node.tagName === 'SY-FILE-ITEM' && node.data && node.data._id) {
          results.push({
            id: node.data._id,
            name: node.data.name || 'arquivo',
            ext: node.data.extension || 'jpg',
            size: node.data.size || 0
          })
        }
        if (node.shadowRoot) search(node.shadowRoot)
        if (node.children) {
          for (const c of node.children) search(c)
        }
      }
      search(document.body)
      return results
    })

    console.log(`🎯 Encontrados ${fileList.length} arquivos com IDs no Shadow DOM!`)

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
      } catch (e) {
        console.log(`   ⚠️ Erro ao salvar ${cleanName}: ${e.message}`)
      }
    }

    console.log(`\n🎉 SUCESSO! ${fs.readdirSync(outDir).length} arquivos salvos em public/vistorias/hall_design/`)

  } finally {
    await browser.close()
  }
}

downloadWithShadowPierce()
