import { useState, useEffect, useRef, useCallback } from 'react'
import { renderPdfPage, type RenderedPdfPage } from '../../lib/pdf-comparison'
import { updateDrawingQrCodePosition } from '../../lib/queries'
import { ZoomIn, ZoomOut, Loader2, Check, ArrowLeft } from 'lucide-react'
import { Button } from './index'
import QRCode from 'qrcode'
import type { Drawing } from '../../types'

interface QrCodePlacerProps {
  drawing: Drawing
  onSaved: () => void
  onClose: () => void
}

export default function QrCodePlacer({ drawing, onSaved, onClose }: QrCodePlacerProps) {
  const [renderedPage, setRenderedPage] = useState<RenderedPdfPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // QR Position in percentage of the canvas
  const [qrPos, setQrPos] = useState<{ x: number; y: number }>({ x: 88, y: 88 }) // Default to bottom-right (typical stamp location)

  // Zoom & Pan states
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  // Load PDF Page
  useEffect(() => {
    if (!drawing.pdfUrl) return
    let active = true
    setLoading(true)
    setError(null)

    renderPdfPage(drawing.pdfUrl, 1, false)
      .then(page => {
        if (active) {
          setRenderedPage(page)
          setLoading(false)
        }
      })
      .catch(err => {
        if (active) {
          console.error('[QrCodePlacer] Error rendering PDF:', err)
          setError('Erro ao carregar o PDF para posicionamento.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [drawing.pdfUrl])

  // Draw PDF to canvas when renderedPage loads
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !renderedPage) return
    canvas.width = renderedPage.canvas.width
    canvas.height = renderedPage.canvas.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(renderedPage.canvas, 0, 0)
    }
  }, [renderedPage])

  // Generate QR Code overlay canvas
  useEffect(() => {
    const qrCanvas = qrCanvasRef.current
    if (!qrCanvas || !drawing.code) return

    QRCode.toCanvas(qrCanvas, drawing.code, {
      width: 75,
      margin: 1,
      color: {
        dark: '#0d1825',
        light: '#f8f5f0',
      },
      errorCorrectionLevel: 'M',
    }).catch(err => console.error('[QrCodePlacer] QR generation error:', err))
  }, [drawing.code])

  // Prevent browser window zoom on Ctrl + Wheel inside the viewport
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const handleWheelPrevent = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    viewport.addEventListener('wheel', handleWheelPrevent, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', handleWheelPrevent)
    }
  }, [renderedPage])

  // Keyboard listener for Spacebar pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(true)
        e.preventDefault()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const zoomFactor = 1.15
      const nextScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor
      const clampedScale = Math.min(Math.max(nextScale, 0.25), 8)

      const rect = e.currentTarget.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const dx = mouseX - offset.x
      const dy = mouseY - offset.y

      setOffset({
        x: mouseX - dx * (clampedScale / scale),
        y: mouseY - dy * (clampedScale / scale),
      })
      setScale(clampedScale)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddleButton = e.button === 1
    const isRightButton = e.button === 2
    const canPan = spacePressed || isMiddleButton || isRightButton

    if (canPan) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      e.preventDefault()
      return
    }

    // Left click places the QR Code
    if (e.button === 0 && renderedPage) {
      const rect = e.currentTarget.getBoundingClientRect()
      const xOnViewport = e.clientX - rect.left
      const yOnViewport = e.clientY - rect.top

      // Reverse scale & offset to get coordinates relative to the base canvas size
      const xInCanvasPixels = (xOnViewport - offset.x) / scale
      const yInCanvasPixels = (yOnViewport - offset.y) / scale

      // Convert to percentage (0 - 100)
      const xPct = Math.max(0, Math.min(100, (xInCanvasPixels / renderedPage.canvas.width) * 100))
      const yPct = Math.max(0, Math.min(100, (yInCanvasPixels / renderedPage.canvas.height) * 100))

      setQrPos({ x: xPct, y: yPct })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateDrawingQrCodePosition(drawing.id, qrPos.x, qrPos.y, 1)
      onSaved()
    } catch (err) {
      console.error('[QrCodePlacer] Save error:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar a posição do QR Code no Supabase.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#070e17]/95 z-50 flex flex-col p-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={onClose}
          disabled={saving}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          style={{ color: 'var(--slate)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-white">Posicionar QR Code no Carimbo</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
            Clique sobre a prancha para escolher a posição do QR Code. Use o scroll com <kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Ctrl</kbd> para aproximar e arraste segurando Espaço para mover.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-mid)', color: 'var(--orange)', border: '1px solid rgba(249,115,22,0.3)' }}>
            Prancha: <span className="font-mono font-bold">{drawing.code}</span>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading || !renderedPage}
            className="flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirmar Posição
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}>
          {error}
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div
        ref={viewportRef}
        className={`flex-1 relative rounded-xl border overflow-hidden bg-[#0d1825] select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
        style={{ borderColor: 'var(--surface-border)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0d1825]/80 z-10">
            <Loader2 className="animate-spin text-orange-500" size={32} />
            <span className="text-xs text-slate-400">Processando e renderizando página 1 da prancha...</span>
          </div>
        )}

        {renderedPage && (
          <div
            ref={containerRef}
            className="absolute origin-top-left"
            style={{
              width: `${renderedPage.canvas.width}px`,
              height: `${renderedPage.canvas.height}px`,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: isPanning ? 'none' : 'transform 0.08s ease-out',
            }}
          >
            {/* Base Drawing Page Canvas */}
            <canvas ref={canvasRef} className="block w-full h-full shadow-2xl" />

            {/* QR Code Placement Box Overlay */}
            <div
              className="absolute pointer-events-none z-20 border-2 border-orange-500 rounded p-1 bg-[#f8f5f0] shadow-2xl animate-pulse"
              style={{
                left: `${qrPos.x}%`,
                top: `${qrPos.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '65px',
                height: '65px',
              }}
            >
              <canvas ref={qrCanvasRef} className="w-full h-full block" />
              {/* Position tag */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-500 text-[8px] font-bold text-white px-1 rounded whitespace-nowrap">
                QR CODE ({Math.round(qrPos.x)}%, {Math.round(qrPos.y)}%)
              </div>
            </div>

            {/* Placement crosshair/guidelines to make alignment extremely easy */}
            <div className="absolute pointer-events-none border-t border-dashed border-orange-500/40 w-full z-10" style={{ top: `${qrPos.y}%` }} />
            <div className="absolute pointer-events-none border-l border-dashed border-orange-500/40 h-full z-10" style={{ left: `${qrPos.x}%` }} />
          </div>
        )}

        {/* Floating Zoom controls */}
        {renderedPage && (
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-surface-mid rounded-lg p-1 border border-surface-border">
            <button
              onClick={() => setScale(s => Math.max(s / 1.3, 0.25))}
              className="p-1 hover:bg-white/10 rounded"
              title="Zoom Out"
              style={{ color: 'var(--slate)' }}
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] font-mono px-1 w-12 text-center" style={{ color: 'var(--white)' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(s * 1.3, 8))}
              className="p-1 hover:bg-white/10 rounded"
              title="Zoom In"
              style={{ color: 'var(--slate)' }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
              className="p-1 hover:bg-white/10 rounded text-[9px] font-semibold"
              style={{ color: 'var(--slate)' }}
            >
              1:1
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
