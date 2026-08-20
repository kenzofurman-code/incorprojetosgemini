/**
 * lib/viabilidade/salesCohortEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Coortes de Venda e Recebíveis:
 *  - Transforma Venda Econômica (VSO / absorção mensal) em Fluxo Financeiro Real
 *  - Modela recebimento de Sinal, Mensais de Obra, Balões e Financiamento Bancário / Chaves
 *  - Suporta rastreamento completo de qual coorte gerou cada recebimento mensal
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SalesModel, MilestoneGraphModel } from '../../types/viabilidade'

export interface SalesCohortRecord {
  saleMonth: number // Mês em que a venda foi realizada
  soldVgv: number // VGV vendido nesta coorte (R$)
  soldUnitsEstimate: number
  receiptsByMonth: Record<number, {
    downPayment: number
    monthlyInstallments: number
    balloons: number
    keysAndRepasse: number
    total: number
  }>
}

export interface SalesCohortResult {
  monthlySoldVgv: number[] // VGV vendido em cada mês 1..N
  monthlyAccumulatedVgv: number[]
  monthlyAccumulatedPct: number[]
  monthlyDownPaymentReceipts: number[]
  monthlyInstallmentReceipts: number[]
  monthlyBalloonReceipts: number[]
  monthlyKeysAndRepasseReceipts: number[]
  monthlyTotalReceipts: number[]
  cohorts: SalesCohortRecord[]
}

/**
 * Processa a curva de absorção e gera o fluxo de recebíveis por coortes.
 */
