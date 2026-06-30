import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, Plus, Eye, EyeOff, Move, Palette } from 'lucide-react'
import { Card, Button, PdfViewer } from '../../components/ui'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import { SEED_PROJECT_ID } from '../../context/AppContext'
import { MOCK_DRAWINGS } from '../../data/mockData'

const OVERLAY_COLORS = ['#EF4444','#22C55E','#F97316','#3B82F6','#EAB308','#8B5CF6','#06B6D4','#000000']

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
  const projectId = currentProject.id === 'proj-043' ? SEED_PROJECT_ID : currentProject.id
  const { drawings } = useDrawings(projectId)

  const baseDrawing = (id ? drawings.find(d => d.id === id) : null) || MOCK_DRAWINGS[0]

  // Pick a second drawing for the initial overlay (different discipline)
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
      opacity: 56,
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
      opacity: 60,
      visible: true,
      isBase: false,
      pdfUrl: unused.pdfUrl || null,
    }])
  }

  const visibleLayers = layers.filter(l => l.visible)

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
        <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
          {/* Options */}
          <Card className="p-3">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--white)' }}>Opções</div>

            {/* Page selector */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs" style={{ color: 'var(--slate)' }}>Página</span>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--slate)' }}
              >‹</button>
              <span className="text-xs font-mono" style={{ color: 'var(--white)' }}>{page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--slate)' }}
              >›</button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className="w-8 h-4 rounded-full relative transition-all cursor-pointer"
                style={{ background: removeText ? 'var(--orange)' : 'var(--surface-border)' }}
                onClick={() => setRemoveText(!removeText)}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                  style={{ background: 'white', left: removeText ? '17px' : '2px' }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--slate)' }}>
                Remover textos do PDF
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
                      {/* PDF status dot */}
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
                  <Palette size={12} style={{ color: 'var(--slate)' }} />
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

                <button className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--slate)' }}>
                  <Move size={12} /> Ajustar posição
                </button>
              </Card>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addLayer} className="w-full justify-center">
            <Plus size={14} /> Adicionar Documento
          </Button>
        </div>

        {/* Right panel – stacked PDFs */}
        <div className="flex-1 rounded-xl overflow-hidden relative" style={{ background: '#f8f5f0', minHeight: '400px' }}>
          {visibleLayers.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ color: 'var(--slate)' }}>
              <span className="text-sm">Nenhuma camada visível</span>
            </div>
          ) : (
            // Stack PDFs using CSS mix-blend-mode multiply
            visibleLayers.map((layer, i) => (
              <div
                key={layer.id}
                className="absolute inset-0"
                style={{ mixBlendMode: i === 0 ? 'normal' : 'multiply' }}
              >
                <PdfViewer
                  url={layer.pdfUrl}
                  page={page}
                  tint={layer.color}
                  opacity={layer.opacity}
                  className="w-full h-full"
                  style={{ height: '100%', background: i === 0 ? '#f8f5f0' : 'transparent' }}
                />
              </div>
            ))
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
