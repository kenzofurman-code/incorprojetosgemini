import { chromium } from 'playwright'
import fs from 'fs'

async function findVisualizarButton() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
  await page.waitForTimeout(8000)

  // Encontrar comentários
  const comments = await page.evaluate(() => {
    const list = []
    const cards = document.querySelectorAll('sy-sd-comment, .sy-sd-comment')
    cards.forEach((c, idx) => {
      const btn = c.querySelector('sy-button')
      list.push({
        idx,
        text: c.innerText ? c.innerText.slice(0, 100).replace(/\n/g, ' ') : '',
        hasButton: !!btn,
        btnText: btn ? btn.innerText.trim() : null
      })
    })
    return list
  })

  console.log(`Encontrados ${comments.length} cards de comentários:`)
  console.log(comments)

  await browser.close()
}

findVisualizarButton()
