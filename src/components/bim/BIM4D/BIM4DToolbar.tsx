import {
  Clock,
  Maximize2,
  Minimize2,
  Link,
  Sparkles,
  Layers,
} from 'lucide-react'

export interface BIM4DToolbarProps {
  is4DActive: boolean
  isPresentationMode: boolean
  selectedElementsCount: number
  selectedActivityName?: string
  onToggle4D: () => void
  onTogglePresentationMode: () => void
  onVincularSelecao: () => void
}

export default function BIM4DToolbar({
  is4DActive,
  isPresentationMode,
  selectedElementsCount,
  selectedActivityName,
  onToggle4D,
  onTogglePresentationMode,
  onVincularSelecao,
}: BIM4DToolbarProps) {
  return (
    <>
      {/* ── Botões na Barra Superior do Visualizador ─────────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Toggle Modo 4D */}
        <button
          onClick={onToggle4D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
            is4DActive
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/30 ring-1 ring-blue-400/50'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
          }`}
          title="Ativar cockpit de simulação e planejamento BIM 4D"
        >
          <Clock size={14} className={is4DActive ? 'text-blue-200 animate-pulse' : 'text-blue-400'} />
          <span>Simulação 4D</span>
          {is4DActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
          )}
        </button>

        {/* Toggle Modo Apresentação / Tela Cheia (se 4D estiver ativo) */}
        {is4DActive && (
          <button
            onClick={onTogglePresentationMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isPresentationMode
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
            title={
              isPresentationMode
                ? 'Mostrar painéis de vinculação'
                : 'Ocultar painéis laterais e focar na simulação'
            }
          >
            {isPresentationMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isPresentationMode ? 'Painéis' : 'Apresentação'}</span>
          </button>
        )}
      </div>

      {/* ── Botão Flutuante Central de Vínculo (aparece quando há seleção) ─── */}
      {is4DActive && !isPresentationMode && selectedElementsCount > 0 && selectedActivityName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-4">
          <button
            onClick={onVincularSelecao}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white text-xs font-black shadow-2xl shadow-orange-600/40 border border-amber-400/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Link size={15} className="animate-bounce" />
            <span>
              Vincular {selectedElementsCount} peça(s) à etapa: &quot;{selectedActivityName}&quot;
            </span>
          </button>
        </div>
      )}
    </>
  )
}
