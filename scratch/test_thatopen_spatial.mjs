import * as OBC from '@thatopen/components'
import * as fs from 'fs'

async function testThatOpen() {
  const components = new OBC.Components()
  const ifcLoader = components.get(OBC.IfcLoader)
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: 'public/wasm/web-ifc/',
      absolute: true,
    }
  })
  
  components.init()
  const fragments = components.get(OBC.FragmentsManager)
  await fragments.init()
  const uint8 = new Uint8Array(buffer)
  
  console.log('Loading IFC with IfcLoader...')
  const model = await ifcLoader.load(uint8, true, 'test.ifc')
  console.log('Model loaded! ModelId:', model.modelId)
  
  // Test spatial structure
  if (typeof model.getSpatialStructure === 'function') {
    const tree = await model.getSpatialStructure()
    console.log('Spatial structure tree:', JSON.stringify(tree, null, 2).slice(0, 1000))
  } else {
    console.log('model.getSpatialStructure is not a function. Checking other methods...')
    console.log('Available model methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)))
  }
}

testThatOpen().catch(console.error)
