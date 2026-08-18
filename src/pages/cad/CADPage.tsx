/**
 * CADPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página Completa do Visualizador CAD Avançado (DWG / DXF).
 * Integra:
 *  - Gerenciador de Camadas (Layers) com cores oficiais e isolamento
 *  - Alternador de Layouts (Model Space vs Paper Space / Pranchas)
 *  - Ferramenta de Cota e Medição 2D de Alta Precisão (WCS) com seletor de unidades (cm, m, mm)
 *  - Remoção individual de cotas na prancha e na barra de ferramentas
 *  - Criação de Issues com captura automática de screenshot com anotações
 *  - Inspeção de Entidades CAD com Spatial Picking
 *  - Coordenadas de Engenharia em Tempo Real
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useCallback } from 'react'
import {
  Upload, Move, ZoomIn, ZoomOut, Maximize2, MousePointer2, Loader2,
  Layers, Ruler, Info, Trash2, CheckCircle2, AlertCircle, MessageSquarePlus, X
} from 'lucide-react'
import CADViewer, { type CADViewerHandle } from '../../components/cad/CADViewer'
import { PageHeader } from '../../components/ui'
import type { CADCanvasClickEvent } from '../../components/cad/cadViewerCore'
import type { AcApLayerSummary } from '@mlightcad/cad-simple-viewer'
import CADLayersDrawer from '../../components/cad/CADLayersDrawer'
import CADLayoutsBar, { type CADLayoutItem } from '../../components/cad/CADLayoutsBar'
import CADEntityDrawer, { type SelectedCADEntity } from '../../components/cad/CADEntityDrawer'
import CADIssueModal, { type CADPendingIssue, type CADCreatedIssue } from '../../components/cad/CADIssueModal'
import {
  CADMeasurementManager,
  type CADMeasurementItem,
  type CADUnit,
  formatCADDistance
} from '../../components/cad/cadMeasurement'

type CADMode = 'pan' | 'zoom' | 'measure' | 'inspect' | null

/** Captura screenshot combinando o canvas WebGL do CAD e as cotas desenhadas em SVG */
async function captureCADScreenshot(
  canvas: HTMLCanvasElement,
  svgElement?: SVGSVGElement | null
): Promise<string> {
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')

  // 1. Desenha o fundo e a geometria do CAD
  ctx.drawImage(canvas, 0, 0)

  // 2. Se houver cotas desenhadas no SVG, compõe por cima
  if (svgElement) {
    try {
      const svgXml = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(url)
          resolve(true)
        }
        img.onerror = () => resolve(false)
        img.src = url
      })
    } catch (err) {
      console.warn('[CADPage] Erro ao renderizar anotações SVG no screenshot:', err)
    }
  }

  return tempCanvas.toDataURL('image/png')
}

