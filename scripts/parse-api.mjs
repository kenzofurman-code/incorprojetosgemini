import fs from 'fs'

const apiData = JSON.parse(fs.readFileSync('scripts/debug-api.json', 'utf-8'))

const ticketCalls = apiData.filter(item => 
  item.url.includes('showTicketInfo') || 
  item.url.includes('getTicketComments') ||
  item.url.includes('getDraftForm') ||
  item.url.includes('getCards')
)

console.log(`Encontradas ${ticketCalls.length} chamadas de ticket!`)

ticketCalls.forEach((call, i) => {
  console.log(`\n─── [${i + 1}] URL: ${call.url} ───`)
  const str = JSON.stringify(call.data)
  console.log('Prévia do dado:', str.slice(0, 500))
})
