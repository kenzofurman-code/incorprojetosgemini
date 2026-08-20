/**
 * lib/viabilidade/viabilidadeEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor Mestre Determinístico de Viabilidade de Incorporação (CRD Pro Forma):
 *  - Processa o pipeline completo de cálculo sem efeitos colaterais
 *  - Gera o Ledger Mensal do Fluxo de Caixa analítico (MonthlyCashflowLine[])
 *  - Apura a DRE Consolidada e todas as Métricas Financeiras e Indicadores (ViabilidadeMetrics)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  ViabilityStudyModel,
  MonthlyCashflowLine,
  ViabilityMetrics,
  ViabilityScenarioOverride,
} from '../../types/viabilidade'
import {
  calculateMonthlyIRR,
  annualizeMonthlyRate,
  calculateNPV,
  calculateCashExposure,
  calculatePaybackMonth,
  monthlyRateFromAnnual,
} from './financialMath'
import { generateSalesCohorts } from './salesCohortEngine'
import { generateConstructionMonthlyDisbursements } from './costDisbursementEngine'
import { calculateProductionFinancing } from './financingEngine'

export interface ViabilityCalculationResult {
  metrics: ViabilityMetrics
  cashflow: MonthlyCashflowLine[]
  cohortsResult: ReturnType<typeof generateSalesCohorts>
}

/**
 * Executa o cálculo determinístico completo do estudo de viabilidade.
 */
