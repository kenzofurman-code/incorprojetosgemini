import { chromium } from 'playwright'
import fs from 'fs'

async function clickSpecificAction() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    // Encontrar todos os containers de ação
    const actionContainers = page.locator('.sy-sd-action-container sy-button')
    const count = await actionContainers.count()
    console.log(`Contêineres de ação únicos: ${count}`)

    for (let i = 0; i < count; i++) {
      const btn = actionContainers.nth(i)
      const text = (await btn.innerText()).trim()
      console.log(`\n👉 Clicando na Ação [${i + 1}/${count}]: "${text}"`)

      await btn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await btn.click({ force: true })
      await page.waitForTimeout(4000)

      // Capturar screenshot específico
      await page.screenshot({ path: `scripts/modal-acao-${i + 1}.png` })
      console.log(`📸 Salvo scripts/modal-acao-${i + 1}.png`)

      // Fechar modal
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1500)
    }

  } finally {
    await browser.close()
  }
}

clickSpecificAction()
