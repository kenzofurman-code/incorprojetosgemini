import { chromium } from 'playwright'
import fs from 'fs'

async function testNewTicket() {
  const targetUrl = 'https://servicodigital.curitiba.pr.gov.br/t/6a5a9c847f74ff051d9f1185'
  console.log(`🚀 Testando novo processo: ${targetUrl}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: 'scripts/session-curitiba.json', viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()

  const apiResponses = {}
  page.on('response', async (res) => {
    const url = res.url()
    try {
      if (url.includes('showTicketInfo')) apiResponses.ticketInfo = await res.json()
      if (url.includes('getTicketComments')) apiResponses.comments = await res.json()
      if (url.includes('getTicket?')) apiResponses.ticket = await res.json()
    } catch {}
  })

  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(8000)

    console.log(`📑 Título: ${await page.title()}`)
    await page.screenshot({ path: 'scripts/novo-processo.png', fullPage: true })

    const comments = apiResponses.comments?.comments || []
    console.log(`📌 Total de comentários/despachos encontrados: ${comments.length}`)

    const extracao = {
      url: targetUrl,
      ticketData: apiResponses.ticket,
      ticketInfo: apiResponses.ticketInfo,
      despachos: comments.map(c => ({
        data: c._creationDate,
        autor: c.user?.name,
        acao: c.action ? c.action.name : null,
        anexos: c.attachments,
        texto: (c.text || '').replace(/\n\s*\n/g, '\n').trim(),
      }))
    }

    fs.writeFileSync('scripts/novo-processo-dados.json', JSON.stringify(extracao, null, 2))
    console.log('💾 Salvo em: scripts/novo-processo-dados.json')

    console.log('═══════════════════════════════════════════════════════════')
    console.log('📋 DESPACHOS DO NOVO PROCESSO:')
    console.log('═══════════════════════════════════════════════════════════')
    extracao.despachos.forEach((d, i) => {
      console.log(`\n[${i + 1}] Data: ${d.data?.split('T')[0] || 'N/A'}`)
      console.log(`    Autor: ${d.autor}`)
      if (d.acao) console.log(`    👉 Ação: "${d.acao}"`)
      if (d.anexos?.length) console.log(`    📎 Anexos: ${d.anexos.map(a => a.name).join(', ')}`)
      console.log(`    Texto: ${d.texto.slice(0, 300)}...`)
    })

  } finally {
    await browser.close()
  }
}

testNewTicket()
