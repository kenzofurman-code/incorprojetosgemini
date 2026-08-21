import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadWithDeepShadow() {
  console.log('🚀 Baixando com busca recursiva no Shadow Root...')
  const outDir = 'public/vistorias/hall_design'
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    const btn = page.locator('sy-button:has-text("Visualizar")').nth(2)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(7000)

    const fileList = await page.evaluate(() => {
      const results = []
      function searchDeep(node) {
        if (!node) return
        if (node.tagName === 'SY-FILE-ITEM') {
          const d = node.data || {}
          results.push({
            id: d._id || d.id || node.getAttribute('file-id'),
            name: d.name || node.querySelector('.file-name')?.innerText || 'arquivo',
            ext: d.extension || node.querySelector('.file-extension')?.innerText || 'jpg',
          })
        }
        if (node.shadowRoot) searchDeep(node.shadowRoot)
        if (node.children) {
          for (const c of node.children) searchDeep(c)
        }
      }
      searchDeep(document.querySelector('sy-dialog, sy-sd-dialog-one-form') || document.body)
      return results.filter(f => f.id)
    })

    console.log(`🎯 Encontrados ${fileList.length} arquivos com ID no Shadow DOM recursivo!`)

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
          console.log(`   ✅ [${i + 1}/${fileList.length}] Salvo: ${cleanName} (${Math.round(buf.length / 1024)} KB)`)
        }
      } catch (err) {
        console.log(`   ⚠️ Erro ao salvar ${cleanName}: ${err.message}`)
      }
    }

    console.log(`\n🎉 Total de arquivos salvos em public/vistorias/hall_design/: ${fs.readdirSync(outDir).length}`)

  } finally {
    await browser.close()
  }
}

downloadWithDeepShadow()
