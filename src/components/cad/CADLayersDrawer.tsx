/**
 * CADLayersDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Gaveta lateral de Gerenciamento de Camadas (Layers) para arquivos DWG/DXF.
 * Permite ligar/desligar, congelar/descongelar, bloquear e isolar camadas
 * com visualização das cores oficiais do projeto.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import {
  X, Layers, Eye, EyeOff, Lock, Unlock, Snowflake, Sun,
  Search, ShieldAlert, Sparkles, Filter
} from 'lucide-react'
import type { AcApLayerSummary } from '@mlightcad/cad-simple-viewer'

const ACI_COLORS: Record<number, string> = {
  1: '#EF4444', // Red
  2: '#EAB308', // Yellow
  3: '#22C55E', // Green
  4: '#06B6D4', // Cyan
  5: '#3B82F6', // Blue
  6: '#D946EF', // Magenta
  7: '#FFFFFF', // White/Black
  8: '#64748B', // Dark Grey
  9: '#94A3B8', // Light Grey
}

export function parseCADColor(colorStr: string): string {
  if (!colorStr) return '#FFFFFF'
  if (colorStr.startsWith('#')) return colorStr
  if (colorStr.toLowerCase().startsWith('rgb:')) {
    const parts = colorStr.slice(4).split(',')
    if (parts.length === 3) return `rgb(${parts.join(',')})`
  }
  const aci = parseInt(colorStr, 10)
  if (!isNaN(aci) && ACI_COLORS[aci]) return ACI_COLORS[aci]
  return '#94A3B8'
}

interface CADLayersDrawerProps {
  layers: AcApLayerSummary[]
  onToggleLayerOn: (layerName: string, currentlyOn: boolean) => void
  onToggleLayerFrozen: (layerName: string, currentlyFrozen: boolean) => void
  onToggleLayerLocked: (layerName: string, currentlyLocked: boolean) => void
  onIsolateLayer: (layerName: string) => void
  onTurnAllOn: () => void
  onTurnAllOffExceptCurrent: () => void
  onThawAll: () => void
  onClose: () => void
}

export default function CADLayersDrawer({
  layers,
  onToggleLayerOn,
  onToggleLayerFrozen,
  onToggleLayerLocked,
  onIsolateLayer,
  onTurnAllOn,
  onTurnAllOffExceptCurrent,
  onThawAll,
  onClose,
}: CADLayersDrawerProps) {
  const [search, setSearch] = useState('')

  const filteredLayers = layers.filter(
    l => l.name.toLowerCase().includes(search.toLowerCase())
  )

  const onCount = layers.filter(l => l.on.toLowerCase() === 'yes').length

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
          <Layers size={16} className="text-orange-400" />
          <span className="text-xs font-bold text-white">Camadas do Desenho (Layers)</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="p-3 border-b border-slate-800 space-y-2 text-xs">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar camada por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none bg-slate-900 border border-slate-800 text-white placeholder-slate-500"
          />
        </div>

        {/* Global toggles */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-slate-400 font-mono">
            {onCount} de {layers.length} ligadas
          </span>
          <div className="flex items-center gap-2 font-medium">
            <button
              onClick={onTurnAllOn}
              className="text-orange-400 hover:text-orange-300 transition-colors"
              title="Ligar todas as camadas"
            >
              Ligar Todas
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={onTurnAllOffExceptCurrent}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              title="Desligar todas exceto a camada ativa"
            >
              Desligar Resto
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={onThawAll}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
              title="Descongelar todas"
            >
              Descongelar
            </button>
          </div>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {filteredLayers.map((layer) => {
          const isOn = layer.on.toLowerCase() === 'yes'
          const isFrozen = layer.frozen.toLowerCase() === 'yes'
          const isLocked = layer.locked.toLowerCase() === 'yes'
          const isCurrent = layer.current === '*'
          const colorHex = parseCADColor(layer.color)

          return (
            <div
              key={layer.name}
              className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all border ${
                isOn
                  ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-white'
                  : 'bg-slate-950/40 hover:bg-slate-900/40 border-slate-900 text-slate-500 opacity-60'
              }`}
            >
              {/* Left: Color dot, current badge & name */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-black/40 shadow-sm"
                  style={{ background: colorHex }}
                  title={`Cor oficial: ${layer.color}`}
                />
                <div className="truncate">
                  <div className="font-medium truncate text-xs flex items-center gap-1.5">
                    <span className="truncate">{layer.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40">
                        CLAYER
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* On/Off */}
                <button
                  onClick={() => onToggleLayerOn(layer.name, isOn)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isOn ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-600 hover:bg-white/5'
                  }`}
                  title={isOn ? 'Desligar camada' : 'Ligar camada'}
                >
                  {isOn ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* Freeze/Thaw */}
                <button
                  onClick={() => onToggleLayerFrozen(layer.name, isFrozen)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isFrozen ? 'text-cyan-400 hover:bg-cyan-500/20' : 'text-slate-600 hover:bg-white/5'
                  }`}
                  title={isFrozen ? 'Descongelar camada' : 'Congelar camada'}
                >
                  {isFrozen ? <Snowflake size={14} /> : <Sun size={14} />}
                </button>

                {/* Lock/Unlock */}
                <button
                  onClick={() => onToggleLayerLocked(layer.name, isLocked)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLocked ? 'text-amber-400 hover:bg-amber-500/20' : 'text-slate-600 hover:bg-white/5'
                  }`}
                  title={isLocked ? 'Desbloquear camada' : 'Bloquear camada'}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>

                {/* Isolate */}
                <button
                  onClick={() => onIsolateLayer(layer.name)}
                  className="px-1.5 py-1 rounded text-[10px] bg-slate-800 hover:bg-orange-500/20 hover:text-orange-400 text-slate-400 font-semibold transition-colors ml-1 border border-slate-700/60"
                  title="Isolar esta camada (desliga todas as outras)"
                >
                  Isolar
                </button>
              </div>
            </div>
          )
        })}

        {filteredLayers.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            Nenhuma camada encontrada com esse nome.
          </div>
        )}
      </div>
    </div>
  )
}
