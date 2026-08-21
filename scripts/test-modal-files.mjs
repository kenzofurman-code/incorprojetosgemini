import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function downloadViaPlaywrightEvents() {
  console.log('🚀 Baixando fotos e arquivos através de cliques no modal...')

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

    // Clicar no botão Visualizar da UCE
    const buttons = page.locator('sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    console.log(`Botões Visualizar encontrados: ${count}`)

    const btn = buttons.nth(count - 1)
    await btn.scrollIntoViewIfNeeded()
    await btn.click({ force: true })
    await page.waitForTimeout(6000)

    // Encontrar todos os itens que representam arquivos/fotos
    const fileElements = page.locator('sy-file, .sy-file, sy-button:has-text("Baixar"), a[href*="download"], [title*="Baixar"]')
    const fileCount = await fileElements.count()
    console.log(`Elementos de download encontrados no diálogo: ${fileCount}`)

    // Tirar screenshot do diálogo com as fotos abertas
    await page.screenshot({ path: 'public/vistorias/hall_design/modal_vistoria_completo.png', fullPage: true })
    console.log('📸 Screenshot salvo: public/vistorias/hall_design/modal_vistoria_completo.png')

  } finally {
    await browser.close()
  }
}

downloadViaPlaywrightEvents()
