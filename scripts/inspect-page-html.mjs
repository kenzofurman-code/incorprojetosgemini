import { chromium } from 'playwright'
import fs from 'fs'

async function inspectPrevFogoPage() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.bombeiros.pr.gov.br/PrevFogo/Pagina/Acompanhar-Processo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)

    const html = await page.content()
    fs.writeFileSync('scripts/prevfogo-page.html', html, 'utf-8')
    console.log('HTML salvo em scripts/prevfogo-page.html')

    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe, embed, object')).map(el => ({
        tag: el.tagName,
        src: el.src || el.getAttribute('src'),
        id: el.id,
        name: el.name
      }))
    })

    console.log('Elementos embed/iframe encontrados:', iframes)

  } finally {
    await browser.close()
  }
}

inspectPrevFogoPage()
