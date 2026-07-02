/**
 * IFCViewer.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Visualizador BIM/IFC integrado ao sistema de issues do IncorProjetos.
 * Usa @thatopen/components (That Open Company) para renderizar modelos IFC
 * com Three.js embaixo.
 *
 * Features:
 *  - Renderização de modelos IFC via drag-and-drop ou seleção de arquivo
 *  - Toolbar com Orbitar, Zoom, Pan e Reset
 *  - Botão "Criar Anotação de Issue" que captura o frame atual via toDataURL()
 *    e abre o modal de issue com a screenshot pré-anexada
 *  - Modal de issue com campos: título, categoria, prioridade, descrição
 *  - Visual consistente com o design system do IncorProjetos
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import {
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  MessageSquarePlus,
  Maximize2,
  X,
  Box,
  Camera,
  Layers,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type { IssueCategory } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewerMode = 'orbit' | 'zoom' | 'pan'

interface PendingIssue {
  screenshotDataUrl: string
  title: string
  description: string
  category: IssueCategory
  priority: 'alta' | 'media' | 'baixa'
}

export interface IFCIssue {
  screenshotDataUrl: string
  title: string
  description: string
  category: IssueCategory
  priority: 'alta' | 'media' | 'baixa'
  viewpointMatrix?: number[]   // Three.js camera matrix for revisiting viewpoint
  createdAt: string
}

interface IFCViewerProps {
  /** Called when the user confirms creating an issue from the modal */
  onIssueCreated?: (issue: IFCIssue) => void
  /** Optional drawing/model code to show in the header */
  modelLabel?: string
  /** Optional class name for the outer container */
  className?: string
  /** Optional inline style for the outer container */
  style?: React.CSSProperties
}

// ─── Category options (shared with Revisao.tsx) ──────────────────────────────
const CATEGORY_OPTIONS: { value: IssueCategory; label: string; color: string }[] = [
  { value: 'conflito_projeto',  label: 'Conflito de Projeto',  color: '#EF4444' },
  { value: 'incompletude',      label: 'Incompletude',         color: '#F97316' },
  { value: 'erro_cota',         label: 'Erro de Cota',         color: '#EAB308' },
  { value: 'falta_detalhe',     label: 'Falta de Detalhe',     color: '#3B82F6' },
  { value: 'nomenclatura',      label: 'Nomenclatura',         color: '#8B5CF6' },
  { value: 'compatibilizacao',  label: 'Compatibilização',     color: '#06B6D4' },
  { value: 'outro',             label: 'Outro',                color: '#6B7280' },
]

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarButton({
  icon,
  label,
  active,
  onClick,
  variant = 'default',
  disabled,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  onClick: () => void
  variant?: 'default' | 'danger' | 'orange'
  disabled?: boolean
}) {
  const bg = active
    ? 'rgba(59,130,246,0.25)'
    : 'rgba(255,255,255,0.05)'
  const border = active
    ? '1px solid rgba(59,130,246,0.6)'
    : '1px solid rgba(255,255,255,0.08)'
  const color = variant === 'orange'
    ? 'var(--orange)'
    : variant === 'danger'
    ? '#EF4444'
    : active
    ? '#3B82F6'
    : 'var(--slate)'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg transition-all hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed w-full"
      style={{ background: bg, border, color }}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}