export function generateSalesCohorts(
  totalVgvToSell: number,
  totalUnitsCount: number,
  sales: SalesModel,
  milestones: MilestoneGraphModel,
  totalMonths: number
): SalesCohortResult {
  const launchMonth = Math.max(1, milestones.launchMonth || 1)
  const keysMonth = Math.max(launchMonth + 1, milestones.keysDeliveryMonth || milestones.totalProjectMonths)
  
  const monthlySoldVgv: number[] = new Array(totalMonths).fill(0)
  const cohorts: SalesCohortRecord[] = []

  // 1. Simulação da Curva de Vendas (VSO)
  let remainingVgv = totalVgvToSell
  let accumulatedSold = 0

  for (let m = 1; m <= totalMonths; m++) {
    if (m < launchMonth) {
      monthlySoldVgv[m - 1] = 0
      continue
    }

    if (remainingVgv <= 1) {
      monthlySoldVgv[m - 1] = 0
      continue
    }

    let soldInMonth = 0

    if (m === launchMonth) {
      // Venda do Mês de Lançamento
      const launchPct = Math.min(100, Math.max(0, sales.launchSalesPct || 25)) / 100
      soldInMonth = Math.min(remainingVgv, totalVgvToSell * launchPct)
    } else {
      // VSO mensal sobre o total ou estoque
      const vsoPct = Math.min(100, Math.max(0, sales.monthlyAbsorptionVsoPct || 5)) / 100
      soldInMonth = Math.min(remainingVgv, totalVgvToSell * vsoPct)
    }

    // Se estiver no último mês de vendas e restar pouco, fecha a conta
    if (m >= keysMonth && remainingVgv > 0) {
      soldInMonth = Math.min(remainingVgv, Math.max(soldInMonth, remainingVgv * 0.35))
    }

    remainingVgv -= soldInMonth
    accumulatedSold += soldInMonth
    monthlySoldVgv[m - 1] = soldInMonth
  }

  // 2. Desdobramento de cada Coorte em Recebíveis por Condição Comercial
  const plan = sales.paymentPlan
  const downPaymentFactor = (plan.downPaymentPct || 10) / 100
  const monthlyInstallmentsFactor = (plan.constructionInstallmentsPct || 15) / 100
  const balloonFactor = (plan.balloonInstallmentsPct || 10) / 100
  const keysRepasseFactor = (plan.keysDeliveryPct + plan.bankFinancingRepassePct || 65) / 100

  const monthlyDownPaymentReceipts = new Array(totalMonths).fill(0)
  const monthlyInstallmentReceipts = new Array(totalMonths).fill(0)
  const monthlyBalloonReceipts = new Array(totalMonths).fill(0)
  const monthlyKeysAndRepasseReceipts = new Array(totalMonths).fill(0)
  const monthlyTotalReceipts = new Array(totalMonths).fill(0)

  for (let m = 1; m <= totalMonths; m++) {
    const cohortVgv = monthlySoldVgv[m - 1]
    if (cohortVgv <= 0) continue

    const cohortRecord: SalesCohortRecord = {
      saleMonth: m,
      soldVgv: cohortVgv,
      soldUnitsEstimate: totalVgvToSell > 0 ? Math.round((cohortVgv / totalVgvToSell) * totalUnitsCount) : 0,
      receiptsByMonth: {},
    }

    // A. Sinal / Entrada no próprio mês da venda
    const downPaymentAmount = cohortVgv * downPaymentFactor
    monthlyDownPaymentReceipts[m - 1] += downPaymentAmount

    // B. Mensais durante o período entre a venda e a entrega das chaves
    const monthsUntilKeys = Math.max(1, keysMonth - m)
    const totalInstallmentsAmount = cohortVgv * monthlyInstallmentsFactor
    const monthlyInstallmentValue = totalInstallmentsAmount / monthsUntilKeys

    // C. Balões / Intermediárias (a cada 6 meses entre a venda e as chaves)
    const totalBalloonsAmount = cohortVgv * balloonFactor
    const balloonInterval = 6
    const balloonMonths: number[] = []
    for (let b = m + balloonInterval; b < keysMonth; b += balloonInterval) {
      balloonMonths.push(b)
    }
    const singleBalloonValue = balloonMonths.length > 0 ? totalBalloonsAmount / balloonMonths.length : 0

    // D. Chaves e Financiamento Bancário / Repasse
    const keysRepasseAmount = cohortVgv * keysRepasseFactor
    // Se a venda ocorreu após as chaves, o repasse ocorre 1 mês após a venda
    const effectiveKeysMonth = m <= keysMonth ? keysMonth : m + 1

    // Preenche a projeção mensal da coorte
    for (let targetM = 1; targetM <= totalMonths; targetM++) {
      let dp = 0
      let mi = 0
      let bl = 0
      let kr = 0

      if (targetM === m) {
        dp = downPaymentAmount
      }

      if (targetM > m && targetM <= keysMonth) {
        mi = monthlyInstallmentValue
      }

      if (balloonMonths.includes(targetM)) {
        bl = singleBalloonValue
      }

      if (targetM === effectiveKeysMonth) {
        kr = keysRepasseAmount
        // Se não houve balões por prazo curto, incorpora no repasse
        if (balloonMonths.length === 0 && totalBalloonsAmount > 0) {
          kr += totalBalloonsAmount
        }
      }

      const monthSum = dp + mi + bl + kr
      if (monthSum > 0) {
        cohortRecord.receiptsByMonth[targetM] = {
          downPayment: dp,
          monthlyInstallments: mi,
          balloons: bl,
          keysAndRepasse: kr,
          total: monthSum,
        }

        monthlyInstallmentReceipts[targetM - 1] += mi
        monthlyBalloonReceipts[targetM - 1] += bl
        monthlyKeysAndRepasseReceipts[targetM - 1] += kr
        monthlyTotalReceipts[targetM - 1] += monthSum
      }
    }

    cohorts.push(cohortRecord)
  }

  // 3. Totais Acumulados
  const monthlyAccumulatedVgv = new Array(totalMonths).fill(0)
  const monthlyAccumulatedPct = new Array(totalMonths).fill(0)
  let runningSold = 0

  for (let m = 0; m < totalMonths; m++) {
    runningSold += monthlySoldVgv[m]
    monthlyAccumulatedVgv[m] = runningSold
    monthlyAccumulatedPct[m] = totalVgvToSell > 0 ? Math.round((runningSold / totalVgvToSell) * 100) : 0
  }

  return {
    monthlySoldVgv,
    monthlyAccumulatedVgv,
    monthlyAccumulatedPct,
    monthlyDownPaymentReceipts,
    monthlyInstallmentReceipts,
    monthlyBalloonReceipts,
    monthlyKeysAndRepasseReceipts,
    monthlyTotalReceipts,
    cohorts,
  }
}
