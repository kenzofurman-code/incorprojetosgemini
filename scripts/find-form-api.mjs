import fs from 'fs'
const apis = JSON.parse(fs.readFileSync('scripts/sydle-form-api.json', 'utf-8'))
console.log(`Total intercepted APIs: ${apis.length}`)
for (const a of apis) {
  if (a.body.includes('Fachada') || a.body.includes('Recuo') || a.body.includes('ÁTICO') || a.body.includes('Apartamento')) {
    console.log(`API URL: ${a.url}`)
    fs.writeFileSync('scripts/detected-form-payload.json', a.body)
    console.log('Saved payload to scripts/detected-form-payload.json')
    break
  }
}
