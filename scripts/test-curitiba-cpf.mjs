import { chromium } from 'playwright'

async function testCpfFlow() {
  console.log('🚀 Testando fluxo de clique em "Entrar com CPF"...')
  const targetUrl = 'https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477'

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    console.log(`📍 Página atual: ${page.url()}`)

    // Clicar no botão "Entrar com CPF"
    console.log('👉 Clicando no botão "Entrar com CPF"...')
    await page.click('text="Entrar com CPF"')
    await page.waitForTimeout(3000)

    console.log(`📍 URL após clique: ${page.url()}`)
    const pageTitle = await page.title()
    console.log(`📑 Título: ${pageTitle}`)

    // Listar campos de formulário que apareceram
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        id: i.id,
        className: i.className,
      }))
      const text = document.body.innerText
      return { inputs, textPreview: text.slice(0, 500) }
    })

    console.log('📋 Campos de Login Detectados:', JSON.stringify(formFields.inputs, null, 2))
    console.log('📝 Texto:', formFields.textPreview)

  } catch (err) {
    console.error('❌ Erro:', err)
  } finally {
    await browser.close()
  }
}

testCpfFlow()
