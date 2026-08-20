/**
 * lib/viabilidade/financialMath.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor Matemático Financeiro Puro:
 *  - VPL (Valor Presente Líquido / NPV)
 *  - TIR (Taxa Interna de Retorno / IRR) com convergência robusta (Newton-Raphson + Bisseção)
 *  - Exposição Máxima de Caixa e Mês de Pico
 *  - Payback (Mês de Recuperação do Capital)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Calcula o VPL (Valor Presente Líquido / NPV) de uma série de fluxos mensais.
 * @param monthlyRate Taxa de desconto mensal (ex: 0.009488 para 12% a.a.)
 * @param cashflows Array com os fluxos mensais a partir do mês 0 ou 1
 */
export function calculateNPV(monthlyRate: number, cashflows: number[]): number {
  if (!cashflows || cashflows.length === 0) return 0
  let npv = 0
  for (let t = 0; t < cashflows.length; t++) {
    npv += cashflows[t] / Math.pow(1 + monthlyRate, t)
  }
  return npv
}

/**
 * Calcula a derivada do VPL em relação à taxa para o método de Newton-Raphson.
 */
function npvDerivative(rate: number, cashflows: number[]): number {
  let dNpv = 0
  for (let t = 1; t < cashflows.length; t++) {
    dNpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1)
  }
  return dNpv
}

/**
 * Calcula a TIR Mensal (IRR) de uma série de fluxos de caixa.
 * Retorna a taxa decimal mensal (ex: 0.024 para 2.4% a.m.).
 */
export function calculateMonthlyIRR(cashflows: number[], guess: number = 0.02): number {
  if (!cashflows || cashflows.length < 2) return 0

  // Verifica se há pelo menos uma entrada positiva e uma saída negativa
  const hasPositive = cashflows.some(cf => cf > 0.01)
  const hasNegative = cashflows.some(cf => cf < -0.01)
  if (!hasPositive || !hasNegative) return 0

  let rate = guess
  const maxIterations = 100
  const tolerance = 1e-7

  // 1. Tentativa via Newton-Raphson
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(rate, cashflows)
    if (Math.abs(npv) < tolerance) {
      return rate
    }

    const dNpv = npvDerivative(rate, cashflows)
    if (Math.abs(dNpv) < 1e-12) break // Derivada quase zero, fallback para bisseção

    const newRate = rate - npv / dNpv
    if (isNaN(newRate) || !isFinite(newRate) || newRate <= -0.999 || newRate > 5.0) {
      break
    }

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate
    }
    rate = newRate
  }

  // 2. Fallback robusto via Bisseção
  let low = -0.5
  let high = 2.0
  let npvLow = calculateNPV(low, cashflows)
  let npvHigh = calculateNPV(high, cashflows)

  // Se não há troca de sinal no intervalo inicial, expande
  if (npvLow * npvHigh > 0) {
    low = -0.95
    high = 5.0
    npvLow = calculateNPV(low, cashflows)
    npvHigh = calculateNPV(high, cashflows)
    if (npvLow * npvHigh > 0) return 0
  }

  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2
    const npvMid = calculateNPV(mid, cashflows)

    if (Math.abs(npvMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid
    }

    if (npvLow * npvMid < 0) {
      high = mid
      npvHigh = npvMid
    } else {
      low = mid
      npvLow = npvMid
    }
  }

  return (low + high) / 2
}

/**
 * Converte taxa mensal para taxa anualizada composta: (1 + i)^12 - 1
 */
export function annualizeMonthlyRate(monthlyRate: number): number {
  if (monthlyRate <= -1) return -1
  return Math.pow(1 + monthlyRate, 12) - 1
}

/**
 * Converte taxa anual para taxa mensal composta: (1 + i)^(1/12) - 1
 */
export function monthlyRateFromAnnual(annualRate: number): number {
  if (annualRate <= -1) return -1
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

/**
 * Calcula a Exposição Máxima de Caixa (pico negativo acumulado) e o mês em que ocorre.
 */
export function calculateCashExposure(accumulatedCashflows: number[]): { maxExposure: number; month: number } {
  let minBalance = 0
  let minMonth = 0

  for (let t = 0; t < accumulatedCashflows.length; t++) {
    const bal = accumulatedCashflows[t]
    if (bal < minBalance) {
      minBalance = bal
      minMonth = t + 1 // Mês 1-indexado
    }
  }

  return {
    maxExposure: Math.abs(minBalance),
    month: minMonth || 1,
  }
}

/**
 * Calcula o mês de Payback (mês em que o saldo acumulado deixa de ser negativo e se torna positivo).
 */
export function calculatePaybackMonth(accumulatedCashflows: number[]): number {
  let hadNegative = false
  for (let t = 0; t < accumulatedCashflows.length; t++) {
    if (accumulatedCashflows[t] < -100) {
      hadNegative = true
    } else if (hadNegative && accumulatedCashflows[t] >= 0) {
      return t + 1 // Mês 1-indexado de retorno
    }
  }
  return hadNegative ? accumulatedCashflows.length : 1
}
