import fs from 'fs'

const apiData = JSON.parse(fs.readFileSync('scripts/debug-api.json', 'utf-8'))

const ticketInfo = apiData.find(i => i.url.includes('showTicketInfo'))?.data?.result
const ticketComments = apiData.find(i => i.url.includes('getTicketComments'))?.data?.comments

console.log('════════════════ DADOS DA SOLICITAÇÃO ════════════════')
console.log(JSON.stringify(ticketInfo?.dadosDaSolicitacao, null, 2))

console.log('\n════════════════ COMENTÁRIOS E DESPACHOS ════════════════')
console.log(JSON.stringify(ticketComments, null, 2))
