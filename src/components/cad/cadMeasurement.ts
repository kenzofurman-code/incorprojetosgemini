/**
 * cadMeasurement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciador Nativo WebGL Three.js de Cotas, Medições e Snap Magnético para CAD.
 * Renderiza diretamente dentro da cena Three.js do visualizador CAD com 60 FPS
 * sem lag de overlay no pan/zoom, com suporte a snap magnético em extremidades,
 * pontos médios e vértices de entidades.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three'
import type { AcEdBaseView } from '@mlightcad/cad-simple-viewer'

export type CADUnit = 'cm' | 'm' | 'mm'

export interface CADPoint2D {
  x: number
  y: number
}

export interface CADMeasurementItem {
  id: string
  startWorld: CADPoint2D
  endWorld: CADPoint2D
  rawDistance: number
  group: THREE.Group
  sprite: THREE.Sprite
}

export type CADSnapType = 'endpoint' | 'midpoint' | 'center' | 'nearest' | 'none'

export interface CADSnapResult {
  point: CADPoint2D
  isSnapped: boolean
  snapType: CADSnapType
}

/** Formata a distância real em metros considerando a unidade do arquivo CAD */
export function formatCADDistance(rawDistance: number, unit: CADUnit): string {
  let meters = rawDistance
  if (unit === 'cm') {
    meters = rawDistance * 0.01
  } else if (unit === 'mm') {
    meters = rawDistance * 0.001
  } else if (unit === 'm') {
    meters = rawDistance
  }

  if (meters >= 1.0) {
    return `${meters.toFixed(2)} m`
  } else {
    const cm = meters * 100
    return `${meters.toFixed(2)} m (${cm.toFixed(1)} cm)`
  }
}

/** Calcula o ponto de snap magnético nas entidades CAD próximas do cursor */
export function getSnappedCADPoint(
  view: any,
  screenX: number,
  screenY: number,
  worldX: number,
  worldY: number
): CADSnapResult {
  if (!view || !view.pick) {
    return { point: { x: worldX, y: worldY }, isSnapped: false, snapType: 'none' }
  }

  try {
    // Raio de busca de 22 pixels na tela
    const hits = view.pick({ x: screenX, y: screenY }, 22, false)
    if (!hits || hits.length === 0) {
      return { point: { x: worldX, y: worldY }, isSnapped: false, snapType: 'none' }
    }

    const snapCandidates: { pt: CADPoint2D; type: CADSnapType; distSq: number }[] = []

    for (const hit of hits) {
      const objId = hit.id
      let entity: any = null
      try {
        entity = (objId as any)?.open ? (objId as any).open(1) : (view.database as any)?.getObject?.(objId) || objId
      } catch {
        entity = objId
      }

      // 1. Endpoint Snap (startPoint e endPoint)
      if (entity?.startPoint && typeof entity.startPoint.x === 'number') {
        const p = { x: entity.startPoint.x, y: entity.startPoint.y }
        snapCandidates.push({ pt: p, type: 'endpoint', distSq: Math.hypot(p.x - worldX, p.y - worldY) })
      }
      if (entity?.endPoint && typeof entity.endPoint.x === 'number') {
        const p = { x: entity.endPoint.x, y: entity.endPoint.y }
        snapCandidates.push({ pt: p, type: 'endpoint', distSq: Math.hypot(p.x - worldX, p.y - worldY) })
      }

      // 2. Midpoint Snap
      if (entity?.startPoint && entity?.endPoint) {
        const mid = {
          x: (entity.startPoint.x + entity.endPoint.x) / 2,
          y: (entity.startPoint.y + entity.endPoint.y) / 2,
        }
        snapCandidates.push({ pt: mid, type: 'midpoint', distSq: Math.hypot(mid.x - worldX, mid.y - worldY) })
      }

      // 3. Center Snap (Círculos e Arcos)
      if (entity?.center && typeof entity.center.x === 'number') {
        const p = { x: entity.center.x, y: entity.center.y }
        snapCandidates.push({ pt: p, type: 'center', distSq: Math.hypot(p.x - worldX, p.y - worldY) })
      }

      // 4. Bounding box corners
      if (hit.minX !== undefined && hit.minY !== undefined) {
        const corners = [
          { x: hit.minX, y: hit.minY },
          { x: hit.maxX, y: hit.minY },
          { x: hit.maxX, y: hit.maxY },
          { x: hit.minX, y: hit.maxY },
          { x: (hit.minX + hit.maxX) / 2, y: (hit.minY + hit.maxY) / 2 },
        ]
        for (const c of corners) {
          snapCandidates.push({ pt: c, type: 'endpoint', distSq: Math.hypot(c.x - worldX, c.y - worldY) })
        }
      }
    }

    if (snapCandidates.length > 0) {
      // Ordena pelo mais próximo do cursor
      snapCandidates.sort((a, b) => a.distSq - b.distSq)
      const best = snapCandidates[0]
      return { point: best.pt, isSnapped: true, snapType: best.type }
    }
  } catch (err) {
    console.warn('[CADSnap] Error resolving snap:', err)
  }

  return { point: { x: worldX, y: worldY }, isSnapped: false, snapType: 'none' }
}