export default function CADPage() {
  const viewerRef = useRef<CADViewerHandle>(null)
  const svgOverlayRef = useRef<SVGSVGElement | null>(null)
  const measurementManagerRef = useRef<CADMeasurementManager>(new CADMeasurementManager())

  const [loadedFile, setLoadedFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastClick, setLastClick] = useState<CADCanvasClickEvent | null>(null)
  const [activeMode, setActiveMode] = useState<CADMode>('pan')

  // Unidade do Desenho CAD
  const [cadUnit, setCadUnit] = useState<CADUnit>('cm') // Centímetros padrão para pranchas brasileiras

  // Camadas (Layers)
  const [layers, setLayers] = useState<AcApLayerSummary[]>([])
  const [showLayersDrawer, setShowLayersDrawer] = useState(false)

  // Layouts (Model vs Paper)
  const [layouts, setLayouts] = useState<CADLayoutItem[]>([{ name: 'Model', isModel: true }])
  const [activeLayout, setActiveLayout] = useState('Model')

  // Inspeção de Entidades
  const [selectedEntity, setSelectedEntity] = useState<SelectedCADEntity | null>(null)
  const [showEntityDrawer, setShowEntityDrawer] = useState(false)

  // Medição 2D
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([])
  const [activeMeasurements, setActiveMeasurements] = useState<CADMeasurementItem[]>([])
  const [currentMouseWorld, setCurrentMouseWorld] = useState<{ x: number; y: number } | null>(null)
  const [, setRenderTick] = useState(0)

  // Issues do CAD
  const [pendingIssue, setPendingIssue] = useState<CADPendingIssue | null>(null)
  const [, setIssues] = useState<CADCreatedIssue[]>([])
  const [issueToast, setIssueToast] = useState<string | null>(null)

  // Atualiza tabela de camadas e layouts após abrir arquivo
  const refreshMetadata = useCallback(() => {
    if (!viewerRef.current) return
    setTimeout(() => {
      const summaries = viewerRef.current?.getLayerSummaries() || []
      setLayers(summaries)

      const docLayouts = viewerRef.current?.getLayouts() || [{ name: 'Model', isModel: true }]
      setLayouts(docLayouts)
    }, 400)
  }, [])

  const triggerRedraw = useCallback(() => {
    setRenderTick(t => t + 1)
  }, [])

  // ── Handlers de arquivo ──────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsLoading(true)
    measurementManagerRef.current.clearAll()
    setActiveMeasurements([])
    setMeasurePoints([])
    setSelectedEntity(null)

    await viewerRef.current?.loadFile(file)
    setIsLoading(false)
    e.target.value = ''
  }

  // ── Handler de clique no canvas ──────────────────────────────────────────
  const handleCanvasClick = useCallback((evt: CADCanvasClickEvent) => {
    setLastClick(evt)
    triggerRedraw()

    // MODO: INSPECT (Picking de entidade)
    if (activeMode === 'inspect') {
      const entity = viewerRef.current?.pickEntity(evt.screenX, evt.screenY)
      if (entity) {
        setSelectedEntity(entity)
        setShowEntityDrawer(true)
        setShowLayersDrawer(false)
      }
      return
    }

    // MODO: MEASURE (Cota 2D ponto a ponto)
    if (activeMode === 'measure') {
      const clickPoint = { x: evt.worldX, y: evt.worldY }
      if (measurePoints.length === 0) {
        setMeasurePoints([clickPoint])
      } else {
        const p1 = measurePoints[0]
        measurementManagerRef.current.addMeasurement(p1, clickPoint)
        setActiveMeasurements([...measurementManagerRef.current.getMeasurements()])
        setMeasurePoints([])
      }
      return
    }
  }, [activeMode, measurePoints, triggerRedraw])

  // ── Handlers de Camadas (Layers) ─────────────────────────────────────────
  const handleToggleLayerOn = (layerName: string, currentlyOn: boolean) => {
    viewerRef.current?.setLayerOn(layerName, !currentlyOn)
    refreshMetadata()
  }

  const handleToggleLayerFrozen = (layerName: string, currentlyFrozen: boolean) => {
    viewerRef.current?.setLayerFrozen(layerName, !currentlyFrozen)
    refreshMetadata()
  }

  const handleToggleLayerLocked = (layerName: string, currentlyLocked: boolean) => {
    viewerRef.current?.setLayerLocked(layerName, !currentlyLocked)
    refreshMetadata()
  }

  const handleIsolateLayer = (layerName: string) => {
    viewerRef.current?.isolateLayer(layerName)
    refreshMetadata()
  }

  const handleTurnAllOn = () => {
    viewerRef.current?.turnAllLayersOn()
    refreshMetadata()
  }

  const handleTurnAllOffExceptCurrent = () => {
    viewerRef.current?.turnAllLayersOffExceptCurrent()
    refreshMetadata()
  }

  const handleThawAll = () => {
    viewerRef.current?.thawAllLayers()
    refreshMetadata()
  }

  // ── Handlers de Layout ───────────────────────────────────────────────────
  const handleSelectLayout = (layoutName: string) => {
    setActiveLayout(layoutName)
    viewerRef.current?.setLayout(layoutName)
  }

  // ── Handlers de Medições / Cotas ─────────────────────────────────────────
  const handleDeleteCota = (id: string) => {
    measurementManagerRef.current.removeMeasurement(id)
    setActiveMeasurements([...measurementManagerRef.current.getMeasurements()])
    triggerRedraw()
  }

  const handleClearAllCotas = () => {
    measurementManagerRef.current.clearAll()
    setActiveMeasurements([])
    setMeasurePoints([])
    triggerRedraw()
  }

  // ── Handler de Criação de Issue ──────────────────────────────────────────
  const handleStartCreateIssue = async () => {
    const manager = viewerRef.current?.getManager()
    const canvas = manager?.curView?.canvas
    if (!canvas) {
      alert('Abra um desenho CAD antes de criar uma issue.')
      return
    }

    try {
      const screenshot = await captureCADScreenshot(canvas, svgOverlayRef.current)
      setPendingIssue({
        screenshotDataUrl: screenshot,
        fileName: loadedFile || 'desenho.dwg',
        title: selectedEntity ? `Revisão: ${selectedEntity.entityType} (Layer ${selectedEntity.layerName})` : '',
        category: 'conflito_projeto',
        priority: 'alta',
      })
    } catch (err) {
      console.error('[CADPage] Erro ao capturar screenshot:', err)
      alert('Erro ao capturar screenshot da prancha CAD.')
    }
  }

  const handleConfirmIssue = (issue: CADCreatedIssue) => {
    setIssues(prev => [issue, ...prev])
    setPendingIssue(null)
    setIssueToast(`Issue "${issue.title}" registrada com sucesso!`)
    setTimeout(() => setIssueToast(null), 3500)
  }

  // ── Toolbar helpers ───────────────────────────────────────────────────────
  function activatePan() {
    setActiveMode('pan')
    viewerRef.current?.setPan()
  }

  function activateZoom() {
    setActiveMode('zoom')
    viewerRef.current?.setZoom()
  }

  function activateMeasure() {
    setActiveMode('measure')
    setMeasurePoints([])
  }

  function activateInspect() {
    setActiveMode('inspect')
    setShowEntityDrawer(true)
    setShowLayersDrawer(false)
  }

  // Captura movimento do mouse para preview da medição
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMode === 'measure' && viewerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const world = viewerRef.current.screenToWorld(screenX, screenY)
      setCurrentMouseWorld(world)
      triggerRedraw()
    }
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <PageHeader
        title="Visualizador CAD Avançado (DWG / DXF)"
        subtitle="Visualização técnica com gerenciador de layers, layouts de prancha, cotas e criação de issues"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreateIssue}
              disabled={!loadedFile || isLoading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--orange), #c2410c)' }}
              title="Capturar frame da prancha e abrir formulário de Issue"
            >
              <MessageSquarePlus size={15} />
              CRIAR ISSUE CAD
            </button>

            <label
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-md active:scale-95 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <Upload size={14} />
              {isLoading ? 'Carregando...' : 'Abrir DWG / DXF'}
              <input
                type="file"
                accept=".dwg,.dxf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>
          </div>
        }
      />

      {/* ── Toast de confirmação de Issue ─────────────────────────────────── */}
      {issueToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{issueToast}</span>
        </div>
      )}

      {/* ── Toolbar de controles ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900/60 p-2 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Navegação */}
          <button
            onClick={activatePan}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
              activeMode === 'pan'
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Pan: arrastar para navegar"
          >
            <Move size={14} />
            <span>Pan</span>
          </button>

          <button
            onClick={activateZoom}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
              activeMode === 'zoom'
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Zoom por janela"
          >
            <ZoomIn size={14} />
            <span>Zoom Janela</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Medição 2D */}
          <button
            onClick={activateMeasure}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
              activeMode === 'measure'
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Modo Medir Cota 2D"
          >
            <Ruler size={14} />
            <span>Medir Cota</span>
          </button>

          {/* Inspecionar Entidade */}
          <button
            onClick={activateInspect}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
              activeMode === 'inspect'
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Inspecionar elementos clicados"
          >
            <Info size={14} />
            <span>Inspecionar</span>
          </button>

          {/* Gerenciador de Camadas */}
          <button
            onClick={() => {
              setShowLayersDrawer(p => !p)
              setShowEntityDrawer(false)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
              showLayersDrawer
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Abrir Gerenciador de Camadas (Layers)"
          >
            <Layers size={14} />
            <span>Camadas ({layers.length})</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Zoom Steps */}
          <button
            onClick={() => viewerRef.current?.zoomIn()}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Aproximar Zoom"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => viewerRef.current?.zoomOut()}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Afastar Zoom"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => {
              viewerRef.current?.zoomToFit()
              setActiveMode('pan')
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-xs font-medium"
            title="Enquadrar desenho no centro"
          >
            <Maximize2 size={14} />
            <span>Enquadrar</span>
          </button>
        </div>

        {/* Status / File Name */}
        <div className="flex items-center gap-2">
          {loadedFile && (
            <span className="text-xs px-2.5 py-1 rounded-xl font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> {loadedFile}
            </span>
          )}

          {error && (
            <span className="text-xs px-2.5 py-1 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
              <AlertCircle size={13} /> {error}
            </span>
          )}
        </div>
      </div>

      {/* ── Canvas do viewer ─────────────────────────────────────────────── */}
      <div
        className="flex-1 rounded-2xl overflow-hidden relative flex items-center justify-center bg-[#0f1923] border border-slate-800 shadow-2xl"
        onMouseMove={handleCanvasMouseMove}
        style={{ minHeight: 520 }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-[#0f1923]/90 backdrop-blur-sm flex flex-col items-center justify-center z-40">
            <Loader2 className="animate-spin text-orange-500 mb-3" size={40} />
            <span className="text-sm font-semibold text-white">Processando desenho CAD e camadas...</span>
            <span className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos dependendo da complexidade</span>
          </div>
        )}

        {/* Banner Modo Medir Ativo com Seletor de Unidades e Lista de Cotas */}
        {activeMode === 'measure' && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl text-xs z-30 text-white backdrop-blur-md flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Ruler size={15} className="text-orange-400" />
                <span className="font-bold">Modo Medição:</span>
                <span className="text-slate-300">
                  {measurePoints.length === 0 ? 'Clique no 1º ponto' : 'Clique no 2º ponto para fechar'}
                </span>
              </div>

              {/* Seletor de Unidade */}
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Escala:</span>
                <button
                  onClick={() => { setCadUnit('cm'); triggerRedraw() }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                    cadUnit === 'cm' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="1 unidade CAD = 1 centímetro (padrão Brasil)"
                >
                  cm (Centímetros)
                </button>
                <button
                  onClick={() => { setCadUnit('m'); triggerRedraw() }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                    cadUnit === 'm' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="1 unidade CAD = 1 metro"
                >
                  m (Metros)
                </button>
                <button
                  onClick={() => { setCadUnit('mm'); triggerRedraw() }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                    cadUnit === 'mm' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="1 unidade CAD = 1 milímetro"
                >
                  mm (Milímetros)
                </button>
              </div>
            </div>

            {/* Lista de cotas ativas com botão individual de exclusão */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeMeasurements.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-[11px] font-mono text-orange-400"
                >
                  <span>#{idx + 1}: {formatCADDistance(m.rawDistance, cadUnit)}</span>
                  <button
                    onClick={() => handleDeleteCota(m.id)}
                    className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Apagar esta cota"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {activeMeasurements.length > 0 && (
                <button
                  onClick={handleClearAllCotas}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={12} /> Limpar Todas
                </button>
              )}
            </div>
          </div>
        )}

        {/* SVG Overlay para desenho das linhas de cota 2D */}
        {viewerRef.current && (activeMeasurements.length > 0 || measurePoints.length > 0) && (
          <svg
            id="cad-measure-svg"
            ref={svgOverlayRef}
            className="absolute inset-0 pointer-events-none z-20 w-full h-full"
          >
            <defs>
              <marker id="cad-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
              </marker>
            </defs>

            {/* Medições confirmadas */}
            {activeMeasurements.map((m, idx) => {
              const p1Screen = viewerRef.current?.worldToScreen(m.startWorld.x, m.startWorld.y)
              const p2Screen = viewerRef.current?.worldToScreen(m.endWorld.x, m.endWorld.y)
              if (!p1Screen || !p2Screen) return null

              const midX = (p1Screen.x + p2Screen.x) / 2
              const midY = (p1Screen.y + p2Screen.y) / 2
              const label = formatCADDistance(m.rawDistance, cadUnit)

              return (
                <g key={m.id} className="pointer-events-auto">
                  {/* Linha da cota */}
                  <line
                    x1={p1Screen.x}
                    y1={p1Screen.y}
                    x2={p2Screen.x}
                    y2={p2Screen.y}
                    stroke="#f97316"
                    strokeWidth="2.5"
                    markerStart="url(#cad-arrow)"
                    markerEnd="url(#cad-arrow)"
                  />
                  {/* Marcadores pontuais */}
                  <circle cx={p1Screen.x} cy={p1Screen.y} r="4.5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={p2Screen.x} cy={p2Screen.y} r="4.5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />

                  {/* Etiqueta da distância com botão de exclusão */}
                  <g transform={`translate(${midX}, ${midY - 14})`}>
                    <rect
                      x="-48"
                      y="-12"
                      width="96"
                      height="24"
                      rx="8"
                      fill="#0f1923"
                      stroke="#f97316"
                      strokeWidth="1.5"
                      className="shadow-lg"
                    />
                    <text
                      x="-8"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {label}
                    </text>
                    {/* Botão X para apagar esta cota diretamente no desenho */}
                    <g
                      transform="translate(36, 0)"
                      className="cursor-pointer"
                      onClick={() => handleDeleteCota(m.id)}
                    >
                      <circle cx="0" cy="0" r="7" fill="#ef4444" opacity="0.9" />
                      <line x1="-3" y1="-3" x2="3" y2="3" stroke="#ffffff" strokeWidth="1.5" />
                      <line x1="3" y1="-3" x2="-3" y2="3" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  </g>
                </g>
              )
            })}

            {/* Preview dinâmico do 1º ponto até o cursor atual */}
            {measurePoints.length > 0 && currentMouseWorld && (
              (() => {
                const p1Screen = viewerRef.current?.worldToScreen(measurePoints[0].x, measurePoints[0].y)
                const p2Screen = viewerRef.current?.worldToScreen(currentMouseWorld.x, currentMouseWorld.y)
                if (!p1Screen || !p2Screen) return null

                const dx = currentMouseWorld.x - measurePoints[0].x
                const dy = currentMouseWorld.y - measurePoints[0].y
                const rawDist = Math.hypot(dx, dy)
                const midX = (p1Screen.x + p2Screen.x) / 2
                const midY = (p1Screen.y + p2Screen.y) / 2
                const label = formatCADDistance(rawDist, cadUnit)

                return (
                  <g>
                    <line
                      x1={p1Screen.x}
                      y1={p1Screen.y}
                      x2={p2Screen.x}
                      y2={p2Screen.y}
                      stroke="#f97316"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <circle cx={p1Screen.x} cy={p1Screen.y} r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={p2Screen.x} cy={p2Screen.y} r="4" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect
                        x="-48"
                        y="-12"
                        width="96"
                        height="24"
                        rx="8"
                        fill="#0f1923"
                        stroke="#f97316"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {label}
                      </text>
                    </g>
                  </g>
                )
              })()
            )}
          </svg>
        )}

        {/* Placeholder quando nenhum arquivo está aberto */}
        {!loadedFile && !isLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4"
            style={{ background: 'rgba(15,25,35,0.92)', backdropFilter: 'blur(6px)' }}
          >
            <div className="flex flex-col items-center gap-3 p-8 rounded-3xl w-full max-w-sm bg-slate-900/90 border border-slate-800 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-white">
                  Carregar desenho DWG/DXF
                </div>
                <div className="text-xs mt-1 text-slate-400">
                  Visualização de plantas baixas, cortes e pranchas completas
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full mt-3">
                <label
                  className="text-center text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-all hover:opacity-90 active:scale-95 block text-white shadow-lg shadow-orange-500/20"
                  style={{ background: 'linear-gradient(135deg, var(--orange), #c2410c)' }}
                >
                  Selecionar arquivo do computador
                  <input
                    type="file"
                    accept=".dwg,.dxf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null)
                    setIsLoading(true)
                    try {
                      const res = await fetch('/test-files/test.dwg')
                      if (!res.ok) throw new Error('Não foi possível obter o arquivo de teste no servidor.')
                      const blob = await res.blob()
                      const file = new File([blob], '035-EX-HID-0000-COR-ESQUEMÁTICO_ESGOTO_SECAO_A-R00.dwg', { type: 'application/octet-stream' })
                      await viewerRef.current?.loadFile(file)
                    } catch (err) {
                      setError(`Erro: ${err instanceof Error ? err.message : String(err)}`)
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                  className="text-xs px-4 py-2.5 rounded-xl font-semibold border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 cursor-pointer transition-all block w-full"
                >
                  Carregar Prancha de Teste DWG
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visualizador CAD */}
        <CADViewer
          ref={viewerRef}
          containerClassName="w-full h-full"
          background={0x0f1923}
          onFileLoaded={name => {
            setLoadedFile(name)
            refreshMetadata()
          }}
          onLoadError={(err, name) => setError(`Erro ao abrir "${name}": ${err.message}`)}
          onCanvasClick={handleCanvasClick}
        />

        {/* Barra Inferior de Layouts (Model Space vs Paper Space) */}
        {loadedFile && (
          <CADLayoutsBar
            layouts={layouts}
            activeLayout={activeLayout}
            onSelectLayout={handleSelectLayout}
          />
        )}

        {/* Gaveta de Camadas (Layers) */}
        {showLayersDrawer && (
          <CADLayersDrawer
            layers={layers}
            onToggleLayerOn={handleToggleLayerOn}
            onToggleLayerFrozen={handleToggleLayerFrozen}
            onToggleLayerLocked={handleToggleLayerLocked}
            onIsolateLayer={handleIsolateLayer}
            onTurnAllOn={handleTurnAllOn}
            onTurnAllOffExceptCurrent={handleTurnAllOffExceptCurrent}
            onThawAll={handleThawAll}
            onClose={() => setShowLayersDrawer(false)}
          />
        )}

        {/* Gaveta de Inspeção de Entidade */}
        {showEntityDrawer && (
          <CADEntityDrawer
            entity={selectedEntity}
            onClose={() => setShowEntityDrawer(false)}
          />
        )}

        {/* Modal de Criação de Issue CAD */}
        {pendingIssue && (
          <CADIssueModal
            pending={pendingIssue}
            onConfirm={handleConfirmIssue}
            onCancel={() => setPendingIssue(null)}
          />
        )}
      </div>

      {/* ── Barra de Status e Coordenadas ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MousePointer2 size={13} className="text-orange-400" />
            <span>Coordenadas WCS:</span>
            <span className="text-orange-400 font-bold">
              {lastClick ? `X=${lastClick.worldX.toFixed(3)}, Y=${lastClick.worldY.toFixed(3)}` : 'X=0.000, Y=0.000'}
            </span>
          </div>

          {lastClick && (
            <span className="text-slate-500 text-[11px]">
              (Pixel: {lastClick.screenX.toFixed(0)}px, {lastClick.screenY.toFixed(0)}px)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>Escala: <strong className="text-white uppercase">{cadUnit}</strong></span>
          <span>•</span>
          <span>Modo: <strong className="text-slate-300 uppercase">{activeMode || 'Navegar'}</strong></span>
          <span>•</span>
          <span>Layout: <strong className="text-orange-400">{activeLayout}</strong></span>
        </div>
      </div>
    </div>
  )
}
