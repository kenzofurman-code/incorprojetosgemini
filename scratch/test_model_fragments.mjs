import * as fs from 'fs'
import * as WebIFC from 'web-ifc'

async function inspectIFC() {
  const ifcApi = new WebIFC.IfcAPI()
  ifcApi.SetWasmPath('./public/wasm/web-ifc/')
  await ifcApi.Init()
  
  const buffer = fs.readFileSync('./public/test-files/test.ifc')
  const modelId = ifcApi.OpenModel(buffer)
  
  console.log('Model opened with ID:', modelId)
  ifcApi.CloseModel(modelId)
}

inspectIFC().catch(console.error)
