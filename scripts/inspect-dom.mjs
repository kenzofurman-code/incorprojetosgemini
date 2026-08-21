import { chromium } from 'playwright'

async function inspectPasswordDom() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto('https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477')
    await page.waitForTimeout(3000)

    await page.click('text="Entrar com CPF"')
    await page.waitForTimeout(2000)

    // Vamos ver todos os inputs e forms na tela de login
    const dom = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        style: i.getAttribute('style'),
        className: i.className,
      }))
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        method: f.method,
      }))
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => ({
        text: b.innerText || b.value,
        id: b.id,
        type: b.type,
      }))
      return { inputs, forms, buttons }
    })

    console.log('DOM Inicial:', JSON.stringify(dom, null, 2))

  } finally {
    await browser.close()
  }
}

inspectPasswordDom()
