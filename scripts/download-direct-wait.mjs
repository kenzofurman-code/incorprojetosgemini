import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadDirectWithWait() {
  console.log('🚀 Baixando fotos com espera explícita do sy-file-item...')
  const outDir = 'public/vistorias/hall_design'
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    // Clicar no botão da UCE
    const btn = page.locator('sy-button:has-text("Visualizar")').nth(2)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    
    // Aguardar os itens de arquivos aparecerem no DOM
    console.log('Aguardando sy-file-item carregar...')
    await page.waitForSelector('sy-file-item', { timeout: 20000 })
    await page.waitForTimeout(2000)

    const fileList = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('sy-file-item'))
      return items.map(item => {
        return {
          id: item.data?._id || item.data?.id,
          name: item.data?.name || item.querySelector('.file-name')?.innerText || 'arquivo',
          ext: item.data?.extension || item.querySelector('.file-extension')?.innerText || 'jpg',
        }
      }).filter(f => f.id)
    })

    console.log(`Encontrados ${fileList.length} arquivos!`)

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      const cleanName = f.name.replace(/[/\\?%*:|"<>]/g, '_') + '.' + f.ext
      const destPath = path.join(outDir, cleanName)

      const url = `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_classId/00000000000000000000000f/_get/${f.id}`
      const res = await page.request.get(url)
      if (res.ok()) {
        const buf = await res.body()
        fs.writeFileSync(destPath, buf)
        console.log(`✅ [${i + 1}/${fileList.length}] Salvo: ${cleanName} (${Math.round(buf.length / 1024)} KB)`)
      }
    }

    console.log('\n🎉 TODOS OS ARQUIVOS FORAM BAIXADOS!')
    console.log(fs.readdirSync(outDir))

  } finally {
    await browser.close()
  }
}

downloadDirectWithWait()
