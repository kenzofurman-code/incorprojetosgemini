import { chromium } from 'playwright'
import fs from 'fs'

async function clickAtenderAction() {
  console.log('🔍 Clicando nas ações do processo ativo (Atender e Visualizar)...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json', viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/6a5a9c847f74ff051d9f1185', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    const buttons = page.locator('sy-button:has-text("Atender"), sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    console.log(`Encontrados ${count} botões de ação!`)

    const details = []

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i)
      const btnText = (await btn.innerText()).trim()
      console.log(`\n👉 [${i + 1}/${count}] Clicando em "${btnText}"...`)

      await btn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await btn.click({ force: true })
      await page.waitForTimeout(4000)

      await page.screenshot({ path: `scripts/processo-ativo-acao-${i + 1}.png`, fullPage: true })
      console.log(`📸 Screenshot salvo: scripts/processo-ativo-acao-${i + 1}.png`)

      // Extrair todo o texto profundo do formulário/modal de atendimento
      const extracted = await page.evaluate(() => {
        const dialog = document.querySelector('sy-dialog, sy-sd-dialog-one-form')
        if (!dialog) return null

        function getDeepText(node) {
          let str = ''
          if (!node) return str
          if (node.shadowRoot) str += getDeepText(node.shadowRoot) + ' '
          if (node.children) {
            for (const c of node.children) str += getDeepText(c) + ' '
          }
          if (node.childNodes) {
            for (const n of node.childNodes) {
              if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
                str += n.textContent.trim() + '\n'
              }
            }
          }
          return str
        }

        return getDeepText(dialog).replace(/\s+/g, ' ').trim()
      })

      console.log(`📄 CONTEÚDO EXTRAÍDO DA AÇÃO "${btnText}":\n`, extracted)
      details.push({ acao: btnText, texto: extracted })

      // Fechar modal
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1500)
    }

    fs.writeFileSync('scripts/processo-ativo-detalhes.json', JSON.stringify(details, null, 2))

  } finally {
    await browser.close()
  }
}

clickAtenderAction()
