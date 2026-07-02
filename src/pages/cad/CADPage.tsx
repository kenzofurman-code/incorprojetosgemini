/**
 * CADPage.tsx
 * Página de demonstração que consome CADViewer.
 * A toolbar, o input de arquivo e o display de coordenadas são
 * totalmente externos ao componente — ele só preenche o espaço.
 */

import { useRef, useState, useCallback } from 'react'
import {
  Upload, Move, ZoomIn, ZoomOut, Maximize2, MousePointer2
} from 'lucide-react'
import CADViewer, { type CADViewerHandle } from '../../components/cad/CADViewer'
import { PageHeader } from '../../components/ui'
import type { CADCanvasClickEvent } from '../../components/cad/cadViewerCore'

export default function CADPage() {
  const viewerRef = useRef<CADViewerHandle>(null)

  const [loadedFile, setLoadedFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastClick, setLastClick] = useState<CADCanvasClickEvent | null>(null)
  const [activeMode, setActiveMode] = useState<'pan' | 'zoom' | null>(null)

  // ── Handlers de arquivo ──────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsLoading(true)
    await viewerRef.current?.loadFile(file)
    setIsLoading(false)
    // onFileLoaded e onLoadError já atualizam loadedFile/error via props
    e.target.value = '' // permite reabrir o mesmo arquivo
  }

  // ── Handler de clique no canvas ──────────────────────────────────────────
  const handleCanvasClick = useCallback((evt: CADCanvasClickEvent) => {
    setLastClick(evt)
    // evt.screenX/screenY  → posição pixel no canvas (para pins de issue)
    // evt.worldX/worldY    → coordenadas do modelo CAD (para salvar no banco)
    console.log('[CADPage] Clique no canvas:', evt)
  }, [])

  // ── Toolbar helpers ───────────────────────────────────────────────────────
  function activatePan() {
    setActiveMode('pan')
    viewerRef.current?.setPan()
  }

  function activateZoom() {
    setActiveMode('zoom')
    viewerRef.current?.setZoom()
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <PageHeader
        title="Visualizador DWG/DXF"
        subtitle="Carregue um arquivo .dwg ou .dxf para visualizar"
        actions={
          <label
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-all"
            style={{ background: 'var(--orange)', color: 'white', border: '1px solid var(--orange-dark)' }}
          >
            <Upload size={14} />
            {isLoading ? 'Carregando...' : 'Abrir arquivo'}
            <input
              type="file"
              accept=".dwg,.dxf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        }
      />

      {/* ── Toolbar de controles ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          {
            icon: <Move size={15} />,
            label: 'Pan',
            active: activeMode === 'pan',
            onClick: activatePan,
          },
          {
            icon: <ZoomIn size={15} />,
            label: 'Zoom',
            active: activeMode === 'zoom',
            onClick: activateZoom,
          },
          {
            icon: <ZoomIn size={15} />,
            label: 'Zoom +',
            active: false,
            onClick: () => viewerRef.current?.zoomIn(),
          },
          {
            icon: <ZoomOut size={15} />,
            label: 'Zoom -',
            active: false,
            onClick: () => viewerRef.current?.zoomOut(),
          },
          {
            icon: <Maximize2 size={15} />,
            label: 'Encaixar',
            active: false,
            onClick: () => { viewerRef.current?.zoomToFit(); setActiveMode(null) },
          },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
            style={{
              background: btn.active ? 'var(--navy-mid)' : 'var(--surface-card)',
              color: btn.active ? 'var(--white)' : 'var(--slate)',
              border: `1px solid ${btn.active ? 'var(--navy-light)' : 'var(--surface-border)'}`,
            }}
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}

        {/* Badge do arquivo carregado */}
        {loadedFile && (
          <span
            className="ml-auto text-xs px-2.5 py-1 rounded-lg font-mono"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            ✓ {loadedFile}
          </span>
        )}

        {error && (
          <span
            className="ml-auto text-xs px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            {error}
          </span>
        )}
      </div>

      {/* ── Canvas do viewer ─────────────────────────────────────────────── */}
      <div
        className="flex-1 rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--surface-border)', minHeight: 400 }}
      >
        <CADViewer
          ref={viewerRef}
          containerClassName="w-full h-full"
          background={0x1c2b3a}
          onFileLoaded={name => setLoadedFile(name)}
          onLoadError={(err, name) => setError(`Erro ao abrir "${name}": ${err.message}`)}
          onCanvasClick={handleCanvasClick}
        />
      </div>

      {/* ── Display de coordenadas do último clique ───────────────────────── */}
      {lastClick && (
        <div
          className="flex items-center gap-4 px-4 py-2.5 rounded-lg text-xs font-mono"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            color: 'var(--slate)',
          }}
        >
          <MousePointer2 size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />
          <span>
            Tela: <span style={{ color: 'var(--white)' }}>
              x={lastClick.screenX.toFixed(0)}px, y={lastClick.screenY.toFixed(0)}px
            </span>
          </span>
          <span>
            Modelo CAD: <span style={{ color: 'var(--orange)' }}>
              X={lastClick.worldX.toFixed(4)}, Y={lastClick.worldY.toFixed(4)}
            </span>
          </span>
          <span className="ml-auto" style={{ color: '#334155', fontSize: '10px' }}>
            (coordenadas prontas para fixar pins de issue)
          </span>
        </div>
      )}
    </div>
  )
}
