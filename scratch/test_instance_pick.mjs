import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'
import * as fs from 'fs'

async function inspectFragmentMesh() {
  console.log('--- Checking FragmentMesh prototype ---')
  for (const key of Object.keys(FRAGS)) {
    if (key.toLowerCase().includes('mesh') || key.toLowerCase().includes('fragment')) {
      console.log('FRAGS key:', key)
    }
  }
}

inspectFragmentMesh().catch(console.error)
