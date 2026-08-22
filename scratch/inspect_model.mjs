import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'
import * as fs from 'fs'

async function inspectModel() {
  const components = new OBC.Components()
  const ifcLoader = components.get(OBC.IfcLoader)
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: 'public/wasm/web-ifc/',
      absolute: true,
    }
  })

  // Check FragmentsModel prototype
  console.log('--- FRAGS.FragmentsModel prototype ---')
  console.log(Object.getOwnPropertyNames(FRAGS.FragmentsModel.prototype))

  // Check OBC.Raycasters prototype
  console.log('\n--- OBC.Raycasters prototype ---')
  console.log(Object.getOwnPropertyNames(OBC.Raycasters.prototype))

  // Check OBC.SimpleRaycaster prototype
  console.log('\n--- OBC.SimpleRaycaster prototype ---')
  console.log(Object.getOwnPropertyNames(OBC.SimpleRaycaster.prototype))
}

inspectModel().catch(console.error)
