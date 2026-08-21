import { chromium } from 'playwright'
import fs from 'fs'

async function testRealButtons() {
  const browser = await chromium.launch({ headless: false }) // Abre visível
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
  await page.waitForTimeout(8000)

  // Rolar até o fim e voltar
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(2000)

  // Encontrar botões dentro dos cards do SYDLE
  const cards = page.locator('sy-one-post-card, sy-one-user-task-card, .timeline-item')
  const totalCards = await cards.count()
  console.log(`Total de cards de timeline: ${totalCards}`)

  for (let i = 0; i < totalCards; i++) {
    const card = cards.nth(i)
    const btn = card.locator('button, a').first()
    if (await btn.isVisible().catch(() => false)) {
      const txt = (await btn.innerText()).trim()
      console.log(`Card ${i + 1}: Botão "${txt}" encontrado. Clicando...`)
      await btn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(3000)

      // Tirar foto do que abriu
      await page.screenshot({ path: `scripts/clique-card-${i + 1}.png` })
      
      // Tentar fechar modal se abriu
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1000)
    }
  }

  await browser.close()
}

testRealButtons()
