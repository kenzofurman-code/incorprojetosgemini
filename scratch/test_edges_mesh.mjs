import * as THREE from 'three'

const geom = new THREE.BoxGeometry(2, 2, 2)
const edgesGeom = new THREE.EdgesGeometry(geom, 20)
console.log('Edges count:', edgesGeom.attributes.position.count)
