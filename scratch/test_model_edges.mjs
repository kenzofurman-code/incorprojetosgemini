import * as THREE from 'three'

// Test creating edges on an instanced mesh or buffer geometry
const geom = new THREE.BoxGeometry(2, 4, 2)
const edges = new THREE.EdgesGeometry(geom, 24)
const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 1 })
const lines = new THREE.LineSegments(edges, lineMat)

console.log('Edges created successfully:', lines.type, edges.attributes.position.count)