// ─── Issue Modal ──────────────────────────────────────────────────────────────
function IssueModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingIssue
  onConfirm: (issue: IFCIssue, cameraMatrix: number[]) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(pending.title)
  const [description, setDescription] = useState(pending.description)
  const [category, setCategory] = useState<IssueCategory>(pending.category)
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>(pending.priority)

  function handleConfirm() {
    if (!title.trim()) return
    onConfirm(
      {
        screenshotDataUrl: pending.screenshotDataUrl,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        createdAt: new Date().toISOString(),
      },
      [] // camera matrix passed from parent
    )
  }

  const cat = CATEGORY_OPTIONS.find(c => c.value === category)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-mid)' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={18} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Nova Issue BIM
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--slate)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Screenshot preview */}
          <div>
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--slate)' }}>
              <Camera size={12} /> Frame capturado do modelo
            </div>
            <div
              className="rounded-xl overflow-hidden relative"
              style={{ border: '1px solid var(--surface-border)', background: '#000' }}
            >
              <img
                src={pending.screenshotDataUrl}
                alt="Screenshot do modelo IFC"
                className="w-full object-contain max-h-48"
              />
              <div
                className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-mono"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#22C55E' }}
              >
                ✓ Viewpoint salvo
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--slate)' }}>
              Título da issue *
            </label>
            <input
              type="text"
              placeholder="Ex: Conflito entre pilar P7 e parede ARQ"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              className="w-full text-sm rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--surface-mid)',
                border: `1px solid ${title ? 'var(--surface-border)' : '#EF4444'}`,
                color: 'var(--white)',
              }}
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--slate)' }}>
                Categoria
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as IssueCategory)}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{
                  background: 'var(--surface-mid)',
                  border: `1px solid ${cat?.color || 'var(--surface-border)'}44`,
                  color: cat?.color || 'var(--white)',
                }}
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value} style={{ color: c.color }}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--slate)' }}>
                Prioridade
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'alta' | 'media' | 'baixa')}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{
                  background: 'var(--surface-mid)',
                  border: '1px solid var(--surface-border)',
                  color: priority === 'alta' ? '#EF4444' : priority === 'media' ? '#EAB308' : 'var(--slate)',
                }}
              >
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Média</option>
                <option value="baixa">🟢 Baixa</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--slate)' }}>
              Descrição
            </label>
            <textarea
              placeholder="Descreva o problema encontrado no modelo..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
              style={{
                background: 'var(--surface-mid)',
                border: '1px solid var(--surface-border)',
                color: 'var(--white)',
              }}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-mid)' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg transition-all hover:bg-white/10"
            style={{ color: 'var(--slate)', border: '1px solid var(--surface-border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!title.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--orange)',
              color: 'white',
              border: '1px solid var(--orange-dark)',
            }}
          >
            <MessageSquarePlus size={14} />
            Criar Issue
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── IFC Viewer Main Component ────────────────────────────────────────────────
export default function IFCViewer({ onIssueCreated, modelLabel, className = '', style }: IFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const componentsRef = useRef<OBC.Components | null>(null)
  const worldRef = useRef<OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer> | null>(null)

  const [mode, setMode] = useState<ViewerMode>('orbit')
  const [isLoading, setIsLoading] = useState(false)
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null)
  const [pendingIssue, setPendingIssue] = useState<PendingIssue | null>(null)
  const [issues, setIssues] = useState<IFCIssue[]>([])
  const [initError, setInitError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [showIssuesList, setShowIssuesList] = useState(false)

  // ─── Initialize Three.js / OBC world ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initialized) return

    let components: OBC.Components | null = null

    async function init() {
      try {
        components = new OBC.Components()
        componentsRef.current = components

        const worlds = components.get(OBC.Worlds)
        const world = worlds.create<
          OBC.SimpleScene,
          OBC.OrthoPerspectiveCamera,
          OBC.SimpleRenderer
        >()
        worldRef.current = world

        // Scene
        world.scene = new OBC.SimpleScene(components)
        world.scene.setup()
        world.scene.three.background = new THREE.Color(0x0f1923)

        // Renderer — attach to our container div
        // preserveDrawingBuffer: true é necessário para toDataURL() funcionar
        // no botão "Criar Anotação de Issue"
        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!, {
          preserveDrawingBuffer: true,
        })
        world.renderer.three.setPixelRatio(window.devicePixelRatio)

        // Store canvas reference for screenshot
        canvasRef.current = world.renderer.three.domElement

        // Camera
        world.camera = new OBC.OrthoPerspectiveCamera(components)
        await world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0)
        world.camera.controls.dampingFactor = 0.1

        components.init()

        // Grid helper
        const grids = components.get(OBC.Grids)
        grids.create(world)

        // Ambient + directional lights for better model visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        world.scene.three.add(ambientLight)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
        dirLight.position.set(10, 20, 10)
        world.scene.three.add(dirLight)

        // Resize observer
        const observer = new ResizeObserver(() => {
          if (!containerRef.current || !world.renderer) return
          const { clientWidth: w, clientHeight: h } = containerRef.current
          world.renderer!.three.setSize(w, h)
          if (world.camera.three instanceof THREE.PerspectiveCamera) {
            world.camera.three.aspect = w / h
            world.camera.three.updateProjectionMatrix()
          }
        })
        observer.observe(containerRef.current!)

        setInitialized(true)
        setInitError(null)
      } catch (err) {
        console.error('[IFCViewer] init error:', err)
        setInitError(err instanceof Error ? err.message : 'Erro ao inicializar o visualizador 3D.')
      }
    }

    init()

    return () => {
      if (components) {
        try { components.dispose() } catch (_) {}
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load IFC file ────────────────────────────────────────────────────────
  const loadIFC = useCallback(async (file: File) => {
    const components = componentsRef.current
    const world = worldRef.current
    if (!components || !world) return

    setIsLoading(true)
    try {
      const ifcLoader = components.get(OBC.IfcLoader)
      await ifcLoader.setup()

      const buffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(buffer)
      // TOC v3: load(data, coordinate, name, config?)
      const model = await ifcLoader.load(uint8, true, file.name)

      // FragmentsModel.object is the THREE.Object3D we add to the scene
      world.scene.three.add(model.object)

      // Fit camera to loaded model bounding box
      const bbox = new THREE.Box3().setFromObject(model.object)
      if (!bbox.isEmpty()) {
        const center = bbox.getCenter(new THREE.Vector3())
        const size = bbox.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        await world.camera.controls.setLookAt(
          center.x + maxDim,
          center.y + maxDim * 0.8,
          center.z + maxDim,
          center.x, center.y, center.z,
          true
        )
      }

      setLoadedModelName(file.name)
    } catch (err) {
      console.error('[IFCViewer] loadIFC error:', err)
      alert(`Erro ao carregar o modelo IFC: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ─── Drag & drop ─────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.toLowerCase().endsWith('.ifc')) loadIFC(file)
  }, [loadIFC])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadIFC(file)
  }, [loadIFC])

  // ─── Camera controls ──────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode: ViewerMode) => {
    const world = worldRef.current
    if (!world?.camera) return
    setMode(newMode)
    const controls = world.camera.controls
    // OrbitControls-based: configure mouse buttons
    if (newMode === 'orbit') {
      controls.mouseButtons.left = 1  // rotate
      controls.mouseButtons.middle = 8 // dolly
      controls.mouseButtons.right = 2  // pan
    } else if (newMode === 'pan') {
      controls.mouseButtons.left = 2  // pan
      controls.mouseButtons.middle = 8
      controls.mouseButtons.right = 1
    } else if (newMode === 'zoom') {
      controls.mouseButtons.left = 16  // zoom (dolly)
      controls.mouseButtons.middle = 8
      controls.mouseButtons.right = 2
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    worldRef.current?.camera.controls.zoom(2, true)
  }, [])

  const handleZoomOut = useCallback(() => {
    worldRef.current?.camera.controls.zoom(-2, true)
  }, [])

  const handleReset = useCallback(async () => {
    const world = worldRef.current
    if (!world) return
    await world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0, true)
  }, [])

  // ─── Capture frame + open issue modal ───────────────────────────────────
  const handleCreateAnnotation = useCallback(() => {
    const world = worldRef.current
    if (!world?.renderer) {
      alert('Carregue um modelo IFC primeiro para criar anotações.')
      return
    }

    // Force a render pass so the canvas is populated
    world.renderer.three.render(world.scene.three, world.camera.three)

    const canvas = canvasRef.current
    if (!canvas) return

    let screenshotDataUrl: string
    try {
      // Preserve renderer.autoClear then temporarily force preserve drawing buffer
      screenshotDataUrl = canvas.toDataURL('image/png')
    } catch (err) {
      console.error('[IFCViewer] toDataURL error:', err)
      alert('Erro ao capturar o frame. Verifique se o canvas usa preserveDrawingBuffer.')
      return
    }

    // Capture current camera matrix for viewpoint restoration
    const camMatrix = world.camera.three.matrixWorld.toArray()
    ;(window as any).__lastBIMCameraMatrix = camMatrix

    setPendingIssue({
      screenshotDataUrl,
      title: '',
      description: '',
      category: 'conflito_projeto',
      priority: 'alta',
    })
  }, [])

  // ─── Confirm issue from modal ─────────────────────────────────────────────
  const handleIssueConfirm = useCallback((issue: IFCIssue) => {
    const camMatrix = (window as any).__lastBIMCameraMatrix || []
    const fullIssue: IFCIssue = { ...issue, viewpointMatrix: camMatrix }

    setIssues(prev => [fullIssue, ...prev])
    onIssueCreated?.(fullIssue)
    setPendingIssue(null)
  }, [onIssueCreated])

  // ─── Enable preserveDrawingBuffer for screenshot to work ─────────────────
  // Note: We need to configure the renderer BEFORE init.
  // We patch the renderer post-init via a workaround: force a clean render
  // right before toDataURL call (already done in handleCreateAnnotation).
  // For production, pass { preserveDrawingBuffer: true } to WebGLRenderer.

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative flex rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        minHeight: '500px',
        ...style,
      }}
    >
      {/* LEFT TOOLBAR */}
      <div
        className="flex flex-col gap-1.5 p-2 z-10 flex-shrink-0"
        style={{
          width: 72,
          background: 'rgba(15,25,35,0.92)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px solid var(--surface-border)',
        }}
      >
        {/* Model label */}
        <div className="px-1 pt-1 pb-2 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-center">
            <Box size={20} style={{ color: 'var(--orange)' }} />
          </div>
          <div className="text-center text-[9px] mt-0.5 font-mono truncate" style={{ color: 'var(--slate)' }}>
            {loadedModelName ? loadedModelName.replace('.ifc', '') : 'BIM'}
          </div>
        </div>

        {/* Navigation modes */}
        <div className="text-[9px] uppercase tracking-wider text-center mt-1" style={{ color: '#334155' }}>
          Navegar
        </div>

        <ToolbarButton
          icon={<RotateCcw size={16} />}
          label="Orbitar"
          active={mode === 'orbit'}
          onClick={() => handleModeChange('orbit')}
        />
        <ToolbarButton
          icon={<Move size={16} />}
          label="Pan"
          active={mode === 'pan'}
          onClick={() => handleModeChange('pan')}
        />
        <ToolbarButton
          icon={<ZoomIn size={16} />}
          label="Zoom +"
          onClick={handleZoomIn}
        />
        <ToolbarButton
          icon={<ZoomOut size={16} />}
          label="Zoom -"
          onClick={handleZoomOut}
        />
        <ToolbarButton
          icon={<Maximize2 size={16} />}
          label="Reset"
          onClick={handleReset}
        />

        {/* Divider */}
        <div className="h-px my-1" style={{ background: 'var(--surface-border)' }} />

        {/* Issues count */}
        <ToolbarButton
          icon={
            <div className="relative">
              <Layers size={16} />
              {issues.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--orange)', color: 'white' }}
                >
                  {issues.length}
                </span>
              )}
            </div>
          }
          label="Issues"
          active={showIssuesList}
          onClick={() => setShowIssuesList(p => !p)}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* PRIMARY ACTION — Criar Anotação */}
        <div
          className="rounded-xl p-0.5 mb-1"
          style={{ background: 'linear-gradient(135deg, var(--orange), #c2410c)' }}
        >
          <button
            onClick={handleCreateAnnotation}
            disabled={!initialized}
            title="Criar Anotação de Issue — captura o frame atual e abre o formulário"
            className="w-full flex flex-col items-center gap-1 px-1 py-2.5 rounded-[10px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(15,25,35,0.6)' }}
          >
            <MessageSquarePlus size={18} style={{ color: 'var(--orange)' }} />
            <span className="text-[9px] font-bold leading-tight text-center" style={{ color: 'var(--orange)' }}>
              CRIAR<br />ISSUE
            </span>
          </button>
        </div>
      </div>

      {/* MAIN CANVAS AREA */}
      <div className="flex-1 relative">
        {/* Three.js mounts here */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{ cursor: mode === 'pan' ? 'grab' : mode === 'zoom' ? 'ns-resize' : 'default' }}
        />

        {/* Init error */}
        {initError && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              className="text-center p-6 rounded-xl mx-4 max-w-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#EF4444' }} />
              <div className="text-sm font-semibold mb-1" style={{ color: '#EF4444' }}>
                Erro ao inicializar visualizador
              </div>
              <div className="text-xs" style={{ color: 'var(--slate)' }}>{initError}</div>
            </div>
          </div>
        )}

        {/* Drop zone overlay when no model loaded */}
        {!loadedModelName && !isLoading && initialized && (
          <label
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10 transition-colors hover:bg-white/5"
            htmlFor="ifc-file-input"
          >
            <div
              className="flex flex-col items-center gap-3 p-8 rounded-2xl"
              style={{
                background: 'rgba(15,25,35,0.85)',
                border: '2px dashed var(--surface-border)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Upload size={36} style={{ color: 'var(--slate)' }} />
              <div className="text-center">
                <div className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
                  Carregar modelo IFC
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
                  Arraste o arquivo .ifc aqui ou clique para selecionar
                </div>
              </div>
              <div
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--orange)', color: 'white' }}
              >
                Selecionar arquivo .IFC
              </div>
            </div>
          </label>
        )}
        <input
          id="ifc-file-input"
          type="file"
          accept=".ifc"
          className="hidden"
          onChange={handleFileInput}
        />

        {/* Loading spinner */}
        {isLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: 'rgba(15,25,35,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <Loader2 size={36} className="animate-spin mb-3" style={{ color: 'var(--orange)' }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Carregando modelo IFC...
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
              Aguarde enquanto o modelo é processado
            </div>
          </div>
        )}

        {/* Model name badge */}
        {loadedModelName && (
          <div
            className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono z-10"
            style={{ background: 'rgba(15,25,35,0.85)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
            {modelLabel || loadedModelName}
          </div>
        )}

        {/* Mode indicator */}
        {loadedModelName && (
          <div
            className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-mono z-10"
            style={{ background: 'rgba(15,25,35,0.85)', color: 'var(--slate)', border: '1px solid var(--surface-border)' }}
          >
            {mode === 'orbit' ? '⟳ Orbitar' : mode === 'pan' ? '✥ Pan' : '⊕ Zoom'}
          </div>
        )}

        {/* Issues panel */}
        {showIssuesList && issues.length > 0 && (
          <div
            className="absolute top-3 right-3 w-72 rounded-xl overflow-hidden z-10"
            style={{
              background: 'rgba(15,25,35,0.95)',
              border: '1px solid var(--surface-border)',
              backdropFilter: 'blur(8px)',
              maxHeight: '60%',
              overflowY: 'auto',
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 border-b text-xs font-semibold"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--white)' }}
            >
              <span>{issues.length} issue{issues.length > 1 ? 's' : ''} BIM</span>
              <button onClick={() => setShowIssuesList(false)} style={{ color: 'var(--slate)' }}>
                <X size={13} />
              </button>
            </div>
            {issues.map((issue, i) => {
              const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
              return (
                <div
                  key={i}
                  className="flex gap-2 p-2.5 border-b hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--surface-border)' }}
                >
                  <img
                    src={issue.screenshotDataUrl}
                    alt=""
                    className="w-12 h-10 object-cover rounded flex-shrink-0"
                    style={{ border: '1px solid var(--surface-border)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--white)' }}>
                      {issue.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[10px] px-1 py-0.5 rounded"
                        style={{ color: cat?.color, background: `${cat?.color}22` }}
                      >
                        {cat?.label}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{
                          color: issue.priority === 'alta' ? '#EF4444'
                            : issue.priority === 'media' ? '#EAB308' : '#22C55E',
                        }}
                      >
                        {issue.priority}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Issue modal */}
      {pendingIssue && (
        <IssueModal
          pending={pendingIssue}
          onConfirm={handleIssueConfirm}
          onCancel={() => setPendingIssue(null)}
        />
      )}
    </div>
  )
}
