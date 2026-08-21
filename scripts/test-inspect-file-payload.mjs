import { chromium } from 'playwright'
import fs from 'fs'

async function inspectFilePayload() {
  console.log('🔍 Interceptando chamadas de API ao abrir o modal de vistoria...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json' })
  const page = await context.newPage()

  const apiPayloads = []

  page.on('response', async (res) => {
    const url = res.url()
    if (url.includes('/api/1/servicedesk-embedded') || url.includes('/executeMethod') || url.includes('/getDraftForm') || url.includes('/_get/')) {
      try {
        const text = await res.text()
        console.log(`📡 API Response [${res.status()}]: ${url.slice(0, 100)}`)
        if (text.length > 50) {
          apiPayloads.push({ url, body: text.slice(0, 1500) })
        }
      } catch {}
    }
  })

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477', { waitUntil: 'load' })
    await page.waitForTimeout(6000)

    // Clicar no botão Visualizar da UCE (3º botão da lista)
    const buttons = page.locator('sy-button:has-text("Visualizar")')
    const count = await buttons.count()
    if (count > 0) {
      const btn = buttons.nth(count - 1)
      await btn.scrollIntoViewIfNeeded()
      await btn.click({ force: true })
      await page.waitForTimeout(6000)
    }

    fs.writeFileSync('scripts/sydle-form-api.json', JSON.stringify(apiPayloads, null, 2))
    console.log('Salvo em scripts/sydle-form-api.json')

  } finally {
    await browser.close()
  }
}

inspectFilePayload()
