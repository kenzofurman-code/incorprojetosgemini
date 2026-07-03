import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, Plus, Eye, EyeOff, Move, Palette, Loader2 } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import { MOCK_DRAWINGS } from '../../data/mockData'
import { renderPdfPage, tintDrawing, type RenderedPdfPage } from '../../lib/pdf-comparison'

const OVERLAY_COLORS = ['#EF4444', '#22C55E', '#3B82F6', '#F97316', '#EAB308', '#8B5CF6', '#06B6D4', '#000000']

interface LayerDoc {
  id: string
  code: string
  discipline: string
  color: string
  opacity: number
  visible: boolean
  isBase: boolean
  pdfUrl?: string | null
}

export default function Sobrepor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useApp()
  const projectId = currentProject.id
  const { drawings } = useDrawings(projectId)

  const baseDrawing = (id ? drawings.find(d => d.id === id) : null) || MOCK_DRAWINGS[0]
  const secondDrawing = drawings.find(d => d.id !== baseDrawing.id) || MOCK_DRAWINGS[4]

  const [layers, setLayers] = useState<LayerDoc[]>([
    {
      id: baseDrawing.id,
      code: baseDrawing.code,
      discipline: baseDrawing.discipline,
      color: '#000000',
      opacity: 100,
      visible: true,
      isBase: true,
      pdfUrl: baseDrawing.pdfUrl || null,
    },
    {
      id: secondDrawing.id,
      code: secondDrawing.code,
      discipline: secondDrawing.discipline,
      color: '#EF4444',
      opacity: 70,
      visible: true,
      isBase: false,
      pdfUrl: secondDrawing.pdfUrl || null,
    },
  ])

  const [removeText, setRemoveText] = useState(false)
  const [page, setPage] = useState(1)

  function updateLayer(layerId: string, updates: Partial<LayerDoc>) {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...updates } : l))
  }

  function addLayer() {
    const unused = drawings.find(d => !layers.find(l => l.id === d.id))
    if (!unused) return
    setLayers(prev => [...prev, {
      id: unused.id,
      code: unused.code,
      discipline: unused.discipline,
      color: OVERLAY_COLORS[prev.length % OVERLAY_COLORS.length],
      opacity: 70,
      visible: true,
      isBase: false,
      pdfUrl: unused.pdfUrl || null,
    }])
  }

  const visibleLayers = layers.filter(l => l.visible)

  // ─── PDF Render & Tint Pipeline ─────────────────────────────────────────────
  const [renderedPages, setRenderedPages] = useState<Record<string, RenderedPdfPage>>({})
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const activeLayers = visibleLayers.filter(l => l.pdfUrl)
    if (activeLayers.length === 0) return

    setRendering(true)
    setError(null)

    // Render all visible PDFs concurrently
    Promise.all(
      activeLayers.map(l =>
        renderPdfPage(l.pdfUrl!, page, removeText)
          .then(rendered => ({ id: l.id, rendered }))
      )
    )
      .then(results => {
        if (cancelled) return
        const newPages: Record<string, RenderedPdfPage> = {}
        for (const item of results) {
          newPages[item.id] = item.rendered
        }
        setRenderedPages(newPages)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[Sobrepor] Error rendering overlay:', err)
          setError(err instanceof Error ? err.message : 'Erro ao renderizar sobreposição de PDFs.')
        }
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })

    return () => {
      cancelled = true
    }
  }, [visibleLayers.length, page, removeText, layers]) // layers dependency allows picking different files

  // Apply tint Drawing to rendered canvas outputs
  const tintedCanvases = useMemo(() => {
    const tinted: Record<string, HTMLCanvasElement> = {}
    for (const layer of visibleLayers) {
      const rendered = renderedPages[layer.id]
      if (rendered) {
        tinted[layer.id] = tintDrawing(rendered.canvas, layer.color)
      }
    }
    return tinted
  }, [renderedPages, visibleLayers])

  // Get largest page width & height for aspect ratio preservation
  const firstRendered = Object.values(renderedPages)[0]?.canvas
  const dimensions = firstRendered
    ? { width: firstRendered.width, height: firstRendered.height }
    : { width: 800, height: 600 }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/projetos')}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--slate)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Sobreposição de Projetos
            </span>
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>
            {baseDrawing.floor} · {baseDrawing.discipline}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left panel – layer controls */}
        <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto pr-1">
          {/* Options */}
          <Card className="p-3">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--white)' }}>Opções</div>

            {/* Page selector */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs" style={{ color: 'var(--slate)' }}>Página</span>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--slate)' }}
                disabled={page <= 1 || rendering}
              >‹</button>
              <span className="text-xs font-mono" style={{ color: 'var(--white)' }}>{page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--slate)' }}
                disabled={rendering}
              >›</button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={removeText}
                onChange={e => setRemoveText(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-orange-500"
              />
              <span className="text-xs" style={{ color: 'var(--slate)' }}>
                Remover textos do PDF (Experimental)
              </span>
            </label>
          </Card>

          {/* Layers */}
          <div className="space-y-2">
            {layers.map(layer => (
              <Card key={layer.id} className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-semibold truncate"
                      style={{ color: 'var(--white)', maxWidth: 170 }}>
                      {layer.code}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--slate)' }}>
                      {layer.discipline}
                      {layer.isBase && (
                        <span className="ml-1.5 px-1 py-0.5 rounded text-xs font-bold"
                          style={{ background: 'var(--surface-mid)', color: 'var(--orange)', fontSize: '9px' }}>
                          BASE
                        </span>
                      )}
                      <span
                        className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: layer.pdfUrl ? '#22C55E' : '#EAB308' }}
                        title={layer.pdfUrl ? 'PDF disponível' : 'Sem PDF (modo demo)'}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                    style={{ color: layer.visible ? 'var(--white)' : 'var(--slate)' }}
                  >
                    {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>

                {/* Color picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--slate)' }}>Cor</span>
                  <div className="flex gap-1 ml-auto">
                    {OVERLAY_COLORS.map(c => (
                      <button
                        key={c}
                        className="w-4 h-4 rounded-full transition-all"
                        style={{
                          background: c,
                          outline: layer.color === c ? `2px solid white` : 'none',
                          outlineOffset: '1px',
                        }}
                        onClick={() => updateLayer(layer.id, { color: c })}
                      />
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--slate)' }}>Opacidade</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--white)' }}>{layer.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity}
                    onChange={e => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: layer.color }}
                  />
                </div>
              </Card>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addLayer} className="w-full justify-center">
            <Plus size={14} /> Adicionar Documento
          </Button>
        </div>

        {/* Right panel – stacked canvases */}
        <div className="flex-1 rounded-xl overflow-auto bg-white border relative p-4 flex items-center justify-center" style={{ borderColor: 'var(--surface-border)' }}>
          {rendering && (
            <div className="absolute inset-0 bg-[#0d1825]/40 backdrop-blur-xs flex items-center justify-center z-30">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          )}

          {error && (
            <div className="absolute inset-x-4 top-4 p-4 rounded-xl text-sm z-20" style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}>
              {error}
            </div>
          )}

          {visibleLayers.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--slate)' }}>
              Nenhuma camada visível
            </div>
          ) : (
            <div
              className="relative shadow-lg"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                maxWidth: '100%',
                aspectRatio: `${dimensions.width}/${dimensions.height}`
              }}
            >
              {/* Stacked Tinted Canvases */}
              {visibleLayers.map(layer => {
                const canvas = tintedCanvases[layer.id]
                if (!canvas) return null
                return (
                  <div
                    key={layer.id}
                    className="absolute inset-0 transition-opacity duration-150"
                    style={{ opacity: layer.opacity / 100 }}
                  >
                    {/* Render raw canvas directly in DOM */}
                    <canvas
                      ref={el => {
                        if (!el) return
                        el.width = canvas.width
                        el.height = canvas.height
                        el.getContext('2d')?.drawImage(canvas, 0, 0)
                      }}
                      className="w-full h-full block"
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Remove text mode hint */}
          {removeText && (
            <div className="absolute bottom-4 left-4 right-4 text-center z-20">
              <div className="inline-block text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(249,115,22,0.9)', color: 'white' }}>
                Modo "Remover Textos" ativado · Apenas linhas e hachuras visíveis
              </div>
            </div>
          )}

          {/* Layer legend */}
          <div className="absolute top-3 right-3 space-y-1 z-20">
            {visibleLayers.map(l => (
              <div key={l.id} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                <span className="font-mono" style={{ color: l.color }}>{l.code.split('-')[2] || l.discipline}</span>
                <span className="opacity-60">{l.opacity}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
