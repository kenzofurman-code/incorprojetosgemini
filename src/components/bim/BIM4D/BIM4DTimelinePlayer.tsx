import { useMemo } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Gauge,
  CalendarDays,
  HardHat,
  CheckCircle2,
} from 'lucide-react'
import type { BIM4DPlayerState, BIM4DTimeScale, CronogramaObra4D } from '../../../types/bim4d'

export interface BIM4DTimelinePlayerProps {
  cronograma: CronogramaObra4D
  playerState: BIM4DPlayerState
  dateRange: { start: string; end: string }
  onTogglePlay: () => void
  onSetSpeed: (speed: number) => void
  onSetTimeScale: (scale: BIM4DTimeScale) => void
  onSetDate: (dateStr: string) => void
  onReset: () => void
}

export default function BIM4DTimelinePlayer({
  cronograma,
  playerState,
  dateRange,
  onTogglePlay,
  onSetSpeed,
  onSetTimeScale,
  onSetDate,
  onReset,
}: BIM4DTimelinePlayerProps) {
  // Conversão de datas para timestamp
  const startTs = useMemo(() => new Date(dateRange.start).getTime(), [dateRange.start])
  const endTs = useMemo(() => new Date(dateRange.end).getTime(), [dateRange.end])
  const currentTs = useMemo(
    () => new Date(playerState.currentDate).getTime(),
    [playerState.currentDate]
  )

  const totalDuration = endTs - startTs || 1
  const currentProgress = Math.min(
    100,
    Math.max(0, ((currentTs - startTs) / totalDuration) * 100)
  )

  // Formatação de data em português
  const formattedDate = useMemo(() => {
    try {
      const [year, month, day] = playerState.currentDate.split('-')
      const d = new Date(Number(year), Number(month) - 1, Number(day))
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return playerState.currentDate
    }
  }, [playerState.currentDate])

  // Atividades em andamento na data corrente
  const activeActivities = useMemo(() => {
    const curr = new Date(playerState.currentDate).getTime()
    return cronograma.atividades.filter(a => {
      const s = new Date(a.dataInicio).getTime()
      const e = new Date(a.dataFim).getTime()
      return curr >= s && curr <= e
    })
  }, [cronograma.atividades, playerState.currentDate])

  // Marcadores de meses na linha do tempo
  const monthMarkers = useMemo(() => {
    const list: Array<{ label: string; percent: number; dateStr: string }> = []
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)

    const curr = new Date(start.getFullYear(), start.getMonth(), 1)
    while (curr <= end) {
      const ts = curr.getTime()
      if (ts >= startTs && ts <= endTs) {
        const percent = ((ts - startTs) / totalDuration) * 100
        const label = curr.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        const dateStr = curr.toISOString().slice(0, 10)
        list.push({ label: `${label}/${curr.getFullYear().toString().slice(2)}`, percent, dateStr })
      }
      curr.setMonth(curr.getMonth() + 1)
    }
    return list
  }, [dateRange, startTs, endTs, totalDuration])

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value)
    const targetTs = startTs + (val / 100) * totalDuration
    const targetDate = new Date(targetTs).toISOString().slice(0, 10)
    onSetDate(targetDate)
  }

  function handleStep(days: number) {
    const curr = new Date(playerState.currentDate)
    curr.setDate(curr.getDate() + days)
    const targetDate = curr.toISOString().slice(0, 10)
    if (targetDate >= dateRange.start && targetDate <= dateRange.end) {
      onSetDate(targetDate)
    }
  }

  return (
    <div className="bg-slate-950/95 border-t border-slate-800 px-5 py-3 text-slate-200 select-none shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 z-40">
      {/* ── Linha Superior do Player: Data, Progresso e Atividades Ativas ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Data Atual da Simulação */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <CalendarDays size={16} className="text-blue-400" />
            <span className="text-sm font-black text-white capitalize tracking-wide font-mono">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Progresso Físico:</span>
            <span className="text-blue-400 font-bold font-mono">
              {Math.round(currentProgress)}%
            </span>
          </div>
        </div>

        {/* Atividades ativas nesta data */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-xl py-0.5">
          {activeActivities.length === 0 ? (
            <span className="text-xs text-slate-500 italic">
              Nenhuma etapa em execução nesta data
            </span>
          ) : (
            activeActivities.slice(0, 3).map(act => (
              <span
                key={act.id}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 flex-shrink-0 animate-pulse"
              >
                <HardHat size={11} />
                <span className="truncate max-w-[160px]">{act.nome}</span>
              </span>
            ))
          )}
          {activeActivities.length > 3 && (
            <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-800">
              +{activeActivities.length - 3} mais
            </span>
          )}
        </div>

        {/* Controles de Velocidade e Escala */}
        <div className="flex items-center gap-2">
          {/* Escala */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px]">
            {(['mensal', 'semanal', 'diario'] as BIM4DTimeScale[]).map(sc => (
              <button
                key={sc}
                onClick={() => onSetTimeScale(sc)}
                className={`px-2 py-0.5 rounded-md font-semibold capitalize transition-colors cursor-pointer ${
                  playerState.timeScale === sc
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>

          {/* Velocidade */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs">
            <Gauge size={13} className="text-slate-400" />
            <select
              value={playerState.speed}
              onChange={e => onSetSpeed(Number(e.target.value))}
              className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Barra de Tempo (Scrub Slider) ─────────────────────────────────── */}
      <div className="relative flex flex-col gap-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={currentProgress}
            onChange={handleSliderChange}
            className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-blue-500 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${currentProgress}%, #1E293B ${currentProgress}%, #1E293B 100%)`,
            }}
          />
        </div>

        {/* Marcadores de Mês ao Longo da Linha */}
        <div className="relative w-full h-3.5 text-[9px] text-slate-500 font-mono pointer-events-none">
          {monthMarkers.map((m, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${m.percent}%` }}
            >
              <span className="h-1 w-px bg-slate-700 mb-0.5" />
              <span className="capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Botões de Controle e Navegação ────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Voltar ao início da obra"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => handleStep(-15)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Recuar 15 dias"
          >
            <SkipBack size={14} />
          </button>

          {/* Botão Principal Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
              playerState.isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            {playerState.isPlaying ? (
              <>
                <Pause size={14} />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Simular 4D</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleStep(15)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Avançar 15 dias"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Resumo de Conclusão */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>
              <strong className="text-white">{playerState.completedActivitiesCount}</strong>{' '}
              etapas concluídas
            </span>
          </div>
          <div className="flex items-center gap-1">
            <HardHat size={13} className="text-amber-400" />
            <span>
              <strong className="text-white">{playerState.activeActivitiesCount}</strong> em
              andamento
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
