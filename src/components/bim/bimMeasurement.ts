/**
 * bimMeasurement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciador de Cotas e Medições 3D para o visualizador BIM.
 * Traça linhas de medição no espaço Three.js, marcadores pontuais nos extremos,
 * indicador visual de snap magnético em vértices/arestas e etiquetas com valores reais em metros.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three'

export interface BIMMeasurement {
  id: string
  startPoint: THREE.Vector3
  endPoint: THREE.Vector3
  distance: number // em metros
  group: THREE.Group
}

/** Calcula atração magnética (snap) para vértices e arestas do triângulo clicado */
export function getSnappedPoint(hit: THREE.Intersection): { point: THREE.Vector3; isSnapped: boolean } {
  const hitPoint = hit.point.clone()
  if (!hit.face || !hit.object || !(hit.object instanceof THREE.Mesh)) {
    return { point: hitPoint, isSnapped: false }
  }

  const geom = hit.object.geometry as THREE.BufferGeometry
  const posAttr = geom.getAttribute('position')
  if (!posAttr) return { point: hitPoint, isSnapped: false }

  // Coordenadas mundiais dos 3 vértices do triângulo atingido
  const vA = new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.a).applyMatrix4(hit.object.matrixWorld)
  const vB = new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.b).applyMatrix4(hit.object.matrixWorld)
  const vC = new THREE.Vector3().fromBufferAttribute(posAttr, hit.face.c).applyMatrix4(hit.object.matrixWorld)

  // 1. Snap em Vértices (Raio de atração: 0.60m)
  const dA = hitPoint.distanceTo(vA)
  const dB = hitPoint.distanceTo(vB)
  const dC = hitPoint.distanceTo(vC)
  const minVertexDist = Math.min(dA, dB, dC)

  if (minVertexDist < 0.60) {
    if (minVertexDist === dA) return { point: vA.clone(), isSnapped: true }
    if (minVertexDist === dB) return { point: vB.clone(), isSnapped: true }
    if (minVertexDist === dC) return { point: vC.clone(), isSnapped: true }
  }

  // 2. Snap em Arestas (Linhas AB, BC, CA)
  const lineAB = new THREE.Line3(vA, vB)
  const lineBC = new THREE.Line3(vB, vC)
  const lineCA = new THREE.Line3(vC, vA)

  const pAB = new THREE.Vector3()
  const pBC = new THREE.Vector3()
  const pCA = new THREE.Vector3()

  lineAB.closestPointToPoint(hitPoint, true, pAB)
  lineBC.closestPointToPoint(hitPoint, true, pBC)
  lineCA.closestPointToPoint(hitPoint, true, pCA)

  const dAB = hitPoint.distanceTo(pAB)
  const dBC = hitPoint.distanceTo(pBC)
  const dCA = hitPoint.distanceTo(pCA)
  const minEdgeDist = Math.min(dAB, dBC, dCA)

  if (minEdgeDist < 0.35) {
    if (minEdgeDist === dAB) return { point: pAB.clone(), isSnapped: true }
    if (minEdgeDist === dBC) return { point: pBC.clone(), isSnapped: true }
    if (minEdgeDist === dCA) return { point: pCA.clone(), isSnapped: true }
  }

  return { point: hitPoint, isSnapped: false }
}

