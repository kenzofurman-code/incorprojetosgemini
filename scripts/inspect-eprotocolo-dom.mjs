import { chromium } from 'playwright'
import fs from 'fs'

async function inspectAccordionDOM() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await page.goto('https://www.eprotocolo.pr.gov.br/spiweb/consultarProtocoloDigital.do?action=iniciarProcesso', { waitUntil: 'networkidle' })
    await page.locator('#numeroProtocolo').fill('19.749.934-6')
    await page.locator('#btnPesquisar').click()
    await page.waitForTimeout(6000)

    const structure = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, div.accordion-item, div.card, [onclick]'))
      return links.map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        text: el.innerText ? el.innerText.slice(0, 40) : '',
        onclick: el.getAttribute('onclick'),
        href: el.getAttribute('href')
      }))
    })

    console.log('Elementos interativos encontrados:')
    console.log(structure.filter(s => s.text.includes('Andamentos') || s.text.includes('Mais') || s.href || s.onclick))

  } finally {
    await browser.close()
  }
}

inspectAccordionDOM()
