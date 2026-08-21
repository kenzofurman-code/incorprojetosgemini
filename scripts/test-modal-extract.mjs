import { chromium } from 'playwright'
import fs from 'fs'

async function inspectModalContent() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    const syBtns = page.locator('sy-button:has-text("Visualizar"), sy-button:has-text("Atender")')
    const count = await syBtns.count()
    console.log(`Total de sy-buttons encontrados: ${count}`)

    for (let i = 0; i < count; i++) {
      const btn = syBtns.nth(i)
      const btnText = (await btn.innerText()).trim()
      console.log(`\n══════════════════════════════════════════════`)
      console.log(`👉 Clicando no [${i + 1}/${count}] sy-button: "${btnText}"`)
      console.log(`══════════════════════════════════════════════`)

      await btn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await btn.click({ force: true })
      
      // Aguardar o diálogo abrir e os componentes do formulário carregarem
      await page.waitForTimeout(4000)

      // Extrair tudo de dentro de sy-dialog e sy-sd-dialog-one-form
      const modalResult = await page.evaluate(() => {
        const dialog = document.querySelector('sy-dialog, sy-sd-dialog-one-form')
        if (!dialog) return { error: 'Diálogo não encontrado' }

        function deepTraverse(node) {
          let text = ''
          let files = []
          let inputs = []

          if (!node) return { text, files, inputs }

          if (node.shadowRoot) {
            const inner = deepTraverse(node.shadowRoot)
            text += inner.text + ' '
            files.push(...inner.files)
            inputs.push(...inner.inputs)
          }

          const children = node.children ? Array.from(node.children) : []
          children.forEach(child => {
            const inner = deepTraverse(child)
            text += inner.text + ' '
            files.push(...inner.files)
            inputs.push(...inner.inputs)

            // Links / PDFs
            if (child.tagName === 'A' && child.href) {
              files.push({ texto: child.innerText, href: child.href })
            }
            // Inputs / Labels
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(child.tagName)) {
              inputs.push({
                tag: child.tagName,
                name: child.name || child.id || child.placeholder,
                val: child.value || '',
              })
            }
          })

          if (node.childNodes) {
            for (const n of node.childNodes) {
              if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
                text += n.textContent.trim() + '\n'
              }
            }
          }

          return { text, files, inputs }
        }

        return deepTraverse(dialog)
      })

      console.log('📄 TEXTO EXTRAÍDO DO MODAL:')
      console.log(modalResult.text ? modalResult.text.slice(0, 500) : 'Vazio')
      console.log('📎 ARQUIVOS/LINKS ENCONTRADOS:', JSON.stringify(modalResult.files, null, 2))

      // Fechar modal pelo botão interno ou Escape
      const closeBtn = page.locator('sy-dialog sy-button, sy-sd-dialog-one-form-header sy-button, sy-dialog button, button:has-text("Fechar")').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click({ force: true }).catch(() => {})
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(2000)
    }

  } finally {
    await browser.close()
  }
}

inspectModalContent()
