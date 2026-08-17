/**
 * cadMeasurement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciador de Cotas e Medições 2D para visualizador CAD (DWG / DXF).
 * Converte coordenadas de tela para coordenadas reais de engenharia do modelo (WCS)
 * e gera as linhas de cota com setas e etiquetas de distância.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface CADPoint2D {
  x: number
  y: number
}

export interface CADMeasurementItem {
  id: string
  startWorld: CADPoint2D
  endWorld: CADPoint2D
  distance: number // Na unidade do modelo (ex: metros)
  label: string
}

export class CADMeasurementManager {
  private measurements: CADMeasurementItem[] = []

  /** Adiciona uma nova medição 2D com base nos pontos de mundo (WCS) */
  addMeasurement(startWorld: CADPoint2D, endWorld: CADPoint2D, unit: string = 'm'): CADMeasurementItem {
    const dx = endWorld.x - startWorld.x
    const dy = endWorld.y - startWorld.y
    const distance = Math.hypot(dx, dy)

    let formatted = `${distance.toFixed(2)} ${unit}`
    if (distance > 1000) {
      formatted = `${(distance / 1000).toFixed(2)} km`
    } else if (distance < 0.01) {
      formatted = `${(distance * 100).toFixed(1)} cm`
    }

    const item: CADMeasurementItem = {
      id: `cad-measure-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startWorld,
      endWorld,
      distance,
      label: formatted,
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
