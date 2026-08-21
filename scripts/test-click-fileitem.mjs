import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

async function clickFileItemActions() {
  console.log('🔍 Testando hover e clique nos botões de ação do sy-file-item...')

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

    // Encontrar todos os sy-file-item
    const fileItems = page.locator('sy-file-item')
    const total = await fileItems.count()
    console.log(`Encontrados ${total} sy-file-item!`)

    for (let i = 0; i < Math.min(total, 5); i++) {
      const item = fileItems.nth(i)
      await item.scrollIntoViewIfNeeded()
      await item.hover()
      await page.waitForTimeout(500)

      // Clicar no botão de ação dentro do item
      const actionBtn = item.locator('sy-button, button, sy-icon').first()
      if (await actionBtn.isVisible().catch(() => false)) {
        console.log(`Clicando no botão da ação do item ${i + 1}...`)
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 6000 }).catch(() => null),
          actionBtn.click({ force: true }).catch(() => {})
        ])
        if (download) {
          const fname = download.suggestedFilename()
          await download.saveAs(path.join(outDir, fname))
          console.log(`🎉 BAIXOU: ${fname}`)
        }
      }
    }

  } finally {
    await browser.close()
  }
}

clickFileItemActions()
