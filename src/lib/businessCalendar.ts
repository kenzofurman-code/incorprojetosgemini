/**
 * lib/businessCalendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Calendário de Dias Úteis (Segunda a Sexta).
 * Pula sábados e domingos no cálculo de datas de início, término e durações.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0: Domingo, 6: Sábado
}

/** Retorna a data ajustada para dia útil (se cair em fim de semana, avança para segunda) */
export function getNextBusinessDay(dateStr: string): string {
  const d = parseDate(dateStr)
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1)
  }
  return formatDateISO(d)
}

/** Retorna a data ajustada para o dia útil anterior (se cair em fim de semana, recua para sexta) */
export function getPrevBusinessDay(dateStr: string): string {
  const d = parseDate(dateStr)
  while (isWeekend(d)) {
    d.setDate(d.getDate() - 1)
  }
  return formatDateISO(d)
}

/**
 * Adiciona ou subtrai dias úteis a partir de uma data inicial.
 * Ex: addBusinessDays('2026-05-01', 5) adiciona 5 dias úteis pulando fins de semana.
 */
export function addBusinessDays(startDateStr: string, days: number): string {
  if (days === 0) return getNextBusinessDay(startDateStr)

  const d = parseDate(startDateStr)
  const step = days > 0 ? 1 : -1
  let remaining = Math.abs(days)

  // Se a data de partida cair em fim de semana, ajusta primeiro
  while (isWeekend(d)) {
    d.setDate(d.getDate() + step)
  }

  while (remaining > 0) {
    d.setDate(d.getDate() + step)
    if (!isWeekend(d)) {
      remaining--
    }
  }

  return formatDateISO(d)
}

/**
 * Calcula a diferença em dias úteis entre duas datas (inclusive).
 * Se início e fim forem na mesma data útil, retorna 1.
 */
export function diffBusinessDays(startDateStr: string, endDateStr: string): number {
  const start = parseDate(startDateStr)
  const end = parseDate(endDateStr)

  if (start.getTime() > end.getTime()) {
    return -diffBusinessDays(endDateStr, startDateStr)
  }

  let count = 0
  const curr = new Date(start)

  while (curr.getTime() <= end.getTime()) {
    if (!isWeekend(curr)) {
      count++
    }
    curr.setDate(curr.getDate() + 1)
  }

  return Math.max(1, count)
}

/** Diferença em dias corridos de calendário entre duas datas */
export function diffCalendarDays(startDateStr: string, endDateStr: string): number {
  const s = parseDate(startDateStr).getTime()
  const e = parseDate(endDateStr).getTime()
  return Math.round((e - s) / 86400000)
}
