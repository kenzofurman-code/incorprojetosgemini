/**
 * utils/formatters.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Formatadores padronizados para moeda brasileira (BRL), números e percentuais.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function formatCurrency(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,0%'
  }

  return `${formatNumber(value, decimals)}%`
}
