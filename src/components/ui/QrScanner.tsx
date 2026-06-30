/**
 * QrScanner — abre câmera real e decodifica QR codes com jsQR.
 *
 * Props:
 *   onResult(code: string)  — chamado quando um QR é lido com sucesso
 *   onClose()               — chamado ao fechar o painel
 *   verifyCode?(code)       — função opcional para validar/enriquecer o resultado
 */
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, X, CheckCircle, AlertTriangle } from 'lucide-react'

interface QrScannerProps {
  onResult: (code: string) => void
  onClose: () => void
}

type ScanState = 'requesting' | 'scanning' | 'found' | 'error' | 'no_camera'

export default function QrScanner({ onResult, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const [state, setState] = useState<ScanState>('requesting')
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)

  // ── Start camera ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('no_camera')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setState('scanning')
        tick()
      } catch (err: unknown) {
        if (!cancelled) {
          setState('error')
          setError(err instanceof Error ? err.message : 'Sem permissão de câmera')
        }
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [])

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  // ── Decode loop ─────────────────────────────────────────────────────────────
  function tick() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code?.data) {
      setState('found')
      setResult(code.data)
      stopCamera()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  function handleConfirm() {
    if (result) {
      onResult(result)
      onClose()
    }
  }

  function handleRetry() {
    setResult(null)
    setState('requesting')
    // Restart — remount trick via key would work, but we re-init manually
    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: 'environment' },
    }).then(stream => {
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().then(() => {
          setState('scanning')
          tick()
        })
      }
    }).catch(err => {
      setState('error')
      setError(err.message)
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--surface-card)', border: '1px solid rgba(249,115,22,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--white)' }}>
          <span style={{ color: 'var(--orange)' }}>▣</span>
          Leitura de QR Code
        </div>
        <button
          onClick={() => { stopCamera(); onClose() }}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'var(--slate)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Viewfinder */}
      <div
        className="relative rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: '#060d18', height: 220, border: '1px solid var(--surface-border)' }}
      >
        {/* Live video */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          style={{ display: state === 'scanning' ? 'block' : 'none' }}
        />
        {/* Off-screen canvas for decode */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Corner brackets */}
        {(state === 'scanning' || state === 'requesting') && (
          <>
            <div className="absolute top-3 left-3 w-7 h-7 border-l-2 border-t-2" style={{ borderColor: 'var(--orange)' }} />
            <div className="absolute top-3 right-3 w-7 h-7 border-r-2 border-t-2" style={{ borderColor: 'var(--orange)' }} />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-l-2 border-b-2" style={{ borderColor: 'var(--orange)' }} />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-r-2 border-b-2" style={{ borderColor: 'var(--orange)' }} />
            {/* Scan line animation */}
            {state === 'scanning' && (
              <div
                className="absolute left-4 right-4 h-0.5 opacity-70 animate-bounce"
                style={{ background: 'var(--orange)', top: '50%' }}
              />
            )}
          </>
        )}

        {/* States */}
        {state === 'requesting' && (
          <div className="text-center z-10">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: 'var(--orange)', borderTopColor: 'transparent' }} />
            <p className="text-xs" style={{ color: 'var(--orange)' }}>Iniciando câmera…</p>
          </div>
        )}
        {(state === 'no_camera' || state === 'error') && (
          <div className="text-center px-4 z-10">
            <Camera size={32} className="mx-auto mb-2" style={{ color: 'var(--slate)' }} />
            <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
              {state === 'no_camera' ? 'Câmera não disponível' : 'Erro ao acessar câmera'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>{error}</p>
          </div>
        )}
        {state === 'found' && result && (
          <div className="text-center px-4 z-10">
            <CheckCircle size={36} color="#22C55E" className="mx-auto mb-2" />
            <p className="text-xs font-bold font-mono" style={{ color: '#22C55E' }}>{result}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>QR Code detectado!</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {state === 'found' && result ? (
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--surface-mid)', color: 'var(--slate)', border: '1px solid var(--surface-border)' }}
          >
            Nova leitura
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--orange)', color: 'white' }}
          >
            Confirmar
          </button>
        </div>
      ) : (state === 'error' || state === 'no_camera') ? (
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--surface-mid)', color: 'var(--slate)', border: '1px solid var(--surface-border)' }}
          >
            Tentar novamente
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--surface-mid)', color: 'var(--slate)', border: '1px solid var(--surface-border)' }}
          >
            Fechar
          </button>
        </div>
      ) : (
        <p className="text-xs text-center" style={{ color: 'var(--slate)' }}>
          Aponte a câmera para o QR Code da prancha
        </p>
      )}
    </div>
  )
}
