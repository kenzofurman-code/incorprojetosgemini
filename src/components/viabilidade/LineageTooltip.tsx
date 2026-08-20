/**
 * components/viabilidade/LineageTooltip.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tooltip sutil e informativo exibido no hover de qualquer KPI ou linha de cálculo:
 *  - Exibe a fórmula semântica resumida e a fonte de dados
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface LineageTooltipProps {
  formula: string
  source?: string
  children?: React.ReactNode
}

export default function LineageTooltip({ formula, source, children }: LineageTooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-flex items-center group cursor-pointer"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || <HelpCircle size={13} className="text-slate-500 hover:text-orange-400 transition-colors" />}

      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-950/95 border border-orange-500/40 rounded-xl shadow-2xl z-50 text-[11px] text-slate-200 pointer-events-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="font-semibold text-orange-400 mb-1 flex items-center gap-1.5">
            <span>📐 Fórmula de Cálculo</span>
          </div>
          <div className="font-mono text-[10px] bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 text-slate-300 mb-1.5 leading-relaxed">
            {formula}
          </div>
          {source && (
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Fonte:</span>
              <span className="text-slate-300 font-medium">{source}</span>
            </div>
          )}
          <div className="text-[9px] text-orange-300/80 mt-1 text-center font-medium">
            (Clique para abrir o raio-x detalhado)
          </div>
        </div>
      )}
    </div>
  )
}
