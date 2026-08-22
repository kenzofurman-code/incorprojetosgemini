import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'
import * as fs from 'fs'

async function testIds() {
  console.log('FragmentsModel methods for IDs:')
  const proto = FRAGS.FragmentsModel.prototype
  console.log('getLocalIdsFromItemIds:', proto.getLocalIdsFromItemIds.toString())
  console.log('getLocalIdsByGuids:', proto.getLocalIdsByGuids.toString())
  console.log('getGuidsByLocalIds:', proto.getGuidsByLocalIds.toString())
  console.log('getLocalIds:', proto.getLocalIds.toString())
}

testIds().catch(console.error)
