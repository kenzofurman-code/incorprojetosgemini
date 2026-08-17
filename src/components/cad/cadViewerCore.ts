/**
 * cadViewerCore.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Módulo de inicialização e controle do visualizador DWG/DXF.
 *
 * ESCOPO: lógica e inicialização do canvas CAD — expõe uma API imperativa
 * rica para o componente React (CADViewer.tsx / CADPage.tsx):
 * - Gerenciamento de Camadas (Layers)
 * - Layouts (Model Space vs Paper Space)
 * - Coordenadas reais de engenharia (WCS)
 * - Inspeção e picking de entidades
 *
 * Dependência: @mlightcad/cad-simple-viewer
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  AcApDocManager,
  AcEdOpenMode,
  type AcApDocManagerOptions,
  type AcApWebworkerFiles,
  type AcApLayerSummary,
} from '@mlightcad/cad-simple-viewer'
import type { SelectedCADEntity } from './CADEntityDrawer'
import type { CADLayoutItem } from './CADLayoutsBar'

// ─── Worker URLs ──────────────────────────────────────────────────────────────
const WORKER_URLS: AcApWebworkerFiles = {
  dxfParser:   new URL('/cad-workers/dxf-parser-worker.js',    import.meta.url),
  dwgParser:   new URL('/cad-workers/libredwg-parser-worker.js', import.meta.url),
  mtextRender: new URL('/cad-workers/mtext-renderer-worker.js', import.meta.url),
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CADCanvasClickEvent {
  screenX: number
  screenY: number
  worldX: number
  worldY: number
  originalEvent: MouseEvent
}

export type CADClickHandler = (event: CADCanvasClickEvent) => void

export interface CADViewerInstance {
  loadFile: (fileName: string, buffer: ArrayBuffer) => Promise<boolean>
  setPan: () => void
  setZoom: () => void
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  onClick: (handler: CADClickHandler) => () => void
  resize: () => void
  dispose: () => void
  manager: AcApDocManager

  // ── Etapa 2: APIs Avançadas de Camadas, Layouts e Inspeção ──
  getLayerSummaries: () => AcApLayerSummary[]
  setLayerOn: (layerName: string, isOn: boolean) => void
  setLayerFrozen: (layerName: string, isFrozen: boolean) => void
  setLayerLocked: (layerName: string, isLocked: boolean) => void
  isolateLayer: (layerName: string) => void
  turnAllLayersOn: () => void
  turnAllLayersOffExceptCurrent: () => void
  thawAllLayers: () => void
  getLayouts: () => CADLayoutItem[]
  setLayout: (layoutName: string) => void
  pickEntity: (screenX: number, screenY: number) => SelectedCADEntity | null
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }
}

export interface CADViewerInitOptions {
  container: HTMLElement
  background?: number
  autoResize?: boolean
  baseUrl?: string
}

export async function initCADViewer(opts: CADViewerInitOptions): Promise<CADViewerInstance> {
  const {
    container,
    background = 0x1c2b3a,
    autoResize = true,
  } = opts

  // 1. Verificar workers
  const workersOk = await AcApDocManager.checkWebworkerReadiness(WORKER_URLS)
  if (!workersOk) {
    throw new Error(
      '[CADViewer] Workers não encontrados em /cad-workers/. ' +
      'Verifique se os arquivos estão na pasta public/cad-workers/ e que o Vite está servindo-os.'
    )
  }

  // 2. Criar manager
  const managerOptions: AcApDocManagerOptions = {
    container,
    autoResize,
    webworkerFileUrls: WORKER_URLS,
    builtinOpenFileDialog: false,
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const manager = AcApDocManager.createInstance(managerOptions)!
  if (!manager) {
    throw new Error('[CADViewer] AcApDocManager.createInstance() retornou undefined.')
  }

  // 3. Background
  await nextTick()
  const view = manager.curView
  if (view && view.canvas) {
    view.canvas.style.background = `#${background.toString(16).padStart(6, '0')}`
  }

  // 4. Click Handler
  const clickHandlers = new Set<CADClickHandler>()

  function handleCanvasClick(e: MouseEvent) {
    const canvas = manager.curView?.canvas
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    let worldX = screenX
    let worldY = screenY
    const currentView = manager.curView
    if (currentView?.screenToWorld) {
      try {
        const world = currentView.screenToWorld({ x: screenX, y: screenY })
        worldX = world.x
        worldY = world.y
      } catch { /* silence */ }
    }

    const event: CADCanvasClickEvent = { screenX, screenY, worldX, worldY, originalEvent: e }
    clickHandlers.forEach(h => h(event))
  }

  container.addEventListener('click', handleCanvasClick)

  // 5. Scroll Zoom
  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const cmd = e.deltaY < 0 ? 'zoomin' : 'zoomout'
    try {
      manager.sendStringToExecute(cmd)
    } catch { /* silence */ }
  }
  container.addEventListener('wheel', handleWheel, { passive: false })

  // 6. Funções de Carregamento e Navegação
  async function loadFile(fileName: string, buffer: ArrayBuffer): Promise<boolean> {
    const isDxf = fileName.toLowerCase().endsWith('.dxf')
    const virtualFileName = isDxf ? 'model.dxf' : 'model.dwg'
    const doc = manager.curDocument
    let lastError: string | null = null

    const handleProgress = (args: any) => {
      if (args.subStageStatus === 'ERROR') {
        lastError = args.data || 'Erro interno na decodificação do desenho CAD.'
      }
    }

    if (doc?.database?.events?.openProgress?.addEventListener) {
      doc.database.events.openProgress.addEventListener(handleProgress)
    }

    const noopFontLoader = {
      getAvaiableFonts: async () => [],
      load: async () => {},
    }

    try {
      const success = await manager.openDocument(virtualFileName, buffer, {
        mode: AcEdOpenMode.Read,
        progressiveRendering: true,
        fontLoader: noopFontLoader as any,
      })

      if (!success && lastError) {
        throw new Error(lastError)
      }
      return success
    } finally {
      if (doc?.database?.events?.openProgress?.removeEventListener) {
        doc.database.events.openProgress.removeEventListener(handleProgress)
      }
    }
  }

  function setPan() {
    try { manager.sendStringToExecute('pan') } catch { /* silence */ }
  }

  function setZoom() {
    try { manager.sendStringToExecute('zoom') } catch { /* silence */ }
  }

  function zoomToFit() {
    try { manager.sendStringToExecute('zoom e') } catch { /* silence */ }
  }

  function zoomIn() {
    try { manager.sendStringToExecute('zoomin') } catch { /* silence */ }
  }

  function zoomOut() {
    try { manager.sendStringToExecute('zoomout') } catch { /* silence */ }
  }

  function onClick(handler: CADClickHandler): () => void {
    clickHandlers.add(handler)
    return () => clickHandlers.delete(handler)
  }

  function resize() {
    try {
      const v = manager.curView
      if (v) v.isDirty = true
    } catch { /* silence */ }
  }

  // ── Etapa 2: Gerenciador de Camadas (Layers) ────────────────────────────────
  function getLayerSummaries(): AcApLayerSummary[] {
    const doc = manager.curDocument
    if (!doc?.layerService) return []
    try {
      return doc.layerService.getLayerSummaries() || []
    } catch (err) {
      console.warn('[CADViewerCore] getLayerSummaries error:', err)
      return []
    }
  }

  function setLayerOn(layerName: string, isOn: boolean) {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.setLayerOn(layerName, isOn, { switchCurrentLayer: true })
      manager.regen()
    } catch (err) {
      console.warn('[CADViewerCore] setLayerOn error:', err)
    }
  }

  function setLayerFrozen(layerName: string, isFrozen: boolean) {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.setLayerFrozen(layerName, isFrozen, { switchCurrentLayer: true })
      manager.regen()
    } catch (err) {
      console.warn('[CADViewerCore] setLayerFrozen error:', err)
    }
  }

  function setLayerLocked(layerName: string, isLocked: boolean) {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.setLayerLocked(layerName, isLocked)
    } catch (err) {
      console.warn('[CADViewerCore] setLayerLocked error:', err)
    }
  }

  function isolateLayer(layerName: string) {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.isolateSingleLayer(layerName)
      manager.regen()
    } catch (err) {
      console.warn('[CADViewerCore] isolateLayer error:', err)
    }
  }

  function turnAllLayersOn() {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.setAllLayersOn()
      manager.regen()
    } catch (err) {
      console.warn('[CADViewerCore] turnAllLayersOn error:', err)
    }
  }

  function turnAllLayersOffExceptCurrent() {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.setAllLayersOffExceptCurrent()
      manager.regen()
    } catch (err) {
      console.warn('[CADViewerCore] turnAllLayersOffExceptCurrent error:', err)
    }
  }

  function thawAllLayers() {
    const doc = manager.curDocument
    if (!doc?.layerService) return
    try {
      doc.layerService.thawAllLayers()
      manager.regen()
    } catch (err) {
      console.warn('[CADViewerCore] thawAllLayers error:', err)
    }
  }

  // ── Etapa 2: Layouts (Model Space vs Paper Space) ───────────────────────────
  function getLayouts(): CADLayoutItem[] {
    const doc = manager.curDocument
    const layouts: CADLayoutItem[] = [
      { name: 'Model', isModel: true },
    ]
    if (!doc?.database) return layouts

    try {
      // Extrai nomes de layouts se disponíveis
      const db = doc.database as any
      if (db.layoutManager?.layouts) {
        const customLayouts = Object.keys(db.layoutManager.layouts)
        if (customLayouts.length > 0) {
          return customLayouts.map(name => ({
            name,
            isModel: name.toLowerCase() === 'model',
          }))
        }
      }
    } catch { /* fallback to standard model */ }

    return layouts
  }

  function setLayout(layoutName: string) {
    try {
      manager.sendStringToExecute(`layout set ${layoutName}`)
      setTimeout(() => {
        zoomToFit()
      }, 100)
    } catch (err) {
      console.warn('[CADViewerCore] setLayout error:', err)
    }
  }

  // ── Etapa 2: Inspeção de Entidades CAD (Picking) ────────────────────────────
  function pickEntity(screenX: number, screenY: number): SelectedCADEntity | null {
    const v = manager.curView
    const doc = manager.curDocument
    if (!v || !doc) return null

    try {
      const hits = v.pick({ x: screenX, y: screenY }, 12, true)
      if (hits && hits.length > 0) {
        const hit = hits[0]
        const objId = hit.id
        const entity: any = (objId as any)?.open ? (objId as any).open(AcEdOpenMode.Read) : (doc.database as any)?.getObject?.(objId) || objId
        const entityType = entity?.dxfTypeName || entity?.constructor?.name || (objId as any)?.dxfTypeName || 'Entidade CAD'
        const layerName = entity?.layer || (entity?.layerId as any)?.name || '0'
        const handle = entity?.handle || (objId as any)?.handle || ''
        const text = entity?.text || entity?.contents || entity?.plainText || ''
        let length: number | undefined = undefined

        if (typeof entity?.length === 'number') {
          length = entity.length
        } else if (entity?.startPoint && entity?.endPoint) {
          const dx = entity.endPoint.x - entity.startPoint.x
          const dy = entity.endPoint.y - entity.startPoint.y
          length = Math.hypot(dx, dy)
        }

        const box = {
          minX: hit.minX ?? 0,
          minY: hit.minY ?? 0,
          maxX: hit.maxX ?? 0,
          maxY: hit.maxY ?? 0,
        }

        return {
          handle,
          entityType,
          layerName,
          text: text || undefined,
          length,
          box,
        }
      }
    } catch (err) {
      console.warn('[CADViewerCore] pickEntity error:', err)
    }
    return null
  }

  function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const v = manager.curView
    if (v?.screenToWorld) {
      try {
        const pt = v.screenToWorld({ x: screenX, y: screenY })
        return { x: pt.x, y: pt.y }
      } catch { /* silence */ }
    }
    return { x: screenX, y: screenY }
  }

  function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const v = manager.curView
    if (v?.worldToScreen) {
      try {
        const pt = v.worldToScreen({ x: worldX, y: worldY })
        return { x: pt.x, y: pt.y }
      } catch { /* silence */ }
    }
    return { x: worldX, y: worldY }
  }

  function dispose() {
    container.removeEventListener('click', handleCanvasClick)
    container.removeEventListener('wheel', handleWheel)
    clickHandlers.clear()
    try { manager.destroy?.() } catch { /* silence */ }
  }

  return {
    loadFile,
    setPan,
    setZoom,
    zoomToFit,
    zoomIn,
    zoomOut,
    onClick,
    resize,
    dispose,
    manager,
    getLayerSummaries,
    setLayerOn,
    setLayerFrozen,
    setLayerLocked,
    isolateLayer,
    turnAllLayersOn,
    turnAllLayersOffExceptCurrent,
    thawAllLayers,
    getLayouts,
    setLayout,
    pickEntity,
    screenToWorld,
    worldToScreen,
  }
}

function nextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}