export class BIMMeasurementManager {
  private scene: THREE.Scene
  private measurements: BIMMeasurement[] = []
  private lineMaterial: THREE.LineBasicMaterial
  private pointMaterial: THREE.MeshBasicMaterial
  private snapMaterial: THREE.MeshBasicMaterial
  private previewGroup: THREE.Group | null = null
  private snapIndicator: THREE.Mesh | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf97316, // orange-500
      linewidth: 2,
      depthTest: false,
      transparent: true,
    })
    this.pointMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e, // green-500
      depthTest: false,
      transparent: true,
    })
    this.snapMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // cyan-400
      depthTest: false,
      transparent: true,
    })

    // Cria indicador visual de snap
    const snapGeo = new THREE.SphereGeometry(0.08, 16, 16)
    this.snapIndicator = new THREE.Mesh(snapGeo, this.snapMaterial)
    this.snapIndicator.renderOrder = 1001
    this.snapIndicator.visible = false
    this.scene.add(this.snapIndicator)
  }

  /** Atualiza ou oculta o indicador de snap magnético */
  setSnapIndicator(point: THREE.Vector3 | null, isSnapped: boolean = false) {
    if (!this.snapIndicator) return
    if (!point) {
      this.snapIndicator.visible = false
      return
    }
    this.snapIndicator.position.copy(point)
    this.snapIndicator.visible = true
    if (isSnapped) {
      this.snapIndicator.scale.set(1.4, 1.4, 1.4)
      this.snapMaterial.color.setHex(0x06b6d4) // Cyan quando atraído
    } else {
      this.snapIndicator.scale.set(0.9, 0.9, 0.9)
      this.snapMaterial.color.setHex(0xf97316) // Laranja quando livre
    }
  }

  /** Cria uma etiqueta flutuante como Sprite Three.js com o texto de distância */
  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.Sprite()

    ctx.fillStyle = 'rgba(15, 25, 35, 0.90)'
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(10, 8, 236, 48, 8)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(1.4, 0.35, 1)
    return sprite
  }

  /** Adiciona uma medição confirmada de ponto a ponto */
  addMeasurement(p1: THREE.Vector3, p2: THREE.Vector3): BIMMeasurement {
    const group = new THREE.Group()

    // 1. Linha da cota
    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const line = new THREE.Line(geometry, this.lineMaterial)
    line.renderOrder = 999
    group.add(line)

    // 2. Pontos extremos
    const sphereGeo = new THREE.SphereGeometry(0.06, 12, 12)
    const sp1 = new THREE.Mesh(sphereGeo, this.pointMaterial)
    sp1.position.copy(p1)
    sp1.renderOrder = 999
    const sp2 = new THREE.Mesh(sphereGeo, this.pointMaterial)
    sp2.position.copy(p2)
    sp2.renderOrder = 999
    group.add(sp1)
    group.add(sp2)

    // 3. Texto da distância no ponto médio
    const distance = p1.distanceTo(p2)
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    midPoint.y += 0.12

    const label = `${distance.toFixed(2)} m`
    const sprite = this.createTextSprite(label)
    sprite.position.copy(midPoint)
    sprite.renderOrder = 1000
    group.add(sprite)

    this.scene.add(group)

    const measurement: BIMMeasurement = {
      id: `measure-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startPoint: p1.clone(),
      endPoint: p2.clone(),
      distance,
      group,
    }

    this.measurements.push(measurement)
    return measurement
  }

  /** Atualiza a linha de preview dinamicamente com o cursor */
  updatePreview(p1: THREE.Vector3, p2: THREE.Vector3) {
    this.clearPreview()
    const group = new THREE.Group()

    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const line = new THREE.Line(geometry, this.lineMaterial)
    line.renderOrder = 999
    group.add(line)

    const sphereGeo = new THREE.SphereGeometry(0.05, 8, 8)
    const sp = new THREE.Mesh(sphereGeo, this.pointMaterial)
    sp.position.copy(p1)
    sp.renderOrder = 999
    group.add(sp)

    const dist = p1.distanceTo(p2)
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    midPoint.y += 0.12
    const sprite = this.createTextSprite(`${dist.toFixed(2)} m`)
    sprite.position.copy(midPoint)
    sprite.renderOrder = 1000
    group.add(sprite)

    this.scene.add(group)
    this.previewGroup = group
  }

  /** Limpa o preview atual */
  clearPreview() {
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup)
      this.previewGroup = null
    }
  }

  /** Remove todas as cotas da cena */
  clearAll() {
    this.clearPreview()
    this.setSnapIndicator(null)
    for (const m of this.measurements) {
      this.scene.remove(m.group)
    }
    this.measurements = []
  }

  /** Retorna a lista de medições ativas */
  getMeasurements(): BIMMeasurement[] {
    return this.measurements
  }

  /** Libera recursos Three.js */
  dispose() {
    this.clearAll()
    if (this.snapIndicator) {
      this.scene.remove(this.snapIndicator)
      this.snapIndicator = null
    }
    this.lineMaterial.dispose()
    this.pointMaterial.dispose()
    this.snapMaterial.dispose()
  }
}
