import { chromium } from 'playwright'
import fs from 'fs'

async function testClickButtons() {
  console.log('🚀 Iniciando teste de clique nos botões de subdados (Visualizar / Atender)...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: 'scripts/session-curitiba.json',
    viewport: { width: 1440, height: 1000 },
  })

  const page = await context.newPage()

  // Interceptar novas chamadas de API geradas pelos cliques
  const subDataApis = []
  page.on('response', async (res) => {
    const url = res.url()
    if (url.includes('/api/1/') && res.headers()['content-type']?.includes('json')) {
      try {
        const json = await res.json()
        subDataApis.push({ url, json })
      } catch { /* ignore */ }
    }
  })

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(8000)

    console.log('🔍 Procurando todos os botões e links de ação...')

    // Localizar todos os elementos com "Visualizar"
    const buttons = page.locator('button:has-text("Visualizar"), a:has-text("Visualizar"), sy-one-button:has-text("Visualizar"), [class*="button"]:has-text("Visualizar"), [class*="action"]:has-text("Visualizar")')
    const count = await buttons.count()
    console.log(`🎯 Encontrados ${count} botões de "Visualizar"!`)

    const extractedSubDetails = []

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i)
      const btnText = (await btn.innerText()).trim()
      console.log(`\n👉 [${i + 1}/${count}] Clicando em "${btnText}"...`)

      await btn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await btn.click({ timeout: 5000 }).catch(e => console.log(`Erro ao clicar: ${e.message}`))
      await page.waitForTimeout(3000)

      // Capturar texto de qualquer modal, dialog, drawer ou formulário que abriu
      const modalData = await page.evaluate(() => {
        // Seletores de diálogos/modais no SYDLE
        const dialog = document.querySelector('sy-dialog, .sy-dialog, [role="dialog"], .modal, .cdk-overlay-container, .sy-drawer, sy-one-form')
        if (dialog) {
          const text = dialog.innerText || dialog.textContent || ''
          const inputs = Array.from(dialog.querySelectorAll('input, select, textarea, [class*="field"]')).map(el => ({
            label: el.getAttribute('aria-label') || el.placeholder || el.name || el.className,
            val: el.value || el.innerText,
          }))
          return { text, inputs }
        }
        return null
      })

      if (modalData && modalData.text) {
        console.log(`   📄 Conteúdo do Subdado (${modalData.text.slice(0, 150)}...)`)
        extractedSubDetails.push({
          botaoIndice: i + 1,
          botaoNome: btnText,
          textoSubdado: modalData.text,
          campos: modalData.inputs,
        })
      } else {
        console.log('   ⚠️ Nenhum modal detectado.')
      }

      // Tentar fechar o modal
      const closeBtn = page.locator('button[aria-label="Close"], button[aria-label="Fechar"], .sy-dialog-close, button:has-text("Fechar"), button:has-text("Voltar"), .close').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click().catch(() => {})
        await page.waitForTimeout(1000)
      } else {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
      }
    }

    fs.writeFileSync('scripts/subdados-resultado.json', JSON.stringify({ extractedSubDetails, subDataApis }, null, 2))
    console.log(`\n💾 Salvo em: scripts/subdados-resultado.json com ${extractedSubDetails.length} subdados capturados!`)

  } finally {
    await browser.close()
  }
}

testClickButtons()
