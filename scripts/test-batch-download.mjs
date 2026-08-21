import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadAll74Files() {
  console.log('🚀 Baixando todos os 74 arquivos e fotos reais do modal...')

  const outDir = path.resolve('public', 'vistorias', 'hall_design')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: 'scripts/session-curitiba.json',
    acceptDownloads: true,
    viewport: { width: 1600, height: 1200 }
  })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(6000)

    const buttons = page.locator('sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    const btn = buttons.nth(count - 1)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(6000)

    // Encontrar todos os botões "Baixar"
    const downloadBtns = page.locator('sy-button:has-text("Baixar")')
    const totalBaixar = await downloadBtns.count()
    console.log(`Encontrados ${totalBaixar} botões diretos de "Baixar"!`)

    for (let i = 0; i < totalBaixar; i++) {
      try {
        const dBtn = downloadBtns.nth(i)
        await dBtn.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)

        // Aguardar o evento de download do navegador
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 7000 }).catch(() => null),
          dBtn.click({ force: true }).catch(() => {})
        ])

        if (download) {
          const suggestedName = download.suggestedFilename()
          const savePath = path.join(outDir, suggestedName)
          await download.saveAs(savePath)
          console.log(`   ✅ [${i + 1}/${totalBaixar}] Salvo com sucesso: ${suggestedName}`)
        } else {
          console.log(`   ℹ️ [${i + 1}/${totalBaixar}] Sem disparo de download direto.`)
        }
      } catch (err) {
        console.log(`   ⚠️ Erro no item ${i + 1}: ${err.message}`)
      }
    }

    const downloaded = fs.readdirSync(outDir)
    console.log(`\n🎉 Total de arquivos baixados na pasta public/vistorias/hall_design/: ${downloaded.length}`)
    console.log(downloaded)

  } finally {
    await browser.close()
  }
}

downloadAll74Files()
