/**
 * DrawingQrCode — gera e exibe um QR Code para uma prancha.
 *
 * Props:
 *   data     — string a codificar (código da prancha + revisão)
 *   size     — tamanho em px (default 180)
 *   label    — texto exibido abaixo do QR
 *   onSave   — callback chamado quando o QR é salvo (recebe data URL PNG)
 */
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'

interface DrawingQrCodeProps {
  data: string
  size?: number
  label?: string
  onSave?: (dataUrl: string) => void
}

export default function DrawingQrCode({ data, size = 180, label, onSave }: DrawingQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canvasRef.current || !data) return

    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: {
        dark: '#0d1825',  // matches --surface
        light: '#f8f5f0', // off-white — visible on any background
      },
      errorCorrectionLevel: 'H', // highest — survives up to 30% damage
    }).then(() => {
      const url = canvasRef.current!.toDataURL('image/png')
      setDataUrl(url)
    }).catch(err => {
      setError(err.message)
    })
  }, [data, size])

  function handleDownload() {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `qr-${data.replace(/\//g, '-')}.png`
    link.href = dataUrl
    link.click()
    onSave?.(dataUrl)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-xs rounded-lg"
        style={{ background: '#EF444422', color: '#EF4444' }}>
        Erro ao gerar QR: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* QR canvas — white bg so it prints well */}
      <div
        className="rounded-lg p-2 shadow-lg"
        style={{ background: '#f8f5f0' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* Label under QR */}
      {label && (
        <div className="text-xs font-mono text-center px-2" style={{ color: 'var(--slate)' }}>
          {label}
        </div>
      )}

      {/* Download button */}
      {dataUrl && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:brightness-110"
          style={{ background: 'var(--surface-mid)', color: 'var(--white)', border: '1px solid var(--surface-border)' }}
        >
          <Download size={12} /> Salvar PNG
        </button>
      )}
    </div>
  )
}
