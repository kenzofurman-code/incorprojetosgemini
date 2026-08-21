import fs from 'fs'
const apis = JSON.parse(fs.readFileSync('scripts/sydle-form-api.json', 'utf-8'))
for (const a of apis) {
  if (a.body.includes('Fachada') || a.body.includes('.pdf') || a.body.includes('.jpg') || a.body.includes('00000000000000000000000f')) {
    console.log(`URL: ${a.url}`)
    console.log(`Snippet: ${a.body.slice(0, 300)}...`)
  }
}
