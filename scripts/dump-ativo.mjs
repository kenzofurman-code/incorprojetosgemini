import fs from 'fs'
const data = JSON.parse(fs.readFileSync('scripts/processo-ativo-detalhes.json', 'utf-8'))
console.log(JSON.stringify(data, null, 2))
