/**
 * CADLayoutsBar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Barra inferior de abas de Layouts (Model Space vs Paper Space / Pranchas).
 * No estilo clássico do AutoCAD para alternar entre o modelo 1:1 e as pranchas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Grid, FileText } from 'lucide-react'

export interface CADLayoutItem {
  name: string
  isModel: boolean
}

interface CADLayoutsBarProps {
  layouts: CADLayoutItem[]
  activeLayout: string
  onSelectLayout: (layoutName: string) => void
}

export default function CADLayoutsBar({
  layouts,
  activeLayout,
  onSelectLayout,
}: CADLayoutsBarProps) {
  if (layouts.length === 0) return null

  return (
    <div
      className="absolute bottom-2 left-3 right-3 h-9 rounded-xl z-20 flex items-center px-2 gap-1.5 overflow-x-auto shadow-lg border border-slate-800"
      style={{
        background: 'rgba(15, 25, 35, 0.90)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1 select-none flex-shrink-0">
        <Grid size={12} className="text-orange-400" />
        Espaço:
      </div>

      {layouts.map(layout => {
        const isActive = layout.name.toLowerCase() === activeLayout.toLowerCase()
        return (
          <button
            key={layout.name}
            onClick={() => onSelectLayout(layout.name)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
              isActive
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            {layout.isModel ? <Grid size={13} /> : <FileText size={13} />}
            <span>{layout.name}</span>
          </button>
        )
      })}
    </div>
  )
}
