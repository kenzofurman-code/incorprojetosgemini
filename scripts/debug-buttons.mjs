import { chromium } from 'playwright'
import fs from 'fs'

async function debugButtons() {
  console.log('🔍 Investigando os botões de ação na página de Curitiba...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(8000)

    // Rolar a página
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(3000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(2000)

    // Inspecionar todos os elementos que contêm texto "Visualizar" ou "Atender"
    const buttonsInfo = await page.evaluate(() => {
      const results = []
      
      // Busca recursiva dentro de Shadow DOMs
      function findElementsWithText(root) {
        if (!root) return
        
        if (root.shadowRoot) {
          findElementsWithText(root.shadowRoot)
        }

        const all = root.querySelectorAll ? Array.from(root.querySelectorAll('*')) : []
        all.forEach(el => {
          if (el.shadowRoot) {
            findElementsWithText(el.shadowRoot)
          }

          const txt = (el.innerText || el.textContent || '').trim()
          if (txt === 'Visualizar' || txt === 'Visualizar documento(s)' || txt === 'Atender' || txt.includes('Visualizar documento')) {
            const tag = el.tagName.toLowerCase()
            if (['sy-button', 'button', 'a', 'span', 'div'].includes(tag)) {
              results.push({
                tag,
                className: el.className,
                text: txt,
                id: el.id,
                outerHTML: el.outerHTML.slice(0, 200),
                parentTag: el.parentElement ? el.parentElement.tagName.toLowerCase() : null,
              })
            }
          }
        })
      }

      findElementsWithText(document.body)
      return results
    })

    console.log(`Encontrados ${buttonsInfo.length} elementos com o texto de Ação!`)
    console.log(JSON.stringify(buttonsInfo.slice(0, 10), null, 2))

    // Testar clicar especificamente em sy-button com texto Visualizar
    console.log('\n👉 Testando clicar no primeiro sy-button que contém Visualizar...')
    const syBtn = page.locator('sy-button:has-text("Visualizar"), sy-button:has-text("Visualizar documento(s)")').first()
    
    if (await syBtn.isVisible()) {
      console.log('✅ sy-button visível! Clicando com mouse...')
      await syBtn.click({ force: true })
      await page.waitForTimeout(4000)

      await page.screenshot({ path: 'scripts/apos-clique-sybutton.png', fullPage: true })
      console.log('📸 Screenshot salvo em: scripts/apos-clique-sybutton.png')

      // Verificar se abriu modal
      const modalOpen = await page.evaluate(() => {
        const dialog = document.querySelector('sy-dialog, .sy-dialog, [role="dialog"], sy-sd-dialog-one-form')
        return dialog ? dialog.outerHTML.slice(0, 500) : 'NENHUM DIALOG ENCONTRADO'
      })
      console.log('Diálogo aberto:', modalOpen)
    } else {
      console.log('❌ sy-button não estava visível.')
    }

  } finally {
    await browser.close()
  }
}

debugButtons()