export class CADNativeMeasurementManager {
  private scene: THREE.Scene | null = null
  private view: AcEdBaseView | null = null
  private measurements: CADMeasurementItem[] = []
  private currentUnit: CADUnit = 'cm'

  private lineMaterial: THREE.LineBasicMaterial
  private pointMaterial: THREE.MeshBasicMaterial
  private previewGroup: THREE.Group | null = null
  private snapGroup: THREE.Group | null = null

  constructor() {
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf97316, // orange-500
      linewidth: 2.5,
      depthTest: false,
      transparent: true,
    })

    this.pointMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e, // green-500
      depthTest: false,
      transparent: true,
    })
  }

  /** Vincula o gerenciador à cena Three.js do CAD */
  bind(scene: THREE.Scene, view: any) {
    this.scene = scene
    this.view = view
    this.initSnapGlyphs()
  }

  private initSnapGlyphs() {
    if (!this.scene) return
    if (this.snapGroup) {
      this.scene.remove(this.snapGroup)
    }

    this.snapGroup = new THREE.Group()
    this.snapGroup.renderOrder = 9999

    // Glifo de snap (quadradinho ciano)
    const boxGeo = new THREE.BufferGeometry()
    const s = 1.0 // será escalado dinamicamente
    const points = [
      new THREE.Vector3(-s, -s, 0),
      new THREE.Vector3(s, -s, 0),
      new THREE.Vector3(s, s, 0),
      new THREE.Vector3(-s, s, 0),
      new THREE.Vector3(-s, -s, 0),
    ]
    boxGeo.setFromPoints(points)
    const snapMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2, depthTest: false })
    const boxLine = new THREE.Line(boxGeo, snapMat)
    this.snapGroup.add(boxLine)

    // Ponto central
    const dotGeo = new THREE.SphereGeometry(0.3, 8, 8)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, depthTest: false })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    this.snapGroup.add(dot)

    this.snapGroup.visible = false
    this.scene.add(this.snapGroup)
  }

  /** Atualiza o indicador visual de snap */
  setSnapIndicator(pt: CADPoint2D | null, isSnapped: boolean = false, snapType: CADSnapType = 'endpoint') {
    if (!this.snapGroup || !this.scene) return
    if (!pt || !isSnapped) {
      this.snapGroup.visible = false
      if (this.view) (this.view as any).isDirty = true
      return
    }

    this.snapGroup.position.set(pt.x, pt.y, 10)
    this.snapGroup.visible = true

    // Ajusta escala do glifo conforme o zoom da câmera
    const cam = (this.view as any)?.internalCamera as THREE.OrthographicCamera | undefined
    if (cam && typeof cam.zoom === 'number' && cam.zoom > 0) {
      const glyphScale = 14 / cam.zoom
      this.snapGroup.scale.set(glyphScale, glyphScale, 1)
    }

    if (this.view) (this.view as any).isDirty = true
  }

  /** Cria a etiqueta Sprite Three.js com o texto formatado */
  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.Sprite()

    ctx.fillStyle = 'rgba(15, 25, 35, 0.95)'
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(10, 8, 236, 48, 10)
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
    return sprite
  }

  /** Adiciona uma medição confirmada no espaço Three.js */
  addMeasurement(startWorld: CADPoint2D, endWorld: CADPoint2D): CADMeasurementItem {
    if (!this.scene) {
      throw new Error('[CADMeasurement] Three.js scene não vinculada.')
    }

    const group = new THREE.Group()
    group.renderOrder = 9990

    const p1 = new THREE.Vector3(startWorld.x, startWorld.y, 5)
    const p2 = new THREE.Vector3(endWorld.x, endWorld.y, 5)

    // 1. Linha da Cota
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const line = new THREE.Line(geo, this.lineMaterial)
    group.add(line)

    // 2. Marcadores nos extremos
    const sphereGeo = new THREE.CircleGeometry(0.8, 16)
    const sp1 = new THREE.Mesh(sphereGeo, this.pointMaterial)
    sp1.position.copy(p1)
    const sp2 = new THREE.Mesh(sphereGeo, this.pointMaterial)
    sp2.position.copy(p2)
    group.add(sp1)
    group.add(sp2)

    // 3. Etiqueta da Distância
    const rawDistance = Math.hypot(endWorld.x - startWorld.x, endWorld.y - startWorld.y)
    const label = formatCADDistance(rawDistance, this.currentUnit)
    const sprite = this.createTextSprite(label)

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    sprite.position.set(mid.x, mid.y, 6)

    // Ajusta escala do sprite baseado no zoom ou tamanho padrão
    const cam = (this.view as any)?.internalCamera as THREE.OrthographicCamera | undefined
    if (cam && typeof cam.zoom === 'number' && cam.zoom > 0) {
      const scaleX = 80 / cam.zoom
      const scaleY = 20 / cam.zoom
      sprite.scale.set(scaleX, scaleY, 1)
      sp1.scale.set(10 / cam.zoom, 10 / cam.zoom, 1)
      sp2.scale.set(10 / cam.zoom, 10 / cam.zoom, 1)
    } else {
      sprite.scale.set(12, 3, 1)
    }

    group.add(sprite)
    this.scene.add(group)

    const item: CADMeasurementItem = {
      id: `cad-measure-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startWorld,
      endWorld,
      rawDistance,
      group,
      sprite,
    }

    this.measurements.push(item)
    if (this.view) (this.view as any).isDirty = true

    return item
  }

  /** Atualiza o preview dinâmico durante a medição */
  updatePreview(startWorld: CADPoint2D, currentWorld: CADPoint2D) {
    if (!this.scene) return
    this.clearPreview()

    const group = new THREE.Group()
    group.renderOrder = 9995

    const p1 = new THREE.Vector3(startWorld.x, startWorld.y, 5)
    const p2 = new THREE.Vector3(currentWorld.x, currentWorld.y, 5)

    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const line = new THREE.Line(geo, this.lineMaterial)
    group.add(line)

    const sphereGeo = new THREE.CircleGeometry(0.8, 16)
    const sp1 = new THREE.Mesh(sphereGeo, this.pointMaterial)
    sp1.position.copy(p1)
    group.add(sp1)

    const rawDistance = Math.hypot(currentWorld.x - startWorld.x, currentWorld.y - startWorld.y)
    const label = formatCADDistance(rawDistance, this.currentUnit)
    const sprite = this.createTextSprite(label)
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    sprite.position.set(mid.x, mid.y, 6)

    const cam = (this.view as any)?.internalCamera as THREE.OrthographicCamera | undefined
    if (cam && typeof cam.zoom === 'number' && cam.zoom > 0) {
      const scaleX = 80 / cam.zoom
      const scaleY = 20 / cam.zoom
      sprite.scale.set(scaleX, scaleY, 1)
      sp1.scale.set(10 / cam.zoom, 10 / cam.zoom, 1)
    } else {
      sprite.scale.set(12, 3, 1)
    }

    group.add(sprite)
    this.scene.add(group)
    this.previewGroup = group

    if (this.view) (this.view as any).isDirty = true
  }

  clearPreview() {
    if (this.previewGroup && this.scene) {
      this.scene.remove(this.previewGroup)
      this.previewGroup = null
      if (this.view) (this.view as any).isDirty = true
    }
  }

  /** Atualiza a unidade métrica ativa e recria os sprites de todas as cotas */
  setUnit(unit: CADUnit) {
    this.currentUnit = unit
    if (!this.scene) return

    for (const m of this.measurements) {
      const label = formatCADDistance(m.rawDistance, unit)
      const newSprite = this.createTextSprite(label)
      newSprite.position.copy(m.sprite.position)
      newSprite.scale.copy(m.sprite.scale)

      m.group.remove(m.sprite)
      m.group.add(newSprite)
      m.sprite = newSprite
    }

    if (this.view) (this.view as any).isDirty = true
  }

  /** Remove uma cota específica por ID */
  removeMeasurement(id: string) {
    const item = this.measurements.find(m => m.id === id)
    if (item && this.scene) {
      this.scene.remove(item.group)
      this.measurements = this.measurements.filter(m => m.id !== id)
      if (this.view) (this.view as any).isDirty = true
    }
  }

  /** Remove todas as cotas da cena */
  clearAll() {
    this.clearPreview()
    this.setSnapIndicator(null)
    if (this.scene) {
      for (const m of this.measurements) {
        this.scene.remove(m.group)
      }
    }
    this.measurements = []
    if (this.view) (this.view as any).isDirty = true
  }

  getMeasurements(): CADMeasurementItem[] {
    return this.measurements
  }

  dispose() {
    this.clearAll()
    if (this.snapGroup && this.scene) {
      this.scene.remove(this.snapGroup)
      this.snapGroup = null
    }
    this.lineMaterial.dispose()
    this.pointMaterial.dispose()
  }
}
