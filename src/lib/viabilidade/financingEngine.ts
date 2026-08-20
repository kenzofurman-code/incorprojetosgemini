/**
 * lib/viabilidade/financingEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Submotor de Financiamento Bancário à Produção (PJ):
 *  - Liberação de recursos conforme medição física da obra (Drawdown)
 *  - Juros e encargos durante o período de carência/obras
 *  - Amortização e quitação da dívida pelo repasse de financiamento dos clientes
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FinancingModel, MilestoneGraphModel } from '../../types/viabilidade'
import { monthlyRateFromAnnual } from './financialMath'

export interface FinancingResult {
  monthlyDrawdowns: number[]
  monthlyInterestAndFees: number[]
  monthlyAmortizations: number[]
  monthlyOutstandingBalance: number[]
  totalInterestPaid: number
  totalPrincipalDrawn: number
}

export function calculateProductionFinancing(
  financing: FinancingModel,
  milestones: MilestoneGraphModel,
  constructionDisbursements: number[],
  customerKeysAndFinancingReceipts: number[],
  totalMonths: number
): FinancingResult {
  const monthlyDrawdowns = new Array(totalMonths).fill(0)
  const monthlyInterestAndFees = new Array(totalMonths).fill(0)
  const monthlyAmortizations = new Array(totalMonths).fill(0)
  const monthlyOutstandingBalance = new Array(totalMonths).fill(0)

  if (!financing.enabled) {
    return {
      monthlyDrawdowns,
      monthlyInterestAndFees,
      monthlyAmortizations,
      monthlyOutstandingBalance,
      totalInterestPaid: 0,
      totalPrincipalDrawn: 0,
    }
  }

  const coveragePct = Math.min(100, Math.max(0, financing.maxFinancingPctOfConstruction || 70)) / 100
  const annualRate = (financing.annualInterestRatePct || 11.5) / 100
  const monthlyRate = monthlyRateFromAnnual(annualRate)
  const inspectionFee = financing.bankInspectionMonthlyFee || 0

  const constrStart = Math.max(1, milestones.constructionStartMonth || 1)
  const constrEnd = Math.min(totalMonths, constrStart + (milestones.constructionDurationMonths || 24) - 1)
  const keysMonth = Math.max(constrEnd, milestones.keysDeliveryMonth || totalMonths)

  let balance = 0
  let totalInterest = 0
  let totalDrawn = 0

  for (let m = 1; m <= totalMonths; m++) {
    // 1. Liberação do Mês (Drawdown conforme medição da obra)
    let draw = 0
    if (m >= constrStart && m <= constrEnd) {
      const constrCostMonth = constructionDisbursements[m - 1] || 0
      draw = constrCostMonth * coveragePct
      totalDrawn += draw
    }
    monthlyDrawdowns[m - 1] = draw

    // Saldo com a liberação do mês antes dos juros
    const preInterestBalance = balance + draw

    // 2. Juros e Encargos sobre o Saldo Devedor
    let interest = 0
    if (preInterestBalance > 0) {
      interest = preInterestBalance * monthlyRate + (m >= constrStart && m <= constrEnd ? inspectionFee : 0)
      totalInterest += interest
    }
    monthlyInterestAndFees[m - 1] = interest

    // 3. Amortização (Quitação pelo repasse dos clientes no Habite-se / Chaves)
    let amort = 0
    if (m >= keysMonth && preInterestBalance > 0) {
      const repasseAvailable = customerKeysAndFinancingReceipts[m - 1] || 0
      amort = Math.min(preInterestBalance, repasseAvailable)
      // Se sobrou saldo após as chaves, amortiza nos meses seguintes
      if (amort === 0 && preInterestBalance > 0 && m > keysMonth) {
        amort = Math.min(preInterestBalance, preInterestBalance * 0.35)
      }
    }
    monthlyAmortizations[m - 1] = amort

    // 4. Saldo Devedor Final do Mês
    balance = Math.max(0, preInterestBalance - amort)
    monthlyOutstandingBalance[m - 1] = balance
  }

  return {
    monthlyDrawdowns,
    monthlyInterestAndFees,
    monthlyAmortizations,
    monthlyOutstandingBalance,
    totalInterestPaid: totalInterest,
    totalPrincipalDrawn: totalDrawn,
  }
}
