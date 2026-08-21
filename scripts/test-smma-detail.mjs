import { chromium } from 'playwright'
import fs from 'fs'

async function inspectSmmaTask() {
  console.log('🔍 Investigando especificamente o botão da SMMA (Secretaria de Meio Ambiente)...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  // Gravar todas as requisições de rede
  const requests = []
  page.on('response', async (res) => {
    const url = res.url()
    try {
      if (url.includes('/api/1/')) {
        const text = await res.text()
        requests.push({ url, status: res.status(), body: text.slice(0, 1000) })
      }
    } catch {}
  })

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    // Localizar o card da SMMA com texto "Seu processo foi analisado e apresenta pendências"
    const smmaCard = page.locator('sy-one-post-card:has-text("SMMA"), sy-one-user-task-card:has-text("SMMA"), div:has-text("SMMA")')
    const count = await smmaCard.count()
    console.log(`Encontrados ${count} cards com menção a SMMA`)

    // Encontrar o botão Visualizar dentro do bloco SMMA
    const smmaBtn = page.locator('div:has-text("SMMA") sy-button:has-text("Visualizar")').first()
    
    if (await smmaBtn.isVisible().catch(() => false)) {
      console.log('👉 Clicando no botão Visualizar da SMMA...')
      await smmaBtn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)
      await smmaBtn.click({ force: true })
      
      console.log('⏳ Aguardando 8 segundos para carregamento do formulário da SMMA...')
      await page.waitForTimeout(8000)

      await page.screenshot({ path: 'scripts/smma-modal-detalhado.png', fullPage: true })
      console.log('📸 Screenshot salvo em: scripts/smma-modal-detalhado.png')

      // Extrair o conteúdo do modal da SMMA
      const modalText = await page.evaluate(() => {
        const dialog = document.querySelector('sy-dialog, sy-sd-dialog-one-form')
        return dialog ? dialog.innerText : 'Nenhum diálogo encontrado'
      })

      console.log('📄 Conteúdo do Modal SMMA:\n', modalText)
      fs.writeFileSync('scripts/smma-requests.json', JSON.stringify(requests, null, 2))

    } else {
      console.log('❌ Botão específico da SMMA não encontrado diretamente por esse seletor.')
    }

  } finally {
    await browser.close()
  }
}

inspectSmmaTask()
