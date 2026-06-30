import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, GitCompare, Info } from 'lucide-react'
import { Card, Button, PdfViewer } from '../../components/ui'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import { SEED_PROJECT_ID } from '../../context/AppContext'
import { MOCK_DRAWINGS } from '../../data/mockData'

export default function Comparar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useApp()
  const projectId = currentProject.id === 'proj-043' ? SEED_PROJECT_ID : currentProject.id

  const { drawings } = useDrawings(projectId)
  const drawing = (id ? drawings.find(d => d.id === id) : null) || MOCK_DRAWINGS[0]

  const versions = drawing.versions || []
  const latestRev = drawing.revision
  const [revLeft, setRevLeft] = useState(
    versions.length > 1 ? versions[versions.length - 2].revision : versions[0]?.revision || 'R00'
  )
  const [revRight, setRevRight] = useState(latestRev)
  const [page, setPage] = useState(1)

  // Three-panel slider
  const [sliderPos, setSliderPos] = useState(33)
  const [sliderPos2, setSliderPos2] = useState(66)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    if (dragging === 'left') {
      setSliderPos(Math.max(15, Math.min(pct, sliderPos2 - 10)))
    } else {
      setSliderPos2(Math.max(sliderPos + 10, Math.min(pct, 85)))
    }
  }, [dragging, sliderPos, sliderPos2])

  const stopDrag = useCallback(() => setDragging(null), [])

  // Resolve PDF URLs from version list
  const leftVersion  = versions.find(v => v.revision === revLeft)
  const rightVersion = versions.find(v => v.revision === revRight)
  const leftUrl  = leftVersion?.pdfUrl  || drawing.pdfUrl || null
  const rightUrl = rightVersion?.pdfUrl || drawing.pdfUrl || null

  return (
    <div className="space-y-4 h-full flex flex-col">
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
            <GitCompare size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Comparar Revisões
            </span>
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>
            {drawing.code.replace(drawing.revision, '').replace(/-$/, '')}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Page selector */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: 'var(--white)' }}>Pág. {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs p-2 rounded-lg"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <Info size={12} style={{ color: 'var(--slate)' }} />
            <span style={{ color: 'var(--slate)' }}>Arraste as barras para comparar</span>
          </div>
        </div>
      </div>

      {/* Version selectors */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <Card className="p-3">
          <div className="text-xs mb-2" style={{ color: 'var(--slate)' }}>Versão Esquerda</div>
          <select
            value={revLeft}
            onChange={e => setRevLeft(e.target.value)}
            className="w-full text-sm rounded px-2 py-1.5 outline-none font-mono"
            style={{ background: 'var(--surface-mid)', border: '1px solid #3B82F6', color: '#3B82F6' }}
          >
            {versions.map(v => (
              <option key={v.revision} value={v.revision}>{v.revision}</option>
            ))}
            {versions.length === 0 && <option value={revLeft}>{revLeft}</option>}
          </select>
        </Card>
        <Card className="p-3" style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
          <div className="text-xs mb-2" style={{ color: 'var(--orange)' }}>
            Centro – Diferenças destacadas
          </div>
          <div className="text-xs font-mono font-bold" style={{ color: 'var(--orange)' }}>
            AUTO
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs mb-2" style={{ color: 'var(--slate)' }}>Versão Direita</div>
          <select
            value={revRight}
            onChange={e => setRevRight(e.target.value)}
            className="w-full text-sm rounded px-2 py-1.5 outline-none font-mono"
            style={{ background: 'var(--surface-mid)', border: '1px solid #22C55E', color: '#22C55E' }}
          >
            {versions.map(v => (
              <option key={v.revision} value={v.revision}>{v.revision}</option>
            ))}
            {versions.length === 0 && <option value={revRight}>{revRight}</option>}
          </select>
        </Card>
      </div>

      {/* Revision history pills */}
      {versions.length > 0 && (
        <Card className="p-3 flex-shrink-0">
          <div className="text-xs mb-2 font-semibold" style={{ color: 'var(--slate)' }}>
            Histórico de Revisões
          </div>
          <div className="flex gap-2 flex-wrap">
            {versions.map(v => (
              <button
                key={v.revision}
                onClick={() => { if (v.revision !== revRight) setRevLeft(v.revision) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: v.revision === revRight || v.revision === revLeft ? 'var(--navy-mid)' : 'var(--surface-mid)',
                  border: `1px solid ${v.revision === revRight ? '#22C55E' : v.revision === revLeft ? '#3B82F6' : 'var(--surface-border)'}`,
                  color: v.revision === revRight ? '#22C55E' : v.revision === revLeft ? '#3B82F6' : 'var(--slate)',
                }}
              >
                <span className="font-mono font-bold">{v.revision}</span>
                <span>{new Date(v.sentAt).toLocaleDateString('pt-BR')}</span>
                <span className={v.status === 'aprovado' || v.status === 'liberado_para_obra' ? 'text-green-400' : 'text-yellow-400'}>
                  {v.status === 'aprovado' || v.status === 'liberado_para_obra' ? '✓' : '…'}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Three-panel comparison viewer */}
      <div
        ref={containerRef}
        className="flex-1 relative rounded-xl overflow-hidden select-none"
        style={{ minHeight: '400px', background: '#0d1825', border: '1px solid var(--surface-border)' }}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {/* Left panel — older revision */}
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
          <PdfViewer
            url={leftUrl}
            page={page}
            tint="#3B82F6"
            label={`VERSÃO ${revLeft}`}
            className="w-full h-full"
            style={{ height: '100%' }}
          />
        </div>

        {/* Left divider */}
        <div
          className="absolute inset-y-0 compare-slider flex items-center justify-center z-20"
          style={{ left: `${sliderPos}%`, width: '3px', background: '#3B82F6', cursor: 'ew-resize' }}
          onMouseDown={() => setDragging('left')}
        >
          <div className="absolute flex items-center justify-center w-7 h-7 rounded-full shadow-lg"
            style={{ background: '#3B82F6' }}>
            <div className="flex gap-0.5">
              <ChevronLeft size={10} color="white" />
              <ChevronRight size={10} color="white" />
            </div>
          </div>
        </div>

        {/* Center panel — diff overlay */}
        <div
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: `${sliderPos}%`, width: `${sliderPos2 - sliderPos}%` }}
        >
          {/* Show right PDF with blue-orange mix filter hint */}
          <PdfViewer
            url={rightUrl}
            page={page}
            tint="#F97316"
            label={`${revLeft} → ${revRight}`}
            opacity={70}
            className="w-full h-full"
            style={{ height: '100%' }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'rgba(249,115,22,0.08)', mixBlendMode: 'multiply' }}
          />
          <div className="absolute top-8 left-0 right-0 flex items-center justify-center pointer-events-none">
            <div className="text-xs px-2 py-1 rounded font-semibold"
              style={{ background: 'rgba(249,115,22,0.9)', color: 'white' }}>
              HIGHLIGHT DE DIFERENÇAS
            </div>
          </div>
        </div>

        {/* Right divider */}
        <div
          className="absolute inset-y-0 compare-slider flex items-center justify-center z-20"
          style={{ left: `${sliderPos2}%`, width: '3px', background: '#22C55E', cursor: 'ew-resize' }}
          onMouseDown={() => setDragging('right')}
        >
          <div className="absolute flex items-center justify-center w-7 h-7 rounded-full shadow-lg"
            style={{ background: '#22C55E' }}>
            <div className="flex gap-0.5">
              <ChevronLeft size={10} color="white" />
              <ChevronRight size={10} color="white" />
            </div>
          </div>
        </div>

        {/* Right panel — latest revision */}
        <div className="absolute inset-y-0 right-0 overflow-hidden" style={{ left: `${sliderPos2}%`, right: 0 }}>
          <PdfViewer
            url={rightUrl}
            page={page}
            tint="#22C55E"
            label={`VERSÃO ${revRight}`}
            className="w-full h-full"
            style={{ height: '100%' }}
          />
        </div>

        {/* Panel labels at top */}
        <div className="absolute top-0 left-0 right-0 flex pointer-events-none z-10">
          <div className="text-xs font-semibold px-3 py-1"
            style={{ width: `${sliderPos}%`, background: 'rgba(59,130,246,0.8)', color: 'white', textAlign: 'center' }}>
            {revLeft}
          </div>
          <div className="text-xs font-semibold px-3 py-1"
            style={{ width: `${sliderPos2 - sliderPos}%`, background: 'rgba(249,115,22,0.8)', color: 'white', textAlign: 'center' }}>
            DIFF
          </div>
          <div className="text-xs font-semibold px-3 py-1 flex-1"
            style={{ background: 'rgba(34,197,94,0.8)', color: 'white', textAlign: 'center' }}>
            {revRight}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${id}/revisao`)}>
          Abrir para Revisão
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${id}/sobrepor`)}>
          Ir para Sobreposição
        </Button>
        <Button size="sm" className="ml-auto">
          Exportar Comparação
        </Button>
      </div>
    </div>
  )
}
