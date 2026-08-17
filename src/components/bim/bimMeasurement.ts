/**
 * bimMeasurement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciador de Cotas e Medições 3D para o visualizador BIM.
 * Traça linhas de medição no espaço Three.js, marcadores pontuais nos extremos
 * e etiquetas com valores reais de distância em metros (m).
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

export class BIMMeasurementManager {
  private scene: THREE.Scene
  private measurements: BIMMeasurement[] = []
  private lineMaterial: THREE.LineBasicMaterial
  private pointMaterial: THREE.MeshBasicMaterial
  private previewGroup: THREE.Group | null = null

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
    this.lineMaterial.dispose()
    this.pointMaterial.dispose()
  }
}