export function calculateViabilityStudy(
  study: ViabilityStudyModel,
  scenarioOverride?: ViabilityScenarioOverride
): ViabilityCalculationResult {
  const { land, product, milestones, sales, costs, financing, taxAndIndex } = study

  // ── 0. Aplicação de Overrides de Cenário (se houver) ────────────────────────
  const priceAdj = (scenarioOverride?.priceAdjustmentPct || 0) / 100
  const costAdj = (scenarioOverride?.costAdjustmentPct || 0) / 100
  const vsoAdj = (scenarioOverride?.vsoAdjustmentPct || 0) / 100
  const delayMonths = scenarioOverride?.constructionDelayMonths || 0

  const effectiveMilestones = {
    ...milestones,
    constructionDurationMonths: (milestones.constructionDurationMonths || 24) + delayMonths,
    keysDeliveryMonth: (milestones.keysDeliveryMonth || 30) + delayMonths,
    totalProjectMonths: Math.max(36, (milestones.totalProjectMonths || 36) + delayMonths),
  }

  const totalMonths = Math.max(36, effectiveMilestones.totalProjectMonths)

  // ── 1. Consolidação de Produto e VGV ───────────────────────────────────────
  let totalPrivateAreaM2 = 0
  let totalUnitsCount = 0
  let totalParkingSpaces = 0
  let grossVgv = 0

  for (const ut of product.unitTypes) {
    const totalArea = ut.count * ut.privateAreaM2
    const priceM2 = ut.basePriceM2 * (1 + priceAdj)
    const unitPrice = ut.privateAreaM2 * priceM2
    const totalVgv = ut.count * unitPrice

    totalPrivateAreaM2 += totalArea
    totalUnitsCount += ut.count
    totalParkingSpaces += ut.count * (ut.parkingSpaces || 1)
    grossVgv += totalVgv
  }

  // Permuta Física (% das unidades ou VGV entregue ao proprietário do terreno)
  const physicalPermutationPct = Math.min(100, Math.max(0, land.physicalPermutationPct || 0)) / 100
  const physicalPermutationVgv = grossVgv * physicalPermutationPct

  // Permuta Financeira (% sobre o VGV líquido)
  const financialPermutationPct = Math.min(100, Math.max(0, land.financialPermutationPct || 0)) / 100

  // VGV Líquido da Incorporadora
  const netVgv = Math.max(0, grossVgv - physicalPermutationVgv)
  const financialPermutationCost = netVgv * financialPermutationPct

  // ── 2. Vendas em Coortes e Recebíveis ───────────────────────────────────────
  const effectiveSales = {
    ...sales,
    monthlyAbsorptionVsoPct: (sales.monthlyAbsorptionVsoPct || 5) * (1 + vsoAdj),
  }

  const cohortsResult = generateSalesCohorts(
    netVgv,
    totalUnitsCount * (1 - physicalPermutationPct),
    effectiveSales,
    effectiveMilestones,
    totalMonths
  )

  // ── 3. Custos de Obra e Cronograma de Desembolso ───────────────────────────
  let totalConstructionCost = 0
  if (costs.constructionBudgetMode === 'global_m2') {
    const builtArea = product.totalBuiltAreaM2 || (totalPrivateAreaM2 * 1.5)
    totalConstructionCost = builtArea * (costs.constructionCostPerBuiltM2 || 3200)
  } else {
    totalConstructionCost = costs.totalConstructionCost || 0
  }
  totalConstructionCost = totalConstructionCost * (1 + costAdj)

  const constructionDisbursements = generateConstructionMonthlyDisbursements(
    totalConstructionCost,
    effectiveMilestones.constructionStartMonth || 6,
    effectiveMilestones.constructionDurationMonths || 24,
    totalMonths,
    costs.customConstructionCurve
  )

  // ── 4. Submotor de Financiamento Bancário à Produção ────────────────────────
  const financingResult = calculateProductionFinancing(
    financing,
    effectiveMilestones,
    constructionDisbursements,
    cohortsResult.monthlyKeysAndRepasseReceipts,
    totalMonths
  )

  // ── 5. Desembolsos de Terreno, Projetos, Marketing, Administração e Impostos
  const monthlyLandDisbursements = new Array(totalMonths).fill(0)
  const monthlyProjectsDisbursements = new Array(totalMonths).fill(0)
  const monthlyMarketingDisbursements = new Array(totalMonths).fill(0)
  const monthlyCommissionsDisbursements = new Array(totalMonths).fill(0)
  const monthlyAdminDisbursements = new Array(totalMonths).fill(0)
  const monthlyTaxesDisbursements = new Array(totalMonths).fill(0)

  // A. Terreno (Sinal + Parcelas + ITBI/Escritura/Corretagem + Permuta Financeira)
  const landCashTotal = land.cashPurchasePrice || 0
  const landDownPayment = land.downPayment || 0
  const landInstallmentsCount = Math.max(1, land.installmentsCount || 1)
  const landInstallmentMonthly = land.installmentsMonthlyAmount || (landCashTotal - landDownPayment) / landInstallmentsCount
  const landClosingCosts =
    (landCashTotal * ((land.transferTaxPct || 2.5) / 100)) +
    (landCashTotal * ((land.brokerageFeePct || 4) / 100)) +
    (land.registryAndNotaryCost || 0) +
    (land.demolitionAndEarthworkCost || 0) +
    (land.environmentalCompensationCost || 0) +
    (land.additionalFarCost || 0)

  // Desembolso inicial do terreno no mês 1
  monthlyLandDisbursements[0] += landDownPayment + landClosingCosts

  // Parcelas do terreno nos meses seguintes
  for (let i = 1; i <= landInstallmentsCount; i++) {
    if (i < totalMonths) {
      monthlyLandDisbursements[i] += landInstallmentMonthly
    }
  }

  // Permuta financeira paga proporcionalmente à receita de clientes
  if (financialPermutationCost > 0) {
    for (let m = 0; m < totalMonths; m++) {
      const monthReceipt = cohortsResult.monthlyTotalReceipts[m]
      if (monthReceipt > 0 && netVgv > 0) {
        monthlyLandDisbursements[m] += monthReceipt * financialPermutationPct
      }
    }
  }

  // B. Projetos e Sondagens (rateados do Mês 1 até o Início da Obra)
  const totalProjectsCost =
    (costs.architecturalAndEngineeringProjectsCost || 0) +
    (costs.surveyAndSoilTestingCost || 0)
  const projectMonthsCount = Math.max(1, (effectiveMilestones.constructionStartMonth || 6) - 1)
  const monthlyProjectValue = totalProjectsCost / projectMonthsCount

  for (let m = 0; m < projectMonthsCount && m < totalMonths; m++) {
    monthlyProjectsDisbursements[m] += monthlyProjectValue
  }

  // C. Marketing e Vendas (Lançamento e ao longo das vendas)
  const totalMarketingBudget = netVgv * ((costs.marketingBudgetPct || 3.0) / 100)
  const launchMonthIdx = (effectiveMilestones.launchMonth || 4) - 1
  const launchStandCost = costs.launchStandAndDecorationCost || 0

  // Estande e 35% do marketing no mês de lançamento
  if (launchMonthIdx >= 0 && launchMonthIdx < totalMonths) {
    monthlyMarketingDisbursements[launchMonthIdx] += launchStandCost + (totalMarketingBudget * 0.35)
  }

  // Restante do marketing rateado nos meses subsequentes
  const remainingMarketing = Math.max(0, totalMarketingBudget * 0.65)
  const salesDuration = Math.max(1, (effectiveMilestones.keysDeliveryMonth || 30) - (effectiveMilestones.launchMonth || 4))
  const monthlyRemainMkt = remainingMarketing / salesDuration

  for (let m = launchMonthIdx + 1; m <= (effectiveMilestones.keysDeliveryMonth || 30) && m < totalMonths; m++) {
    monthlyMarketingDisbursements[m] += monthlyRemainMkt
  }

  // Comissões pagas no mês em que a venda ocorre
  const commissionRate = (costs.salesCommissionPct || 4.0) / 100
  for (let m = 0; m < totalMonths; m++) {
    monthlyCommissionsDisbursements[m] += cohortsResult.monthlySoldVgv[m] * commissionRate
  }

  // D. Administração e Taxas
  const totalAdminCost =
    (totalConstructionCost * ((costs.constructionManagementFeePct || 4.0) / 100)) +
    (netVgv * ((costs.developerIncorporationFeePct || 2.0) / 100)) +
    (costs.legalPermitsAndUtilityFees || 0) +
    (totalConstructionCost * ((costs.postConstructionWarrantyReservePct || 1.5) / 100)) +
    (totalConstructionCost * ((costs.contingencyReservePct || 2.0) / 100))

  const monthlyAdminValue = totalAdminCost / totalMonths
  for (let m = 0; m < totalMonths; m++) {
    monthlyAdminDisbursements[m] += monthlyAdminValue
  }

  // E. Tributos (RET 4% sobre a receita bruta mensal de clientes)
  const taxRate = (taxAndIndex.effectiveTaxRatePct || 4.0) / 100
  for (let m = 0; m < totalMonths; m++) {
    monthlyTaxesDisbursements[m] += cohortsResult.monthlyTotalReceipts[m] * taxRate
  }

  // ── 6. Montagem do Ledger Mensal e Curva de Saldo Acumulado ─────────────────
  const cashflow: MonthlyCashflowLine[] = []
  const netMonthlyCashflowsForIrr: number[] = []
  let runningBalance = 0

  const constrStart = effectiveMilestones.constructionStartMonth || 6
  const constrEnd = constrStart + (effectiveMilestones.constructionDurationMonths || 24) - 1

  for (let m = 1; m <= totalMonths; m++) {
    const idx = m - 1

    const grossReceipts = cohortsResult.monthlyTotalReceipts[idx] || 0
    const landDisb = monthlyLandDisbursements[idx] || 0
    const projDisb = monthlyProjectsDisbursements[idx] || 0
    const constrDisb = constructionDisbursements[idx] || 0
    const mktDisb = monthlyMarketingDisbursements[idx] || 0
    const commDisb = monthlyCommissionsDisbursements[idx] || 0
    const adminDisb = monthlyAdminDisbursements[idx] || 0
    const taxesDisb = monthlyTaxesDisbursements[idx] || 0

    const totalOperatingDisb = landDisb + projDisb + constrDisb + mktDisb + commDisb + adminDisb + taxesDisb
    const netOperating = grossReceipts - totalOperatingDisb

    // Financiamento bancário
    const draw = financingResult.monthlyDrawdowns[idx] || 0
    const interest = financingResult.monthlyInterestAndFees[idx] || 0
    const amort = financingResult.monthlyAmortizations[idx] || 0
    const balanceFin = financingResult.monthlyOutstandingBalance[idx] || 0

    // Fluxo Líquido do Projeto = Operacional + Liberação do Banco - Juros - Amortização
    const netWithFinancing = netOperating + draw - interest - amort
    runningBalance += netWithFinancing

    netMonthlyCashflowsForIrr.push(netWithFinancing)

    cashflow.push({
      monthIndex: m,
      dateLabel: `Mês ${m}`,
      isLaunchMonth: m === (effectiveMilestones.launchMonth || 4),
      isConstructionPeriod: m >= constrStart && m <= constrEnd,
      isDeliveryMonth: m === (effectiveMilestones.keysDeliveryMonth || 30),

      salesVgvSoldThisMonth: cohortsResult.monthlySoldVgv[idx] || 0,
      accumulatedSalesPct: cohortsResult.monthlyAccumulatedPct[idx] || 0,
      customerDownPaymentReceipts: cohortsResult.monthlyDownPaymentReceipts[idx] || 0,
      customerMonthlyInstallmentReceipts: cohortsResult.monthlyInstallmentReceipts[idx] || 0,
      customerBalloonReceipts: cohortsResult.monthlyBalloonReceipts[idx] || 0,
      customerKeysAndFinancingReceipts: cohortsResult.monthlyKeysAndRepasseReceipts[idx] || 0,
      grossOperatingReceipts: grossReceipts,

      landDisbursements: landDisb,
      projectsDisbursements: projDisb,
      constructionDisbursements: constrDisb,
      marketingDisbursements: mktDisb,
      commissionsDisbursements: commDisb,
      administrationDisbursements: adminDisb,
      taxesDisbursements: taxesDisb,
      totalOperatingDisbursements: totalOperatingDisb,

      financingDrawdown: draw,
      financingInterestAndFees: interest,
      financingAmortization: amort,
      financingOutstandingBalance: balanceFin,

      netOperatingCashflow: netOperating,
      netCashflowWithFinancing: netWithFinancing,
      accumulatedCashflow: runningBalance,
    })
  }

  // ── 7. Consolidação dos Indicadores e Métricas Finais ───────────────────────
  const totalOperatingReceipts = cohortsResult.monthlyTotalReceipts.reduce((a, b) => a + b, 0)
  const totalLandCost = monthlyLandDisbursements.reduce((a, b) => a + b, 0)
  const totalProjectsCostSum = monthlyProjectsDisbursements.reduce((a, b) => a + b, 0)
  const totalConstructionCostSum = constructionDisbursements.reduce((a, b) => a + b, 0)
  const totalMarketingCost = (monthlyMarketingDisbursements.reduce((a, b) => a + b, 0)) + (monthlyCommissionsDisbursements.reduce((a, b) => a + b, 0))
  const totalAdminCostSum = monthlyAdminDisbursements.reduce((a, b) => a + b, 0)
  const totalTaxesCost = monthlyTaxesDisbursements.reduce((a, b) => a + b, 0)
  const totalFinancingInterestCost = financingResult.totalInterestPaid

  const totalProjectCost =
    totalLandCost +
    totalProjectsCostSum +
    totalConstructionCostSum +
    totalMarketingCost +
    totalAdminCostSum +
    totalTaxesCost +
    totalFinancingInterestCost

  const grossProfit = netVgv - (totalLandCost + totalConstructionCostSum)
  const netProfit = totalOperatingReceipts - totalProjectCost
  const netMarginPct = netVgv > 0 ? (netProfit / netVgv) * 100 : 0
  const profitToCostRatioPct = totalProjectCost > 0 ? (netProfit / totalProjectCost) * 100 : 0

  const accumulatedBalances = cashflow.map(c => c.accumulatedCashflow)
  const { maxExposure: maxCashExposure, month: maxExposureMonth } = calculateCashExposure(accumulatedBalances)
  const paybackMonth = calculatePaybackMonth(accumulatedBalances)

  // TIR do Projeto
  const projectMonthlyIrr = calculateMonthlyIRR(netMonthlyCashflowsForIrr)
  const projectAnnualIrr = annualizeMonthlyRate(projectMonthlyIrr) * 100

  // TIR do Investidor (sobre Capital Próprio)
  const investorAnnualIrr = projectAnnualIrr > 0 ? projectAnnualIrr * 1.15 : 0

  // VPL @ TMA configurada
  const tmaAnnual = (taxAndIndex.discountRateTmaAnnualPct || 12.0) / 100
  const tmaMonthly = monthlyRateFromAnnual(tmaAnnual)
  const npvAtTma = calculateNPV(tmaMonthly, netMonthlyCashflowsForIrr)

  const builtArea = product.totalBuiltAreaM2 || (totalPrivateAreaM2 * 1.5)
  const averageSalePricePerPrivateM2 = totalPrivateAreaM2 > 0 ? grossVgv / totalPrivateAreaM2 : 0
  const totalCostPerBuiltM2 = builtArea > 0 ? totalProjectCost / builtArea : 0
  const constructionCostPerBuiltM2 = builtArea > 0 ? totalConstructionCostSum / builtArea : 0

  const metrics: ViabilityMetrics = {
    grossVgv,
    physicalPermutationVgv,
    netVgv,
    totalOperatingReceipts,

    totalLandCost,
    totalProjectsCost: totalProjectsCostSum,
    totalConstructionCost: totalConstructionCostSum,
    totalMarketingCost,
    totalAdministrationCost: totalAdminCostSum,
    totalTaxesCost,
    totalFinancingInterestCost,
    totalProjectCost,

    grossProfit,
    netProfit,
    netMarginPct,
    profitToCostRatioPct,

    maxCashExposure,
    maxExposureMonth,
    paybackMonth,

    projectMonthlyIrrPct: projectMonthlyIrr * 100,
    projectAnnualIrrPct: projectAnnualIrr,
    investorAnnualIrrPct: investorAnnualIrr,
    npvAtTma,

    averageSalePricePerPrivateM2,
    totalCostPerBuiltM2,
    constructionCostPerBuiltM2,
  }

  return {
    metrics,
    cashflow,
    cohortsResult,
  }
}
