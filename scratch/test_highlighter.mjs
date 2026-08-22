import * as OBC from '@thatopen/components'

console.log('OBC.Highlighter:', OBC.Highlighter)
for (const key of Object.keys(OBC)) {
  if (key.toLowerCase().includes('high') || key.toLowerCase().includes('select') || key.toLowerCase().includes('outlin') || key.toLowerCase().includes('edge')) {
    console.log('Found component:', key)
  }
}
