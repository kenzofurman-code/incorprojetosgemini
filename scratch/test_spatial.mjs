import * as WebIFC from 'web-ifc'
import * as fs from 'fs'

async function testIFC() {
  const ifcApi = new WebIFC.IfcAPI()
  await ifcApi.Init()
  
  const buffer = fs.readFileSync('public/test-files/test.ifc')
  const modelID = ifcApi.OpenModel(new Uint8Array(buffer))
  
  console.log('Model opened successfully, ID:', modelID)
  
  // 1. Get Building Storeys
  const storeys = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCBUILDINGSTOREY)
  console.log(`Found ${storeys.size()} Building Storeys:`)
  
  const storeyMap = new Map()
  for (let i = 0; i < storeys.size(); i++) {
    const id = storeys.get(i)
    const line = ifcApi.GetLine(modelID, id)
    const name = line.Name?.value || line.LongName?.value || `Pavimento #${id}`
    storeyMap.set(id, name)
    console.log(` - Storey ID ${id}: ${name} (Elevation: ${line.Elevation?.value})`)
  }
  
  // 2. Get RelContainedInSpatialStructure
  const rels = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE)
  console.log(`\nFound ${rels.size()} Spatial Containment Relations:`)
  
  let elementToStoreyCount = 0
  for (let i = 0; i < rels.size(); i++) {
    const relId = rels.get(i)
    const rel = ifcApi.GetLine(modelID, relId)
    const structureId = rel.RelatingStructure?.value
    const storeyName = storeyMap.get(structureId) || `Estrutura #${structureId}`
    const related = rel.RelatedElements || []
    
    elementToStoreyCount += related.length
    console.log(` - Rel ID ${relId} -> Storey "${storeyName}": contains ${related.length} elements`)
    if (related.length > 0) {
      const sampleId = related[0].value
      const sample = ifcApi.GetLine(modelID, sampleId)
      console.log(`    Sample: #${sampleId} (${sample.__proto__?.constructor?.name || 'IFC Element'}) Name: ${sample.Name?.value || '-'}`)
    }
  }
  
  console.log(`\nTotal elements linked to storeys: ${elementToStoreyCount}`)
  ifcApi.CloseModel(modelID)
}

testIFC().catch(console.error)
