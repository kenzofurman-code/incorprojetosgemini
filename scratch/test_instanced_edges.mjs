import * as THREE from 'three'

const geom = new THREE.BoxGeometry(1, 2, 1)
const instMesh = new THREE.InstancedMesh(geom, new THREE.MeshStandardMaterial(), 5)
const matrix = new THREE.Matrix4()
for (let i = 0; i < 5; i++) {
  matrix.setPosition(i * 2, 0, 0)
  instMesh.setMatrixAt(i, matrix)
}
instMesh.instanceMatrix.needsUpdate = true

console.log('InstancedMesh created:', instMesh.count)

// Create Edges
const edgesGeom = new THREE.EdgesGeometry(geom, 25)
console.log('Edges vertices:', edgesGeom.attributes.position.count)
