/**
 * PdfViewer — renderiza uma página de PDF em <canvas> usando pdfjs-dist v4+
 *
 * Props:
 *   url        — URL pública do PDF (Supabase Storage ou qualquer HTTPS)
 *   page       — número da página (1-indexed, default 1)
 *   scale      — escala de renderização (default 1.5 → ~144 DPI)
 *   style      — CSS inline no wrapper
 *   className  — classe no wrapper
 *   label      — badge sobreposto no canto superior esquerdo
 *   tint       — cor para o header decorativo (hex, ex: '#3B82F6')
 *   opacity    — 0–100, aplicado no canvas (para sobreposição)
 *   fallback   — ReactNode mostrado enquanto não há URL real
 */
import React, { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'

// ── Worker ────────────────────────────────────────────────────────────────────
// pdfjs v6 exporta GlobalWorkerOptions; o worker deve ser configurado
// antes da primeira chamada. Usamos o worker bundled da CDN do unpkg para
// evitar problemas de CORS com o worker local.
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

interface PdfViewerProps {
  url?: string | null
  page?: number
  scale?: number
  style?: React.CSSProperties
  className?: string
  label?: string
  tint?: string
  opacity?: number          // 0–100
  fallback?: React.ReactNode
}

export default function PdfViewer({
  url,
  page = 1,
  scale = 1.5,
  style,
  className = '',
  label,
  tint = '#F97316',
  opacity = 100,
  fallback,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!url) {
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    ;(async () => {
      try {
        const loadingTask = pdfjs.getDocument({
          url,
          // CORS: Supabase Storage returns proper CORS headers for public buckets
          withCredentials: false,
        })
        const pdf = await loadingTask.promise
        if (cancelled) return

        const pdfPage = await pdf.getPage(Math.min(page, pdf.numPages))
        if (cancelled) return

        const viewport = pdfPage.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await pdfPage.render({ canvas, canvasContext: ctx, viewport }).promise
        if (!cancelled) setStatus('ok')
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus('error')
          setErrMsg(err instanceof Error ? err.message : String(err))
        }
      }
    })()

    return () => { cancelled = true }
  }, [url, page, scale])

  // ── Render ─────────────────────────────────────────────────────────────────
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...style,
  }

  // Show fallback placeholder when no URL is provided
  if (!url) {
    return (
      <div className={`flex flex-col ${className}`} style={wrapperStyle}>
        {fallback ?? <DefaultPlaceholder label={label} tint={tint} />}
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`} style={wrapperStyle}>
      {/* PDF canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: opacity / 100,
          display: status === 'ok' ? 'block' : 'none',
        }}
      />

      {/* Loading state */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: '#0d1825' }}>
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: tint, borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: tint }}>Carregando PDF…</span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4"
          style={{ background: '#0d1825' }}>
          <span className="text-2xl">⚠️</span>
          <span className="text-xs text-center" style={{ color: '#EF4444' }}>
            Não foi possível carregar o PDF
          </span>
          <span className="text-xs text-center opacity-60" style={{ color: '#EF4444' }}>
            {errMsg}
          </span>
        </div>
      )}

      {/* Label badge */}
      {label && (
        <div
          className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded font-semibold z-10"
          style={{ background: tint + 'DD', color: 'white' }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

// ── Default placeholder (when no URL, demo mode) ───────────────────────────────
function DefaultPlaceholder({ label, tint = '#F97316' }: { label?: string; tint?: string }) {
  return (
    <div className="flex-1 flex flex-col" style={{ background: '#1a2333', border: `1px solid ${tint}44` }}>
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center justify-between border-b text-xs flex-shrink-0"
        style={{ background: `${tint}22`, borderColor: `${tint}44` }}
      >
        <span style={{ color: tint }}>{label || 'PDF'}</span>
        <span className="font-mono font-bold text-xs opacity-60" style={{ color: tint }}>
          sem arquivo
        </span>
      </div>

      {/* SVG floor plan preview */}
      <div className="flex-1 relative overflow-hidden p-4">
        <svg width="100%" height="100%" viewBox="0 0 400 300" style={{ opacity: 0.5 }}>
          <rect x="30" y="30" width="340" height="240" fill="none" stroke={tint} strokeWidth="2" />
          <line x1="160" y1="30" x2="160" y2="200" stroke={tint} strokeWidth="1.5" />
          <line x1="30" y1="150" x2="160" y2="150" stroke={tint} strokeWidth="1.5" />
          <line x1="250" y1="30" x2="250" y2="160" stroke={tint} strokeWidth="1.5" />
          <line x1="160" y1="200" x2="370" y2="200" stroke={tint} strokeWidth="1.5" />
          <line x1="30" y1="20" x2="370" y2="20" stroke={tint} strokeWidth="0.5" />
          <text x="200" y="16" textAnchor="middle" fill={tint} fontSize="8">8.50m</text>
          <text x="90" y="90" textAnchor="middle" fill={tint} fontSize="9">SALA</text>
          <text x="90" y="178" textAnchor="middle" fill={tint} fontSize="9">QUARTO 01</text>
          <text x="205" y="90" textAnchor="middle" fill={tint} fontSize="9">COZINHA</text>
          <text x="310" y="90" textAnchor="middle" fill={tint} fontSize="9">VARANDA</text>
          <text x="265" y="228" textAnchor="middle" fill={tint} fontSize="9">QUARTO 02</text>
          <rect x="30" y="260" width="340" height="30" fill="none" stroke={tint} strokeWidth="0.5" opacity="0.3" />
          <text x="200" y="278" textAnchor="middle" fill={tint} fontSize="7" opacity="0.6">
            Modo demonstração · Faça upload do PDF no Supabase Storage
          </text>
        </svg>
      </div>
    </div>
  )
}
