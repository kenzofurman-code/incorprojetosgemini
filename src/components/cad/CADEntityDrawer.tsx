/**
 * CADEntityDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Inspeção de Entidades CAD para o visualizador DWG/DXF.
 * Exibe tipo de elemento, layer pertencente, cor, coordenadas e atributos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { X, Info, Layers, Tag, Hash, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { parseCADColor } from './CADLayersDrawer'

export interface SelectedCADEntity {
  handle?: string
  entityType: string
  layerName: string
  color?: string
  length?: number
  text?: string
  box?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

interface CADEntityDrawerProps {
  entity: SelectedCADEntity | null
  onClose: () => void
}

export default function CADEntityDrawer({ entity, onClose }: CADEntityDrawerProps) {
  const [copied, setCopied] = useState(false)

  if (!entity) return null

  const handleCopy = () => {
    const info = `Tipo: ${entity.entityType}\nLayer: ${entity.layerName}\nHandle: ${entity.handle || '-'}\nTexto: ${entity.text || '-'}\nComprimento: ${entity.length ? `${entity.length.toFixed(2)} m` : '-'}`
    navigator.clipboard.writeText(info).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const colorHex = parseCADColor(entity.color || '')

  return (
    <div
      className="absolute top-3 right-3 bottom-12 w-80 lg:w-96 rounded-2xl z-30 flex flex-col shadow-2xl overflow-hidden border border-slate-700/60"
      style={{
        background: 'rgba(15, 25, 35, 0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-orange-400" />
          <span className="text-xs font-bold text-white">Inspeção da Entidade CAD</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copiar dados da entidade"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Entity Type Card */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Tipo de Entidade</div>
          <div className="text-sm font-bold text-orange-400 font-mono">{entity.entityType}</div>
          {entity.handle && (
            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 pt-0.5">
              <Hash size={12} /> Handle: {entity.handle}
            </div>
          )}
        </div>

        {/* Layer Info */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <Layers size={12} /> Camada (Layer)
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 border border-black/40"
              style={{ background: colorHex }}
            />
            <span className="text-xs font-semibold text-white truncate">{entity.layerName}</span>
          </div>
        </div>

        {/* Text Content (if text entity) */}
        {entity.text && (
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
              <Tag size={12} /> Conteúdo do Texto
            </div>
            <div className="p-2 rounded-lg bg-black/40 text-slate-200 font-mono text-[11px] break-all border border-slate-800/80 max-h-32 overflow-y-auto">
              {entity.text}
            </div>
          </div>
        )}

        {/* Length (if line or curve) */}
        {typeof entity.length === 'number' && entity.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Comprimento Estimado</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              {entity.length.toFixed(2)} m
            </div>
          </div>
        )}

        {/* Bounding Box Coordinates */}
        {entity.box && (
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Coordenadas de Enquadramento (WCS)</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[9px]">Min (X, Y)</span>
                {entity.box.minX.toFixed(2)}, {entity.box.minY.toFixed(2)}
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[9px]">Max (X, Y)</span>
                {entity.box.maxX.toFixed(2)}, {entity.box.maxY.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
