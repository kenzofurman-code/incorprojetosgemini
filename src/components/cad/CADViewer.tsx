/**
 * CADViewer.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Wrapper React modular sobre cadViewerCore.ts.
 *
 * Responsabilidades deste componente:
 *  - Gerenciar o ciclo de vida do viewer (init / dispose) via useEffect
 *  - Expor via ref imperativa (useImperativeHandle) os métodos do core
 *  - Tratar o FileReader para converter File → ArrayBuffer e passar ao core
 *  - Expor APIs de Camadas, Layouts, Picking, Medições Nativas WebGL e Snap
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react'
import {
  initCADViewer,
  type CADViewerInstance,
  type CADCanvasClickEvent,
} from './cadViewerCore'
import type { AcApLayerSummary } from '@mlightcad/cad-simple-viewer'
import type { SelectedCADEntity } from './CADEntityDrawer'
import type { CADLayoutItem } from './CADLayoutsBar'
import type { CADMeasurementItem, CADUnit, CADSnapResult, CADPoint2D, CADSnapType } from './cadMeasurement'

// ─── Public handle (exposto via ref ao componente pai) ───────────────────────

export interface CADViewerHandle {
  loadFile: (file: File) => Promise<boolean>
  setPan: () => void
  setZoom: () => void
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  getManager: () => CADViewerInstance['manager'] | null
  getInstance: () => CADViewerInstance | null

  // Camadas
  getLayerSummaries: () => AcApLayerSummary[]
  setLayerOn: (layerName: string, isOn: boolean) => void
  setLayerFrozen: (layerName: string, isFrozen: boolean) => void
  setLayerLocked: (layerName: string, isLocked: boolean) => void
  isolateLayer: (layerName: string) => void
  turnAllLayersOn: () => void
  turnAllLayersOffExceptCurrent: () => void
  thawAllLayers: () => void

  // Layouts
  getLayouts: () => CADLayoutItem[]
  setLayout: (layoutName: string) => void

  // Inspeção e Coordenadas
  pickEntity: (screenX: number, screenY: number) => SelectedCADEntity | null
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }

  // Medição Nativa WebGL e Snap
  getSnapPoint: (screenX: number, screenY: number, worldX: number, worldY: number) => CADSnapResult
  setSnapIndicator: (pt: CADPoint2D | null, isSnapped?: boolean, snapType?: CADSnapType) => void
  addMeasurement: (startWorld: CADPoint2D, endWorld: CADPoint2D) => CADMeasurementItem | null
  updateMeasurePreview: (startWorld: CADPoint2D, currentWorld: CADPoint2D) => void
  clearMeasurePreview: () => void
  removeMeasurement: (id: string) => void
  clearAllMeasurements: () => void
  setMeasurementUnit: (unit: CADUnit) => void
  getMeasurements: () => CADMeasurementItem[]
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CADViewerProps {
  onFileLoaded?: (fileName: string) => void
  onCanvasClick?: (event: CADCanvasClickEvent) => void
  onLoadError?: (error: Error, fileName: string) => void
  background?: number
  containerClassName?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

const CADViewer = forwardRef<CADViewerHandle, CADViewerProps>(function CADViewer(
  {
    onFileLoaded,
    onCanvasClick,
    onLoadError,
    background = 0x1c2b3a,
    containerClassName = 'w-full h-full',
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CADViewerInstance | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  // ── Inicializa o core viewer após o mount ─────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    let unsubscribeClick: (() => void) | null = null

    initCADViewer({ container: containerRef.current, background })
      .then(viewer => {
        if (disposed) {
          viewer.dispose()
          return
        }
        viewerRef.current = viewer

        if (onCanvasClick) {
          unsubscribeClick = viewer.onClick(onCanvasClick)
        }
      })
      .catch(err => {
        if (!disposed) {
          console.error('[CADViewer] Falha na inicialização:', err)
          setInitError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      disposed = true
      unsubscribeClick?.()
      viewerRef.current?.dispose()
      viewerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const unsub = viewer.onClick(e => onCanvasClick?.(e))
    return unsub
  }, [onCanvasClick])

  // ── loadFile ──────────────────────────────────────────────────────────────
  const loadFile = useCallback(async (file: File): Promise<boolean> => {
    const viewer = viewerRef.current
    if (!viewer) {
      const err = new Error('[CADViewer] Viewer ainda não inicializado.')
      onLoadError?.(err, file.name)
      return false
    }

    return new Promise<boolean>((resolve) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer
        if (!buffer) {
          const err = new Error('FileReader retornou resultado vazio.')
          onLoadError?.(err, file.name)
          resolve(false)
          return
        }

        try {
          const success = await viewer.loadFile(file.name, buffer)
          if (success) {
            onFileLoaded?.(file.name)
          } else {
            const err = new Error(`O viewer não conseguiu abrir "${file.name}". Verifique se é um arquivo DWG ou DXF válido.`)
            onLoadError?.(err, file.name)
          }
          resolve(success)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          onLoadError?.(error, file.name)
          resolve(false)
        }
      }

      reader.onerror = () => {
        const err = new Error(`Falha ao ler o arquivo "${file.name}" com FileReader.`)
        onLoadError?.(err, file.name)
        resolve(false)
      }

      reader.readAsArrayBuffer(file)
    })
  }, [onFileLoaded, onLoadError])

  // ── Imperative Handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    loadFile,
    setPan:     () => viewerRef.current?.setPan(),
    setZoom:    () => viewerRef.current?.setZoom(),
    zoomToFit:  () => viewerRef.current?.zoomToFit(),
    zoomIn:     () => viewerRef.current?.zoomIn(),
    zoomOut:    () => viewerRef.current?.zoomOut(),
    getManager: () => viewerRef.current?.manager ?? null,
    getInstance: () => viewerRef.current ?? null,

    // Camadas
    getLayerSummaries: () => viewerRef.current?.getLayerSummaries() ?? [],
    setLayerOn: (name, on) => viewerRef.current?.setLayerOn(name, on),
    setLayerFrozen: (name, frz) => viewerRef.current?.setLayerFrozen(name, frz),
    setLayerLocked: (name, lck) => viewerRef.current?.setLayerLocked(name, lck),
    isolateLayer: (name) => viewerRef.current?.isolateLayer(name),
    turnAllLayersOn: () => viewerRef.current?.turnAllLayersOn(),
    turnAllLayersOffExceptCurrent: () => viewerRef.current?.turnAllLayersOffExceptCurrent(),
    thawAllLayers: () => viewerRef.current?.thawAllLayers(),

    // Layouts
    getLayouts: () => viewerRef.current?.getLayouts() ?? [{ name: 'Model', isModel: true }],
    setLayout: (name) => viewerRef.current?.setLayout(name),

    // Inspeção e Coordenadas
    pickEntity: (sx, sy) => viewerRef.current?.pickEntity(sx, sy) ?? null,
    screenToWorld: (sx, sy) => viewerRef.current?.screenToWorld(sx, sy) ?? { x: sx, y: sy },
    worldToScreen: (wx, wy) => viewerRef.current?.worldToScreen(wx, wy) ?? { x: wx, y: wy },

    // Medição Nativa WebGL e Snap
    getSnapPoint: (sx, sy, wx, wy) => viewerRef.current?.getSnapPoint(sx, sy, wx, wy) ?? { point: { x: wx, y: wy }, isSnapped: false, snapType: 'none' },
    setSnapIndicator: (pt, isSnapped, snapType) => viewerRef.current?.measurementManager.setSnapIndicator(pt, isSnapped, snapType),
    addMeasurement: (p1, p2) => viewerRef.current?.measurementManager.addMeasurement(p1, p2) ?? null,
    updateMeasurePreview: (p1, p2) => viewerRef.current?.measurementManager.updatePreview(p1, p2),
    clearMeasurePreview: () => viewerRef.current?.measurementManager.clearPreview(),
    removeMeasurement: (id) => viewerRef.current?.measurementManager.removeMeasurement(id),
    clearAllMeasurements: () => viewerRef.current?.measurementManager.clearAll(),
    setMeasurementUnit: (unit) => viewerRef.current?.measurementManager.setUnit(unit),
    getMeasurements: () => viewerRef.current?.measurementManager.getMeasurements() ?? [],
  }), [loadFile])

  return (
    <div ref={containerRef} className={containerClassName} style={{ position: 'relative' }}>
      {initError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#EF4444',
            pointerEvents: 'none',
          }}
        >
          {initError}
        </div>
      )}
    </div>
  )
})

export default CADViewer
