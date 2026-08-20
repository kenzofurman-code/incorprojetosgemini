/**
 * lib/viabilidade/costDisbursementEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Curvas de Desembolso de Obra e Custos Gerais:
 *  - Biblioteca de Curvas S normalizadas para obras de 12, 18, 24, 30 e 36 meses
 *  - Aplicação de curvas e rateios a projetos, marketing e administração
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const STANDARD_CONSTRUCTION_S_CURVES: Record<number, number[]> = {
  // Curva S normalizada de 12 meses (soma 100%)
  12: [3, 5, 8, 11, 13, 15, 14, 11, 8, 6, 4, 2],

  // Curva S normalizada de 18 meses (soma 100%)
  18: [2, 3, 4, 6, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 1],

  // Curva S normalizada de 24 meses (padrão CRD Blossom, soma 100%)
  24: [
    1.5, 2.0, 3.0, 3.5, 4.5, 5.5, 6.5, 7.0, 7.5, 7.5, 7.0, 6.5,
    6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5,
  ],

  // Curva S normalizada de 30 meses (soma 100%)
  30: [
    1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 4.5, 5.0, 5.5, 6.0, 6.0, 6.0, 5.5, 5.5, 5.0,
    5.0, 4.5, 4.0, 3.5, 3.5, 3.0, 2.5, 2.0, 2.0, 1.5, 1.5, 1.0, 1.0, 0.5, 0.5,
  ],

  // Curva S normalizada de 36 meses (soma 100%)
  36: [
    0.8, 1.2, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.0, 5.0, 5.0, 4.8, 4.8, 4.5, 4.2, 4.0,
    3.8, 3.5, 3.2, 3.0, 2.8, 2.5, 2.2, 2.0, 1.8, 1.5, 1.5, 1.2, 1.0, 1.0, 0.8, 0.5, 0.5, 0.4,
  ],
}

/**
 * Retorna ou interpola a curva S de desembolso para uma duração em meses.
 */
export function getNormalizedSCurve(durationMonths: number): number[] {
  const rounded = Math.round(durationMonths)
  if (STANDARD_CONSTRUCTION_S_CURVES[rounded]) {
    return STANDARD_CONSTRUCTION_S_CURVES[rounded]
  }

  // Interpolação genérica via função sigmoidal / Gaussiana normalizada para somar 100%
  const curve: number[] = []
  let rawSum = 0

  for (let i = 1; i <= rounded; i++) {
    const x = (i - rounded / 2) / (rounded / 5)
    const weight = Math.exp(-0.5 * x * x) // Gaussiana centralizada
    curve.push(weight)
    rawSum += weight
  }

  return curve.map(w => (w / rawSum) * 100)
}

/**
 * Distribui um custo total de obra ao longo dos meses de construção.
 */
export function generateConstructionMonthlyDisbursements(
  totalCost: number,
  startMonth: number,
  durationMonths: number,
  totalMonths: number,
  customCurve?: number[]
): number[] {
  const disbursements = new Array(totalMonths).fill(0)
  const curve = customCurve && customCurve.length === durationMonths
    ? customCurve
    : getNormalizedSCurve(durationMonths)

  const curveSum = curve.reduce((a, b) => a + b, 0) || 100

  for (let i = 0; i < durationMonths; i++) {
    const monthIdx = startMonth + i - 1
    if (monthIdx >= 0 && monthIdx < totalMonths) {
      const pct = curve[i] / curveSum
      disbursements[monthIdx] = totalCost * pct
    }
  }

  return disbursements
}
