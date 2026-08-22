/**
 * IFCViewer.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Visualizador BIM/IFC Profissional integrado ao IncorProjetos.
 * Usa @thatopen/components e @thatopen/fragments com Three.js.
 *
 * Recursos Integrados:
 *  - Navegação 3D: Orbitar, Pan, Zoom, Reset / Enquadrar
 *  - Inspeção & Multi-Seleção: Clique simples e Shift + Clique para seleção em lote
 *  - Quadro de Quantitativos (QTO): Volume acumulado (m³), Área (m²), Comprimento (m) e Exportação CSV
 *  - Planos de Corte Dinâmicos (Clipper): Seções X, Y, Z e corte interativo na geometria
 *  - Cotas 3D: Medição ponto a ponto com snap e valores reais em metros
 *  - Filtro de Categorias: Ligar/Desligar visibilidade por categoria IFC
 *  - Captura de Issues: Screenshot, viewpoint e vinculação com elementos
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
import * as FRAGS from '@thatopen/fragments'
import * as WebIFC from 'web-ifc'
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
  Scissors,
  Ruler,
  MousePointer,
  Trash2,
} from 'lucide-react'
import type { IssueCategory } from '../../types'
import { BIMMeasurementManager, getSnappedPoint } from './bimMeasurement'
import BIMPropertiesDrawer, { type SelectedBIMElement } from './BIMPropertiesDrawer'
import BIMCategoryFilterModal, { type BIMCategoryItem } from './BIMCategoryFilterModal'
import { FileSpreadsheet, Clock } from 'lucide-react'
import { useBIM4D } from './BIM4D/useBIM4D'
import BIM4DToolbar from './BIM4D/BIM4DToolbar'
import BIM4DElementsPanel from './BIM4D/BIM4DElementsPanel'
import BIM4DSchedulePanel from './BIM4D/BIM4DSchedulePanel'
import BIM4DTimelinePlayer from './BIM4D/BIM4DTimelinePlayer'
import BIM4DImportModal from './BIM4D/BIM4DImportModal'
import type { BIMElementGroup } from '../../types/bim4d'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ViewerMode = 'orbit' | 'pan' | 'inspect' | 'section' | 'measure'

interface PendingIssue {
  screenshotDataUrl: string
  title: string
  description: string
  category: IssueCategory
  priority: 'alta' | 'media' | 'baixa'
  selectedElements?: SelectedBIMElement[]
}

export interface IFCIssue {
  screenshotDataUrl: string
  title: string
  description: string
  category: IssueCategory
  priority: 'alta' | 'media' | 'baixa'
  viewpointMatrix?: number[]
  selectedElementGuids?: string[]
  createdAt: string
}

interface IFCViewerProps {
  onIssueCreated?: (issue: IFCIssue) => void
  modelLabel?: string
  className?: string
  style?: React.CSSProperties
}

const CATEGORY_OPTIONS: { value: IssueCategory; label: string; color: string }[] = [
  { value: 'conflito_projeto',  label: 'Conflito de Projeto',  color: '#EF4444' },
  { value: 'incompletude',      label: 'Incompletude',         color: '#F97316' },
  { value: 'erro_cota',         label: 'Erro de Cota',         color: '#EAB308' },
  { value: 'falta_detalhe',     label: 'Falta de Detalhe',     color: '#3B82F6' },
  { value: 'nomenclatura',      label: 'Nomenclatura',         color: '#8B5CF6' },
  { value: 'compatibilizacao',  label: 'Compatibilização',     color: '#06B6D4' },
  { value: 'outro',             label: 'Outro',                color: '#6B7280' },
]

const IFC_CATEGORY_LABELS: Record<string, string> = {
  IFCWALL: 'Paredes',
  IFCWALLSTANDARDCASE: 'Paredes Padrão',
  IFCCOLUMN: 'Pilares',
  IFCBEAM: 'Vigas',
  IFCSLAB: 'Lajes / Pisos',
  IFCDOOR: 'Portas',
  IFCWINDOW: 'Janelas',
  IFCPIPESEGMENT: 'Tubulações Hidráulicas',
  IFCPIPEFITTING: 'Conexões Hidráulicas',
  IFCFLOWTERMINAL: 'Pontos de Consumo / Terminais',
  IFCFLOWSEGMENT: 'Dutos / Eletrocalhas',
  IFCFLOWFITTING: 'Conexões de Dutos',
  IFCFLOWCONTROLLER: 'Válvulas / Registros',
  IFCBUILDINGELEMENTPROXY: 'Elementos Especiais / Genéricos',
  IFCCOVERING: 'Revestimentos / Forros',
  IFCFOOTING: 'Fundações / Sapatas',
  IFCRAILING: 'Guarda-Corpos / Corrimãos',
  IFCSTAIR: 'Escadas',
  IFCROOF: 'Coberturas / Telhados',
  IFCFURNISHINGELEMENT: 'Mobiliário',
  IFCMEMBER: 'Perfis Metálicos / Montantes',
  IFCREINFORCINGBAR: 'Armaduras / Vergalhões',
}

const HIGHLIGHT_COLOR = new THREE.Color(0xf97316)

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
      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed w-full"
      style={{ background: bg, border, color }}
    >
      {icon}
      <span className="text-[9px] font-medium leading-none text-center">{label}</span>
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
  onConfirm: (issue: IFCIssue) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(pending.title)
  const [description, setDescription] = useState(pending.description)
  const [category, setCategory] = useState<IssueCategory>(pending.category)
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>(pending.priority)

  function handleConfirm() {
    if (!title.trim()) return
    onConfirm({
      screenshotDataUrl: pending.screenshotDataUrl,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      selectedElementGuids: pending.selectedElements?.map(e => e.guid || '').filter(Boolean),
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-mid)' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={18} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold text-white">Nova Issue BIM</span>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-slate-400">
              <Camera size={12} /> Frame capturado do modelo 3D
            </div>
            <div className="rounded-xl overflow-hidden relative border border-slate-800 bg-black">
              <img src={pending.screenshotDataUrl} alt="Screenshot" className="w-full object-contain max-h-48" />
              {pending.selectedElements && pending.selectedElements.length > 0 && (
                <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-orange-500/80 text-white font-mono">
                  {pending.selectedElements.length} elemento(s) vinculado(s)
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs mb-1.5 block font-medium text-slate-400">Título da issue *</label>
            <input
              type="text"
              placeholder="Ex: Conflito de tubulação com viga V04"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              className="w-full text-xs rounded-lg px-3 py-2 outline-none bg-slate-900 border border-slate-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block font-medium text-slate-400">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as IssueCategory)}
                className="w-full text-xs rounded-lg px-3 py-2 outline-none bg-slate-900 border border-slate-700 text-white"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-medium text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'alta' | 'media' | 'baixa')}
                className="w-full text-xs rounded-lg px-3 py-2 outline-none bg-slate-900 border border-slate-700 text-white"
              >
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Média</option>
                <option value="baixa">🟢 Baixa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs mb-1.5 block font-medium text-slate-400">Descrição</label>
            <textarea
              placeholder="Descreva o problema encontrado no modelo..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-lg px-3 py-2 outline-none resize-none bg-slate-900 border border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800 bg-slate-900/60">
          <button onClick={onCancel} className="px-4 py-2 text-xs rounded-lg text-slate-300 hover:bg-white/10">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40"
          >
            <MessageSquarePlus size={14} />
            Criar Issue
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function IFCViewer({ onIssueCreated, modelLabel, className = '', style }: IFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const componentsRef = useRef<OBC.Components | null>(null)
  const worldRef = useRef<OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer> | null>(null)
  const measurementManagerRef = useRef<BIMMeasurementManager | null>(null)
  const currentModelRef = useRef<FRAGS.FragmentsModel | null>(null)
  const clipperRef = useRef<OBC.Clipper | null>(null)

  const [mode, setMode] = useState<ViewerMode>('orbit')
  const [isLoading, setIsLoading] = useState(false)
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null)
  const [pendingIssue, setPendingIssue] = useState<PendingIssue | null>(null)
  const [issues, setIssues] = useState<IFCIssue[]>([])
  const [initError, setInitError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Selection and QTO
  const [selectedElements, setSelectedElements] = useState<SelectedBIMElement[]>([])
  const [showDrawer, setShowDrawer] = useState(false)

  // Categories & Filters
  const [categories, setCategories] = useState<BIMCategoryItem[]>([])
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)

  // Measurement State
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([])
  const [activeMeasurementsCount, setActiveMeasurementsCount] = useState(0)

  // Section / Clipper State
  const [hasClippingPlanes, setHasClippingPlanes] = useState(false)

  // ─── 4D Simulation State ────────────────────────────────────────────────────
  const [show4DImportModal, setShow4DImportModal] = useState(false)
  const [raw4DElements, setRaw4DElements] = useState<Array<{
    expressId: number
    guid: string
    category: string
    name: string
    storey?: string
    material?: string
  }>>([])

  const bim4d = useBIM4D({
    model: currentModelRef.current,
    rawElements: raw4DElements.length > 0 ? raw4DElements : (categories.length > 0 ? categories.flatMap((cat, cIdx) => 
      Array.from({ length: Math.min(cat.count || 4, 6) }).map((_, i) => ({
        expressId: (cIdx + 1) * 100 + i + 1,
        guid: `guid-${cat.category}-${i}`,
        category: cat.category,
        name: `${cat.displayName} #${i + 1}`,
        storey: i % 2 === 0 ? '1º Pavimento' : '2º Pavimento',
        material: 'Concreto Armado / Alvenaria',
      }))
    ) : [
      { expressId: 101, guid: 'g-f-1', category: 'IfcFooting', name: 'Sapata Isolada S-01', storey: 'Fundação' },
      { expressId: 102, guid: 'g-f-2', category: 'IfcFooting', name: 'Bloco de Coroamento B-01', storey: 'Fundação' },
      { expressId: 201, guid: 'g-c-1', category: 'IfcColumn', name: 'Pilar Térreo P-01', storey: 'Térreo' },
      { expressId: 202, guid: 'g-b-1', category: 'IfcBeam', name: 'Viga Baldrame V-01', storey: 'Térreo' },
      { expressId: 203, guid: 'g-s-1', category: 'IfcSlab', name: 'Laje Térreo L-01', storey: 'Térreo' },
      { expressId: 301, guid: 'g-c-2', category: 'IfcColumn', name: 'Pilar P-101', storey: '1º Pavimento' },
      { expressId: 302, guid: 'g-b-2', category: 'IfcBeam', name: 'Viga V-101', storey: '1º Pavimento' },
      { expressId: 303, guid: 'g-s-2', category: 'IfcSlab', name: 'Laje Maciça L-101', storey: '1º Pavimento' },
      { expressId: 304, guid: 'g-w-1', category: 'IfcWall', name: 'Alvenaria Bloco Cerâmico', storey: '1º Pavimento' },
      { expressId: 401, guid: 'g-c-3', category: 'IfcColumn', name: 'Pilar P-201', storey: '2º Pavimento' },
      { expressId: 402, guid: 'g-b-3', category: 'IfcBeam', name: 'Viga V-201', storey: '2º Pavimento' },
      { expressId: 403, guid: 'g-s-3', category: 'IfcSlab', name: 'Laje Maciça L-201', storey: '2º Pavimento' },
    ]),
  })

  // ─── Initialize Three.js / OBC world ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || componentsRef.current) return

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

        // Renderer
        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!, {
          preserveDrawingBuffer: true,
        })
        world.renderer.three.setPixelRatio(window.devicePixelRatio)
        canvasRef.current = world.renderer.three.domElement

        // Camera
        world.camera = new OBC.OrthoPerspectiveCamera(components)
        await world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0)
        world.camera.controls.dampingFactor = 0.1

        components.init()

        // Grids
        const grids = components.get(OBC.Grids)
        grids.create(world)

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        world.scene.three.add(ambientLight)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
        dirLight.position.set(10, 20, 10)
        world.scene.three.add(dirLight)

        // Fragments & IFC Loader
        const fragments = components.get(OBC.FragmentsManager)
        const workerUrl = await OBC.FragmentsManager.getWorker()
        fragments.init(workerUrl)

        const ifcLoader = components.get(OBC.IfcLoader)
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: {
            path: "/wasm/web-ifc/",
            absolute: false,
          },
        })

        // Clipper
        const clipper = components.get(OBC.Clipper)
        clipper.setup()
        clipper.enabled = true
        clipperRef.current = clipper

        // Measurement Manager
        measurementManagerRef.current = new BIMMeasurementManager(world.scene.three)

        // Resize Observer
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
      measurementManagerRef.current?.dispose()
      if (componentsRef.current) {
        try {
          componentsRef.current.dispose()
        } catch (e) {
          console.warn('[IFCViewer] Error during dispose:', e)
        }
        componentsRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Extract categories and real items with building storeys ───────────────
  const extractCategories = useCallback(async (model: FRAGS.FragmentsModel, elementToStoreyMap?: Map<number, string>) => {
    try {
      const rawCategories = await model.getCategories()
      const list: BIMCategoryItem[] = []
      const allItemsList: Array<{
        expressId: number
        guid: string
        category: string
        name: string
        storey?: string
        material?: string
      }> = []

      for (const catName of rawCategories) {
        let count = 0
        let itemIds: number[] = []
        try {
          const idsMap = await model.getItemsOfCategories([new RegExp(`^${catName}$`, 'i')])
          if (idsMap && (idsMap as any)[catName]) {
            itemIds = (idsMap as any)[catName]
            count = itemIds.length
          } else if (Array.isArray(idsMap)) {
            itemIds = idsMap
            count = idsMap.length
          }
        } catch { /* ignore count error */ }

        const upper = catName.toUpperCase()
        const displayName = IFC_CATEGORY_LABELS[upper] || catName.replace(/^IFC/i, '')
        list.push({
          category: catName,
          displayName,
          count,
          visible: true,
        })

        // Extrai dados detalhados para cada elemento do modelo
        if (itemIds.length > 0) {
          try {
            const dataList = await model.getItemsData(itemIds, {
              attributes: ['Name', 'GlobalId', 'Tag', 'Description'],
            })
            itemIds.forEach((id, idx) => {
              const d = (dataList && dataList[idx]) ? (dataList[idx] as any) : {}
              const guid = d.GlobalId?.value || d.guid || `guid-${catName}-${id}`
              const name = d.Name?.value || d.name || `${displayName} #${id}`
              const storey = (elementToStoreyMap && elementToStoreyMap.get(id)) || d.storey || 'Pavimento Tipo'
              allItemsList.push({
                expressId: id,
                guid,
                category: catName,
                name,
                storey,
                material: d.material || 'Padrão IFC',
              })
            })
          } catch {
            itemIds.forEach(id => {
              const storey = (elementToStoreyMap && elementToStoreyMap.get(id)) || 'Pavimento Tipo'
              allItemsList.push({
                expressId: id,
                guid: `guid-${catName}-${id}`,
                category: catName,
                name: `${displayName} #${id}`,
                storey,
                material: 'Padrão IFC',
              })
            })
          }
        }
      }

      list.sort((a, b) => b.count - a.count)
      setCategories(list)
      if (allItemsList.length > 0) {
        setRaw4DElements(allItemsList)
      }
    } catch (err) {
      console.warn('[IFCViewer] Erro ao extrair categorias e itens:', err)
    }
  }, [])

  // ─── Load IFC file ──────────────────────────────────────────────────────────
  const loadIFC = useCallback(async (file: File) => {
    const components = componentsRef.current
    const world = worldRef.current
    if (!components || !world) return

    setIsLoading(true)
    setSelectedElements([])
    setShowDrawer(false)
    measurementManagerRef.current?.clearAll()
    setActiveMeasurementsCount(0)

    try {
      const ifcLoader = components.get(OBC.IfcLoader)
      const buffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(buffer)

      // Extração precisa de Pavimentos (IfcBuildingStorey) e relação de contenção espacial
      const elementToStorey = new Map<number, string>()
      try {
        const ifcApi = new WebIFC.IfcAPI()
        ifcApi.SetWasmPath('/wasm/web-ifc/')
        await ifcApi.Init()
        const ifcModelId = ifcApi.OpenModel(uint8)

        const storeyMap = new Map<number, string>()
        const storeys = ifcApi.GetLineIDsWithType(ifcModelId, WebIFC.IFCBUILDINGSTOREY)
        for (let i = 0; i < storeys.size(); i++) {
          const sId = storeys.get(i)
          const line = ifcApi.GetLine(ifcModelId, sId)
          const rawName = line.Name?.value || line.LongName?.value || `Pavimento #${sId}`
          const sName = rawName
            .replace(/\\X\\C9/gi, 'É')
            .replace(/\\X\\C3/gi, 'Ã')
            .replace(/\\X\\CD/gi, 'Í')
            .replace(/\\X\\C1/gi, 'Á')
            .replace(/\\X\\D3/gi, 'Ó')
            .replace(/\\X\\CA/gi, 'Ê')
          storeyMap.set(sId, sName)
        }

        const rels = ifcApi.GetLineIDsWithType(ifcModelId, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE)
        for (let i = 0; i < rels.size(); i++) {
          const relId = rels.get(i)
          const rel = ifcApi.GetLine(ifcModelId, relId)
          const sId = rel.RelatingStructure?.value
          const sName = storeyMap.get(sId) || 'Pavimento Tipo'
          const related = rel.RelatedElements || []
          for (const item of related) {
            if (typeof item.value === 'number') {
              elementToStorey.set(item.value, sName)
            }
          }
        }
        ifcApi.CloseModel(ifcModelId)
      } catch (err) {
        console.warn('[IFCViewer] Erro ao extrair pavimentos espaciais com WebIFC:', err)
      }

      const model = await ifcLoader.load(uint8, true, file.name)
      currentModelRef.current = model

      world.scene.three.add(model.object)
      model.object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          world.meshes.add(child)
        }
      })

      // Fit camera
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

      await extractCategories(model, elementToStorey)
      setLoadedModelName(file.name)
    } catch (err) {
      console.error('[IFCViewer] loadIFC error:', err)
      alert(`Erro ao carregar o modelo IFC: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }, [extractCategories])

  // ─── Drag & drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.toLowerCase().endsWith('.ifc')) loadIFC(file)
  }, [loadIFC])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadIFC(file)
  }, [loadIFC])

  // ─── Mode handler ───────────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode: ViewerMode) => {
    const world = worldRef.current
    if (!world?.camera) return
    setMode(newMode)
    const controls = world.camera.controls

    if (newMode === 'orbit') {
      controls.mouseButtons.left = 1
      controls.mouseButtons.middle = 8
      controls.mouseButtons.right = 2
    } else if (newMode === 'pan') {
      controls.mouseButtons.left = 2
      controls.mouseButtons.middle = 8
      controls.mouseButtons.right = 1
    } else if (newMode === 'section' || newMode === 'measure' || newMode === 'inspect') {
      controls.mouseButtons.left = 0
      controls.mouseButtons.middle = 8
      controls.mouseButtons.right = 1
    }
  }, [])

  // ─── Section / Clipping Planes ──────────────────────────────────────────────
  const handleAddPlane = useCallback((axis: 'x' | 'y' | 'z') => {
    const world = worldRef.current
    const clipper = clipperRef.current
    const model = currentModelRef.current
    if (!world || !clipper || !model) return

    const bbox = new THREE.Box3().setFromObject(model.object)
    const center = bbox.getCenter(new THREE.Vector3())

    let normal = new THREE.Vector3(0, -1, 0)
    if (axis === 'x') normal = new THREE.Vector3(-1, 0, 0)
    if (axis === 'z') normal = new THREE.Vector3(0, 0, -1)

    try {
      clipper.createFromNormalAndCoplanarPoint(world, normal, center)
      setHasClippingPlanes(true)
    } catch (err) {
      console.warn('[IFCViewer] Error adding clipping plane:', err)
    }
  }, [])

  const handleClearPlanes = useCallback(() => {
    clipperRef.current?.deleteAll()
    setHasClippingPlanes(false)
  }, [])

  // ─── Raycast & Click Handling ───────────────────────────────────────────────
  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const components = componentsRef.current
    const world = worldRef.current
    const model = currentModelRef.current
    const canvas = canvasRef.current
    if (!components || !world || !model || !canvas) return

    // 1. Normalized device coordinates (-1 a +1)
    const rect = canvas.getBoundingClientRect()
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const ndcVec = new THREE.Vector2(ndcX, ndcY)

    // 2. That Open Raycaster Component
    let res: any = null
    try {
      const casters = components.get(OBC.Raycasters)
      const caster = casters.get(world)
      if (caster) {
        res = await caster.castRay()
      }
    } catch (err) {
      console.warn('[IFCViewer] caster.castRay error:', err)
    }

    // 3. Fallback model.raycast com coordenadas NDC
    if (!res) {
      try {
        res = await model.raycast({ camera: world.camera.three, mouse: ndcVec, dom: canvas })
      } catch (err) {
        console.warn('[IFCViewer] model.raycast error:', err)
      }
    }

    // 4. Three.js Raycaster fallback para hit point & meshes
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndcVec, world.camera.three)
    const targets: THREE.Object3D[] = [model.object, ...Array.from(world.meshes)]
    const intersects = raycaster.intersectObjects(targets, true)

    if (!res && intersects.length === 0) {
      if (mode === 'inspect' && !e.shiftKey) {
        setSelectedElements([])
        await (model as any).resetColor?.()
      }
      return
    }

    const hit = intersects[0]
    const hitPoint: THREE.Vector3 = res?.point || hit?.point || new THREE.Vector3()

    // ── MODE: MEASURE ──
    if (mode === 'measure') {
      const snapResult = hit ? getSnappedPoint(hit) : { point: hitPoint, isSnapped: false }
      const finalPoint = snapResult.point
      if (measurePoints.length === 0) {
        setMeasurePoints([finalPoint])
        measurementManagerRef.current?.setSnapIndicator(finalPoint, snapResult.isSnapped)
      } else {
        const p1 = measurePoints[0]
        measurementManagerRef.current?.addMeasurement(p1, finalPoint)
        measurementManagerRef.current?.clearPreview()
        measurementManagerRef.current?.setSnapIndicator(null)
        setMeasurePoints([])
        setActiveMeasurementsCount(measurementManagerRef.current?.getMeasurements().length || 0)
      }
      return
    }

    // ── MODE: SECTION (Clipper) ──
    if (mode === 'section') {
      const normal = res?.normal || (hit?.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0))
      clipperRef.current?.createFromNormalAndCoplanarPoint(world, normal, hitPoint)
      setHasClippingPlanes(true)
      return
    }

    // ── MODE: INSPECT / ORBIT / 4D (Selection & QTO) ──
    if (mode === 'inspect' || mode === 'orbit' || bim4d.is4DActive) {
      let rawId = res && typeof res.localId === 'number' ? res.localId : null

      // Fallback localId extraction from Fragment mesh if res.localId is null
      if (rawId === null && hit?.object) {
        try {
          const mesh = hit.object as any
          if (mesh.fragment && typeof mesh.fragment.getItemID === 'function' && typeof (hit as any).instanceId === 'number') {
            rawId = mesh.fragment.getItemID((hit as any).instanceId)
          } else if (mesh.fragment?.itemIds && typeof (hit as any).instanceId === 'number' && mesh.fragment.itemIds[(hit as any).instanceId] !== undefined) {
            rawId = mesh.fragment.itemIds[(hit as any).instanceId]
          } else if (typeof (hit as any).instanceId === 'number' && mesh.userData?.itemIds) {
            rawId = mesh.userData.itemIds[(hit as any).instanceId] || mesh.userData.itemIds[0]
          } else if (mesh.userData?.itemIds && mesh.userData.itemIds.length > 0) {
            rawId = mesh.userData.itemIds[0]
          }
        } catch { /* ignore */ }
      }

      if (rawId !== null) {
        // Converter itemId do FragmentMesh para o localId real do IFC
        let localId = rawId
        try {
          if (typeof (model as any).getLocalIdsFromItemIds === 'function') {
            const mapped = await (model as any).getLocalIdsFromItemIds([rawId])
            if (mapped && mapped.length > 0 && typeof mapped[0] === 'number') {
              localId = mapped[0]
            }
          }
        } catch (err) {
          console.warn('[IFCViewer] Erro ao mapear getLocalIdsFromItemIds:', err)
        }

        const isShift = e.shiftKey

        // Se o modo 4D estiver ativo, atualiza a seleção do 4D
        if (bim4d.is4DActive) {
          bim4d.toggleSelectElement(localId, isShift)
        }

        // Buscar dados já catalogados na extração inicial
        const matchingRaw = raw4DElements.find(r => r.expressId === localId)

        let category = matchingRaw?.category ? (IFC_CATEGORY_LABELS[matchingRaw.category.toUpperCase()] || matchingRaw.category) : 'Elemento IFC'
        let name = matchingRaw?.name || `Elemento #${localId}`
        let guid = matchingRaw?.guid || ''
        let storey = matchingRaw?.storey || 'Pavimento Tipo'
        let volume = 0
        let area = 0
        let length = 0

        const customPsets: Array<{ name: string; properties: Array<{ name: string; value: string | number | boolean }> }> = []

        try {
          const rawData = await model.getItemsData([localId])
          if (rawData && rawData[0]) {
            const d = rawData[0] as any
            if (d.category) category = IFC_CATEGORY_LABELS[String(d.category).toUpperCase()] || d.category
            if (d.name) name = d.name?.value || d.name
            if (d.guid) guid = d.guid?.value || d.guid
            if (d.storey) storey = d.storey?.value || d.storey

            // Extrair propriedades adicionais
            const propList: Array<{ name: string; value: any }> = []
            if (d.Tag) propList.push({ name: 'Tag / Código', value: d.Tag.value || d.Tag })
            if (d.Description) propList.push({ name: 'Descrição', value: d.Description.value || d.Description })
            if (d.NominalDiameter) propList.push({ name: 'Diâmetro Nominal', value: d.NominalDiameter.value || d.NominalDiameter })
            if (d.Length) propList.push({ name: 'Comprimento', value: `${Number(d.Length.value || d.Length).toFixed(2)} m` })

            if (propList.length > 0) {
              customPsets.push({
                name: 'Parâmetros do Elemento',
                properties: propList,
              })
            }
          }
        } catch { /* fallback */ }

        try {
          const vol = await model.getItemsVolume([localId])
          if (typeof vol === 'number' && vol > 0) {
            volume = vol
          }
        } catch { /* fallback */ }

        // Caixa delimitadora exata do elemento específico
        let size = new THREE.Vector3(0, 0, 0)
        try {
          const bbox = await model.getMergedBox([localId])
          if (bbox && !bbox.isEmpty()) {
            size = bbox.getSize(new THREE.Vector3())
          } else if (hit?.object) {
            const objBbox = new THREE.Box3().setFromObject(hit.object)
            size = objBbox.getSize(new THREE.Vector3())
          }
        } catch {
          if (hit?.object) {
            const objBbox = new THREE.Box3().setFromObject(hit.object)
            size = objBbox.getSize(new THREE.Vector3())
          }
        }

        length = Math.max(size.x, size.y, size.z)
        area = (size.x * size.y) || (size.x * size.z)

        const elementData: SelectedBIMElement = {
          modelId: model.modelId,
          expressId: localId,
          category,
          name,
          guid,
          storey,
          dimensions: {
            volume: volume > 0 ? volume : (size.x * size.y * size.z),
            area: area > 0 ? area : undefined,
            length: length > 0 ? length : undefined,
            width: size.x,
            height: size.y,
          },
          psets: [
            {
              name: 'Identificação & Localização',
              properties: [
                { name: 'Express ID', value: localId },
                { name: 'Categoria IFC', value: category },
                { name: 'Pavimento', value: storey },
                { name: 'GUID Global', value: guid || 'N/A' },
              ]
            },
            {
              name: 'Propriedades Geométricas',
              properties: [
                { name: 'Largura (X)', value: `${size.x.toFixed(2)} m` },
                { name: 'Altura (Y)', value: `${size.y.toFixed(2)} m` },
                { name: 'Profundidade (Z)', value: `${size.z.toFixed(2)} m` },
                { name: 'Volume Estimado', value: `${(size.x * size.y * size.z).toFixed(3)} m³` },
              ]
            },
            ...customPsets,
          ]
        }

        if (isShift) {
          setSelectedElements(prev => {
            const exists = prev.some(el => el.expressId === localId)
            const updated = exists ? prev.filter(el => el.expressId !== localId) : [...prev, elementData]
            const ids = updated.map(u => u.expressId)
            ;(model as any).resetColor?.().then(() => {
              if (ids.length > 0) model.setColor(ids, HIGHLIGHT_COLOR)
            })
            return updated
          })
        } else {
          setSelectedElements([elementData])
          await (model as any).resetColor?.()
          await model.setColor([localId], HIGHLIGHT_COLOR)
        }

        setShowDrawer(true)
      }
    }
  }, [mode, measurePoints, bim4d.is4DActive, bim4d.toggleSelectElement, raw4DElements])

  // Mouse move for 3D measurement preview line & magnetic snap indicator
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!worldRef.current || !canvasRef.current || !currentModelRef.current) return
    const world = worldRef.current
    const model = currentModelRef.current
    const canvas = canvasRef.current

    if (mode === 'measure') {
      const rect = canvas.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), world.camera.three)
      const targets: THREE.Object3D[] = [model.object, ...Array.from(world.meshes)]
      const intersects = raycaster.intersectObjects(targets, true)

      if (intersects.length > 0) {
        const { point, isSnapped } = getSnappedPoint(intersects[0])
        measurementManagerRef.current?.setSnapIndicator(point, isSnapped)
        if (measurePoints.length > 0) {
          measurementManagerRef.current?.updatePreview(measurePoints[0], point)
        }
      } else {
        measurementManagerRef.current?.setSnapIndicator(null)
      }
    }
  }, [mode, measurePoints])

  // ─── Visibility controls ────────────────────────────────────────────────────
  const handleIsolate = useCallback(async (elements: SelectedBIMElement[]) => {
    const model = currentModelRef.current
    if (!model || elements.length === 0) return
    const ids = elements.map(e => e.expressId)
    const allIds = raw4DElements.map(e => e.expressId)
    const otherIds = allIds.filter(id => !ids.includes(id))
    if (otherIds.length > 0) await model.setVisible(otherIds, false)
    await model.setVisible(ids, true)
    await (model as any).resetColor?.()
    await model.setColor(ids, HIGHLIGHT_COLOR)
  }, [raw4DElements])

  // Isolamento de Pavimento no 3D
  const handleIsolateStorey = useCallback(async (storeyName: string) => {
    const model = currentModelRef.current
    const world = worldRef.current
    if (!model) return

    const allIds = raw4DElements.map(e => e.expressId)
    if (allIds.length === 0) return

    if (storeyName === 'todos') {
      await model.setVisible(allIds, true)
      await (model as any).resetColor?.()
      return
    }

    const storeyElementIds = raw4DElements
      .filter(e => e.storey === storeyName)
      .map(e => e.expressId)

    const otherElementIds = raw4DElements
      .filter(e => e.storey !== storeyName)
      .map(e => e.expressId)

    if (otherElementIds.length > 0) {
      await model.setVisible(otherElementIds, false)
    }
    if (storeyElementIds.length > 0) {
      await model.setVisible(storeyElementIds, true)
      await (model as any).resetColor?.()
      await model.setColor(storeyElementIds, new THREE.Color(0x0284c7))

      if (world) {
        try {
          const bbox = await model.getMergedBox(storeyElementIds)
          if (bbox && !bbox.isEmpty()) {
            const center = bbox.getCenter(new THREE.Vector3())
            const size = bbox.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z, 2)
            await world.camera.controls.setLookAt(
              center.x + maxDim * 1.2,
              center.y + maxDim * 0.8,
              center.z + maxDim * 1.2,
              center.x, center.y, center.z,
              true
            )
          }
        } catch {}
      }
    }
  }, [raw4DElements])

  // Isolamento de Grupo Específico no 3D
  const handleIsolateGroup = useCallback(async (group: BIMElementGroup) => {
    const model = currentModelRef.current
    const world = worldRef.current
    if (!model) return

    const allIds = raw4DElements.map(e => e.expressId)
    const otherElementIds = allIds.filter(id => !group.expressIds.includes(id))

    if (otherElementIds.length > 0) {
      await model.setVisible(otherElementIds, false)
    }
    await model.setVisible(group.expressIds, true)
    await (model as any).resetColor?.()
    await model.setColor(group.expressIds, new THREE.Color(0xf59e0b))

    if (world) {
      try {
        const bbox = await model.getMergedBox(group.expressIds)
        if (bbox && !bbox.isEmpty()) {
          const center = bbox.getCenter(new THREE.Vector3())
          const size = bbox.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z, 2)
          await world.camera.controls.setLookAt(
            center.x + maxDim * 1.2,
            center.y + maxDim * 0.8,
            center.z + maxDim * 1.2,
            center.x, center.y, center.z,
            true
          )
        }
      } catch {}
    }
  }, [raw4DElements])

  // Restaurar todos os elementos no 3D
  const handleShowAll4D = useCallback(async () => {
    const model = currentModelRef.current
    if (!model) return
    const allIds = raw4DElements.map(e => e.expressId)
    if (allIds.length > 0) {
      await model.setVisible(allIds, true)
      await (model as any).resetColor?.()
    }
  }, [raw4DElements])

  const handleHide = useCallback(async (elements: SelectedBIMElement[]) => {
    const model = currentModelRef.current
    if (!model || elements.length === 0) return
    const ids = elements.map(e => e.expressId)
    await model.setVisible(ids, false)
    setSelectedElements([])
    setShowDrawer(false)
    await (model as any).resetColor()
  }, [])

  const handleFocus = useCallback(async (elements: SelectedBIMElement[]) => {
    const world = worldRef.current
    const model = currentModelRef.current
    if (!world || !model || elements.length === 0) return

    const ids = elements.map(e => e.expressId)
    const bbox = await model.getMergedBox(ids)
    if (bbox && !bbox.isEmpty()) {
      const center = bbox.getCenter(new THREE.Vector3())
      const size = bbox.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z, 2)
      await world.camera.controls.setLookAt(
        center.x + maxDim * 1.5,
        center.y + maxDim,
        center.z + maxDim * 1.5,
        center.x, center.y, center.z,
        true
      )
    }
  }, [])

  const handleToggleCategory = useCallback(async (category: string) => {
    const model = currentModelRef.current
    if (!model) return

    const target = categories.find(c => c.category === category)
    if (!target) return
    const nextVis = !target.visible

    setCategories(prev => prev.map(c => c.category === category ? { ...c, visible: nextVis } : c))

    const idsMap = await model.getItemsOfCategories([new RegExp(`^${category}$`, 'i')])
    const ids = (idsMap as Record<string, number[]>)[category] || []
    if (ids.length > 0) {
      await model.setVisible(ids, nextVis)
    }
  }, [categories])

  const handleShowAllCategories = useCallback(async () => {
    const model = currentModelRef.current
    if (!model) return
    await (model as any).resetVisible()
    setCategories(prev => prev.map(c => ({ ...c, visible: true })))
  }, [])

  const handleHideAllCategories = useCallback(async () => {
    const model = currentModelRef.current
    if (!model) return
    const categoriesList = await model.getCategories()
    const allIdsMap = await model.getItemsOfCategories(categoriesList.map(c => new RegExp(`^${c}$`, 'i')))
    const allIds: number[] = []
    for (const catIds of Object.values(allIdsMap as Record<string, number[]>)) {
      if (Array.isArray(catIds)) allIds.push(...catIds)
    }
    if (allIds.length > 0) {
      await model.setVisible(allIds, false)
    }
    setCategories(prev => prev.map(c => ({ ...c, visible: false })))
  }, [])

  // ─── Camera Zoom/Reset ──────────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    const world = worldRef.current
    const model = currentModelRef.current
    if (!world) return

    if (model) {
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
        return
      }
    }
    await world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0, true)
  }, [])

  // ─── Create Annotation / Issue ──────────────────────────────────────────────
  const handleCreateAnnotation = useCallback(() => {
    const world = worldRef.current
    if (!world?.renderer) {
      alert('Carregue um modelo IFC primeiro para criar anotações.')
      return
    }

    world.renderer.three.render(world.scene.three, world.camera.three)
    const canvas = canvasRef.current
    if (!canvas) return

    let screenshotDataUrl: string
    try {
      screenshotDataUrl = canvas.toDataURL('image/png')
    } catch (err) {
      console.error('[IFCViewer] toDataURL error:', err)
      alert('Erro ao capturar o frame.')
      return
    }

    const camMatrix = world.camera.three.matrixWorld.toArray()
    ;(window as any).__lastBIMCameraMatrix = camMatrix

    setPendingIssue({
      screenshotDataUrl,
      title: selectedElements.length === 1 ? `Revisão: ${selectedElements[0].name}` : '',
      description: '',
      category: 'conflito_projeto',
      priority: 'alta',
      selectedElements,
    })
  }, [selectedElements])

  const handleIssueConfirm = useCallback((issue: IFCIssue) => {
    const camMatrix = (window as any).__lastBIMCameraMatrix || []
    const fullIssue: IFCIssue = { ...issue, viewpointMatrix: camMatrix }

    setIssues(prev => [fullIssue, ...prev])
    onIssueCreated?.(fullIssue)
    setPendingIssue(null)
  }, [onIssueCreated])

  // ─── UI Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative flex rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        minHeight: '520px',
        ...style,
      }}
    >
      {/* LEFT TOOLBAR */}
      <div
        className="flex flex-col gap-1.5 p-2 z-10 flex-shrink-0"
        style={{
          width: 76,
          background: 'rgba(15,25,35,0.92)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px solid var(--surface-border)',
        }}
      >
        {/* Model icon & label */}
        <div className="px-1 pt-1 pb-2 border-b border-slate-800">
          <div className="flex items-center justify-center">
            <Box size={20} className="text-orange-400" />
          </div>
          <div className="text-center text-[9px] mt-0.5 font-mono truncate text-slate-400" title={loadedModelName || 'BIM'}>
            {loadedModelName ? loadedModelName.replace('.ifc', '') : 'BIM'}
          </div>
        </div>

        {/* Navigation Modes */}
        <div className="text-[9px] uppercase tracking-wider text-center mt-0.5 text-slate-500 font-semibold">
          Navegar
        </div>

        <ToolbarButton
          icon={<RotateCcw size={15} />}
          label="Orbitar"
          active={mode === 'orbit'}
          onClick={() => handleModeChange('orbit')}
        />
        <ToolbarButton
          icon={<Move size={15} />}
          label="Pan"
          active={mode === 'pan'}
          onClick={() => handleModeChange('pan')}
        />
        <ToolbarButton
          icon={<MousePointer size={15} />}
          label="Inspecionar"
          active={mode === 'inspect'}
          onClick={() => handleModeChange('inspect')}
        />

        {/* Divider */}
        <div className="h-px my-0.5 bg-slate-800" />

        {/* BIM Tools */}
        <div className="text-[9px] uppercase tracking-wider text-center text-slate-500 font-semibold">
          Ferramentas
        </div>

        <ToolbarButton
          icon={<Scissors size={15} />}
          label="Corte 3D"
          active={mode === 'section'}
          onClick={() => handleModeChange('section')}
        />

        <ToolbarButton
          icon={<Ruler size={15} />}
          label="Medir"
          active={mode === 'measure'}
          onClick={() => handleModeChange('measure')}
        />

        <ToolbarButton
          icon={<Layers size={15} />}
          label="Categorias"
          active={showCategoriesModal}
          onClick={() => setShowCategoriesModal(p => !p)}
        />

        <ToolbarButton
          icon={<FileSpreadsheet size={15} />}
          label="Propriedades"
          active={showDrawer}
          onClick={() => setShowDrawer(p => !p)}
        />

        <ToolbarButton
          icon={<Clock size={15} className={bim4d.is4DActive ? 'text-blue-400' : ''} />}
          label="Simulação 4D"
          active={bim4d.is4DActive}
          onClick={() => bim4d.setIs4DActive(p => !p)}
        />

        {/* Camera Tools */}
        <div className="h-px my-0.5 bg-slate-800" />
        <ToolbarButton
          icon={<Maximize2 size={15} />}
          label="Enquadrar"
          onClick={handleReset}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* PRIMARY ACTION — Criar Anotação / Issue */}
        <div
          className="rounded-xl p-0.5 mb-1"
          style={{ background: 'linear-gradient(135deg, var(--orange), #c2410c)' }}
        >
          <button
            onClick={handleCreateAnnotation}
            disabled={!initialized || !loadedModelName}
            title="Criar Issue BIM vinculada ao viewpoint e peças selecionadas"
            className="w-full flex flex-col items-center gap-1 px-1 py-2 rounded-[10px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(15,25,35,0.6)' }}
          >
            <MessageSquarePlus size={16} className="text-orange-400" />
            <span className="text-[9px] font-bold leading-tight text-center text-orange-400">
              CRIAR<br />ISSUE
            </span>
          </button>
        </div>
      </div>

      {/* MAIN CANVAS & 4D PANELS WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Floating 4D Toolbar */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <BIM4DToolbar
            is4DActive={bim4d.is4DActive}
            isPresentationMode={bim4d.isPresentationMode}
            selectedElementsCount={bim4d.selectedElementIds.size}
            selectedActivityName={
              bim4d.cronograma.atividades.find(a => a.id === bim4d.selectedActivityId)?.nome
            }
            onToggle4D={() => bim4d.setIs4DActive(p => !p)}
            onTogglePresentationMode={() => bim4d.setIsPresentationMode(p => !p)}
            onVincularSelecao={bim4d.vincularSelecao}
          />
        </div>

        {/* Middle: Left Panel + 3D Canvas + Right Panel */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Painel Esquerdo: Elementos do IFC (se 4D ativo e não em tela cheia) */}
          {bim4d.is4DActive && !bim4d.isPresentationMode && (
            <BIM4DElementsPanel
              elementGroups={bim4d.elementGroups}
              selectedElementIds={bim4d.selectedElementIds}
              onToggleSelectGroup={bim4d.toggleSelectGroup}
              onSelectAll={bim4d.selectAllElements}
              onClearSelection={bim4d.clearSelection}
              onAutoVincular={bim4d.autoVincularPorNome}
              onIsolateStorey={handleIsolateStorey}
              onIsolateGroup={handleIsolateGroup}
              onShowAll={handleShowAll4D}
            />
          )}

          {/* MAIN 3D CANVAS AREA */}
          <div className="flex-1 relative overflow-hidden">
            {/* Three.js canvas container */}
            <div
              ref={containerRef}
              className="absolute inset-0"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              style={{
                cursor: mode === 'pan' ? 'grab' : mode === 'measure' ? 'crosshair' : mode === 'section' ? 'cell' : 'default'
              }}
            />

            {/* Top Active Mode Controls Banner */}
            {mode === 'section' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-lg text-xs z-20 text-white">
                <Scissors size={14} className="text-orange-400" />
                <span className="font-semibold">Plano de Corte:</span>
                <span className="text-slate-400">Clique na face do modelo ou crie em:</span>
                <button
                  onClick={() => handleAddPlane('x')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-[11px]"
                >
                  X
                </button>
                <button
                  onClick={() => handleAddPlane('y')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-[11px]"
                >
                  Y
                </button>
                <button
                  onClick={() => handleAddPlane('z')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-[11px]"
                >
                  Z
                </button>
                {hasClippingPlanes && (
                  <button
                    onClick={handleClearPlanes}
                    className="ml-2 text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Limpar Cortes
                  </button>
                )}
              </div>
            )}

            {mode === 'measure' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-lg text-xs z-20 text-white">
                <Ruler size={14} className="text-orange-400" />
                <span className="font-semibold">Modo Medição 3D:</span>
                <span className="text-slate-400">
                  {measurePoints.length === 0 ? 'Clique no 1º ponto para iniciar' : 'Clique no 2º ponto para finalizar a cota'}
                </span>
                {activeMeasurementsCount > 0 && (
                  <button
                    onClick={() => {
                      measurementManagerRef.current?.clearAll()
                      setActiveMeasurementsCount(0)
                      setMeasurePoints([])
                    }}
                    className="ml-2 text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Limpar Cotas ({activeMeasurementsCount})
                  </button>
                )}
              </div>
            )}

            {/* Init error */}
            {initError && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center p-6 rounded-xl mx-4 max-w-sm bg-red-500/10 border border-red-500/30">
                  <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
                  <div className="text-sm font-semibold mb-1 text-red-500">Erro ao inicializar visualizador</div>
                  <div className="text-xs text-slate-400">{initError}</div>
                </div>
              </div>
            )}

            {/* Drop zone overlay when no model loaded */}
            {!loadedModelName && !isLoading && initialized && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 bg-[#0f1923]/90 backdrop-blur-xs">
                <div className="flex flex-col items-center gap-3 p-8 rounded-2xl w-full max-w-sm border-2 border-dashed border-slate-700 bg-slate-900/80">
                  <Upload size={36} className="text-slate-400" />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">Carregar modelo IFC</div>
                    <div className="text-xs mt-1 text-slate-400">Arraste o arquivo .ifc aqui ou selecione</div>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <label
                      htmlFor="ifc-file-input"
                      className="text-center text-xs px-3 py-2 rounded-lg font-medium cursor-pointer transition-all bg-orange-600 hover:bg-orange-500 text-white block"
                    >
                      Selecionar arquivo .IFC
                    </label>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        setIsLoading(true)
                        try {
                          const res = await fetch('/test-files/test.ifc')
                          if (!res.ok) throw new Error('Não foi possível obter o arquivo de teste no servidor.')
                          const blob = await res.blob()
                          const file = new File([blob], '078-EX-HID-0002-MOD-EMB_HID-R03.ifc', { type: 'application/octet-stream' })
                          await loadIFC(file)
                        } catch (err) {
                          alert(`Erro: ${err instanceof Error ? err.message : String(err)}`)
                        } finally {
                          setIsLoading(false)
                        }
                      }}
                      className="text-xs px-3 py-2 rounded-lg font-medium border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 cursor-pointer transition-all block w-full"
                    >
                      Carregar Prancha de Teste 3D (IFC)
                    </button>
                  </div>
                </div>
              </div>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#0f1923]/90 backdrop-blur-xs">
                <Loader2 size={36} className="text-orange-500 animate-spin mb-3" />
                <div className="text-sm font-semibold text-white">Carregando modelo IFC...</div>
                <div className="text-xs text-slate-400 mt-1">Convertendo geometria e preparando atributos</div>
              </div>
            )}

            {/* Categories / Visibility Modal */}
            {showCategoriesModal && (
              <BIMCategoryFilterModal
                categories={categories}
                onToggleCategory={handleToggleCategory}
                onShowAll={handleShowAllCategories}
                onHideAll={handleHideAllCategories}
                onClose={() => setShowCategoriesModal(false)}
              />
            )}

            {/* Properties / QTO Drawer */}
            {showDrawer && (
              <BIMPropertiesDrawer
                selectedElements={selectedElements}
                onClose={() => {
                  setShowDrawer(false)
                  ;(currentModelRef.current as any)?.resetColor()
                }}
                onIsolate={handleIsolate}
                onHide={handleHide}
                onFocus={handleFocus}
                onClearSelection={() => {
                  setSelectedElements([])
                  ;(currentModelRef.current as any)?.resetColor()
                }}
              />
            )}
          </div>

          {/* Painel Direito: Cronograma de Obra (se 4D ativo e não em tela cheia) */}
          {bim4d.is4DActive && !bim4d.isPresentationMode && (
            <BIM4DSchedulePanel
              cronograma={bim4d.cronograma}
              selectedActivityId={bim4d.selectedActivityId}
              onSelectActivity={bim4d.setSelectedActivityId}
              onDesvincularAtividade={bim4d.desvincularAtividade}
              onOpenImportModal={() => setShow4DImportModal(true)}
              onDownloadTemplate={() => setShow4DImportModal(true)}
              onAutoVincular={bim4d.autoVincularPorNome}
              onAddManualActivity={bim4d.adicionarAtividadeManual}
            />
          )}
        </div>

        {/* Rodapé: Player da Linha do Tempo 4D */}
        {bim4d.is4DActive && (
          <BIM4DTimelinePlayer
            cronograma={bim4d.cronograma}
            playerState={bim4d.playerState}
            dateRange={bim4d.dateRange}
            onTogglePlay={bim4d.togglePlay}
            onSetSpeed={bim4d.setSpeed}
            onSetTimeScale={bim4d.setTimeScale}
            onSetDate={bim4d.setTimelineDate}
            onReset={bim4d.resetSimulation}
          />
        )}
      </div>

      {/* Modal de Importação de Cronograma 4D */}
      <BIM4DImportModal
        isOpen={show4DImportModal}
        onClose={() => setShow4DImportModal(false)}
        onImport={bim4d.importarAtividades}
      />

      {/* Modal for Issue creation */}
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
