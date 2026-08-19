/**
 * GanttHeader.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Régua de Calendário para o Gráfico de Gantt com 3 níveis de Zoom:
 *  - Zoom 1 (Amplo): 5px/dia (visão geral anual/semestral)
 *  - Zoom 2 (Semanal/Mensal): 15px/dia (padrão de coordenação)
 *  - Zoom 3 (Diário): 34px/dia (detalhamento diário com fins de semana)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react'
import { parseDate, isWeekend, formatDateISO } from '../../../lib/businessCalendar'

export type GanttZoomLevel = 1 | 2 | 3

export const ZOOM_PX_PER_DAY: Record<GanttZoomLevel, number> = {
  1: 6,   // Amplo
  2: 18,  // Semanal/Mensal
  3: 36,  // Diário
}

interface GanttHeaderProps {
  minDate: string
  totalDays: number
  zoom: GanttZoomLevel
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAY_LETTERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function GanttHeader({ minDate, totalDays, zoom }: GanttHeaderProps) {
  const pxPerDay = ZOOM_PX_PER_DAY[zoom]
  const totalWidth = totalDays * pxPerDay

  // Gera estrutura de meses e dias
  const { monthHeaders, dayHeaders } = useMemo(() => {
    const startDate = parseDate(minDate)
    const months: { label: string; left: number; width: number }[] = []
    const days: { label: string; left: number; width: number; isWeekend: boolean; isToday: boolean; dateStr: string }[] = []

    const todayStr = formatDateISO(new Date())

    let currentMonth = -1
    let currentYear = -1
    let monthStartDayIndex = 0

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)

      const m = d.getMonth()
      const y = d.getFullYear()
      const dateStr = formatDateISO(d)
      const isWk = isWeekend(d)
      const isTd = dateStr === todayStr

      // Novo mês detectado
      if (m !== currentMonth || y !== currentYear) {
        if (currentMonth !== -1) {
          const daysInMonth = i - monthStartDayIndex
          months.push({
            label: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
            left: monthStartDayIndex * pxPerDay,
            width: daysInMonth * pxPerDay,
          })
        }
        currentMonth = m
        currentYear = y
        monthStartDayIndex = i
      }

      // Headers de dias / semanas conforme zoom
      if (zoom === 3) {
        // Diário
        days.push({
          label: `${String(d.getDate()).padStart(2, '0')}\n${DAY_LETTERS[d.getDay()]}`,
          left: i * pxPerDay,
          width: pxPerDay,
          isWeekend: isWk,
          isToday: isTd,
          dateStr,
        })
      } else if (zoom === 2) {
        // Semanal (a cada 7 dias ou segundas-feiras)
        if (d.getDay() === 1 || i === 0) {
          days.push({
            label: `S${Math.ceil(d.getDate() / 7)} (${String(d.getDate()).padStart(2, '0')}/${String(m + 1).padStart(2, '0')})`,
            left: i * pxPerDay,
            width: 7 * pxPerDay,
            isWeekend: false,
            isToday: isTd,
            dateStr,
          })
        }
      }
    }

    // Último mês
    if (currentMonth !== -1) {
      const daysInMonth = totalDays - monthStartDayIndex
      months.push({
        label: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
        left: monthStartDayIndex * pxPerDay,
        width: daysInMonth * pxPerDay,
      })
    }

    return { monthHeaders: months, dayHeaders: days }
  }, [minDate, totalDays, zoom, pxPerDay])

  return (
    <div
      className="relative sticky top-0 z-20 border-b select-none"
      style={{
        width: totalWidth,
        height: zoom === 1 ? 32 : 52,
        background: 'var(--surface-mid, #131f2b)',
        borderColor: 'var(--surface-border, #1e293b)',
      }}
    >
      {/* Linha superior: Meses */}
      <div className="relative h-6 border-b border-slate-800">
        {monthHeaders.map((m, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 flex items-center px-2 text-xs font-bold text-slate-300 border-r border-slate-800 truncate"
            style={{ left: m.left, width: m.width }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Linha inferior: Dias ou Semanas */}
      {zoom !== 1 && (
        <div className="relative h-6">
          {dayHeaders.map((d, idx) => (
            <div
              key={idx}
              className={`absolute top-0 bottom-0 flex flex-col items-center justify-center text-[10px] border-r border-slate-800/80 font-mono transition-colors ${
                d.isToday
                  ? 'bg-orange-500/20 text-orange-400 font-bold'
                  : d.isWeekend
                  ? 'bg-slate-950/40 text-slate-500'
                  : 'text-slate-400'
              }`}
              style={{ left: d.left, width: d.width }}
            >
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
