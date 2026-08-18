/**
 * cadMeasurement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciador de Cotas e Medições 2D para visualizador CAD (DWG / DXF).
 * Converte coordenadas de tela para coordenadas reais de engenharia do modelo (WCS)
 * e calcula a distância na escala correta (Metros, Centímetros ou Milímetros).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CADUnit = 'cm' | 'm' | 'mm'

export interface CADPoint2D {
  x: number
  y: number
}

export interface CADMeasurementItem {
  id: string
  startWorld: CADPoint2D
  endWorld: CADPoint2D
  rawDistance: number // Distância bruta nas unidades de desenho do CAD
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

export class CADMeasurementManager {
  private measurements: CADMeasurementItem[] = []

  /** Adiciona uma nova medição 2D com base nos pontos de mundo (WCS) */
  addMeasurement(startWorld: CADPoint2D, endWorld: CADPoint2D): CADMeasurementItem {
    const dx = endWorld.x - startWorld.x
    const dy = endWorld.y - startWorld.y
    const rawDistance = Math.hypot(dx, dy)

    const item: CADMeasurementItem = {
      id: `cad-measure-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startWorld,
      endWorld,
      rawDistance,
    }

    this.measurements.push(item)
    return item
  }

  /** Remove todas as medições ativas */
  clearAll() {
    this.measurements = []
  }

  /** Retorna a lista de medições */
  getMeasurements(): CADMeasurementItem[] {
    return this.measurements
  }

  /** Remove uma medição específica por ID */
  removeMeasurement(id: string) {
    this.measurements = this.measurements.filter(m => m.id !== id)
  }
}
