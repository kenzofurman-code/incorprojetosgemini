import fs from 'fs'
const api = JSON.parse(fs.readFileSync('scripts/pendencia-api.json', 'utf-8'))
const getItemCall = api.find(a => a.url.includes('getItem'))
console.log('Resultado do getItem da Pendência:')
console.log(JSON.stringify(getItemCall?.json, null, 2))
