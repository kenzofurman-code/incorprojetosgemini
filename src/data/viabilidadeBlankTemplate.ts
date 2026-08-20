/**
 * data/viabilidadeBlankTemplate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Template em Branco para Novo Estudo de Viabilidade:
 *  - Estrutura limpa e pronta para preenchimento manual do zero
 *  - Defaults inteligentes com premissas de mercado recomendadas
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ViabilityStudyModel } from '../types/viabilidade'

export function createBlankViabilityStudy(projectId: string = 'proj-043'): ViabilityStudyModel {
  return {
    id: `study-${Date.now()}`,
    projectId,
    name: 'Novo Estudo de Viabilidade',
    version: 'v1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Estudo de viabilidade iniciado em branco para preenchimento manual.',

    land: {
      landAreaM2: 1200,
      zoningMaxFar: 3.5,
      basicFar: 2.0,
      additionalFarCost: 0,
      cashPurchasePrice: 3500000,
      downPayment: 700000,
      installmentsCount: 12,
      installmentsMonthlyAmount: 233333,
      physicalPermutationPct: 0,
      financialPermutationPct: 0,
      transferTaxPct: 2.5,
      brokerageFeePct: 4.0,
      registryAndNotaryCost: 45000,
      demolitionAndEarthworkCost: 120000,
      environmentalCompensationCost: 30000,
    },

    product: {
      towers: [
        {
          id: 'tower-1',
          name: 'Torre A',
          floorsCount: 10,
          unitsPerFloor: 4,
          totalUnits: 40,
          elevatorsCount: 2,
        },
      ],
      unitTypes: [
        {
          id: 'ut-1',
          name: '2 Dormitórios Tipo',
          category: '2_dorms',
          count: 32,
          privateAreaM2: 60.0,
          parkingSpaces: 1,
          basePriceM2: 11000,
          totalPrivateAreaM2: 32 * 60.0,
          unitPrice: 60.0 * 11000,
          totalVgv: 32 * 60.0 * 11000,
        },
        {
          id: 'ut-2',
          name: '3 Dormitórios c/ Suíte',
          category: '3_dorms',
          count: 8,
          privateAreaM2: 85.0,
          parkingSpaces: 2,
          basePriceM2: 11500,
          totalPrivateAreaM2: 8 * 85.0,
          unitPrice: 85.0 * 11500,
          totalVgv: 8 * 85.0 * 11500,
        },
      ],
      commonAreaM2: 1400,
      totalBuiltAreaM2: 4000,
      totalPrivateAreaM2: 2600,
      efficiencyRatio: 0.65,
      totalUnitsCount: 40,
      totalParkingSpaces: 48,
    },

    milestones: {
      projectBriefingMonth: 1,
      legalApprovalMonth: 3,
      permitMonth: 5,
      incorporationRegistryMonth: 6,
      launchMonth: 7,
      constructionStartMonth: 9,
      constructionDurationMonths: 24,
      completionHabiteSeMonth: 33,
      keysDeliveryMonth: 36,
      totalProjectMonths: 36,
    },

    sales: {
      basePriceAverageM2: 11150,
      launchSalesPct: 30.0,
      monthlyAbsorptionVsoPct: 5.0,
      constructionValueAppreciationPct: 12.0,
      paymentPlan: {
        downPaymentPct: 10.0,
        constructionInstallmentsPct: 15.0,
        balloonInstallmentsPct: 10.0,
        keysDeliveryPct: 5.0,
        bankFinancingRepassePct: 60.0,
        postKeysInstallmentsPct: 0.0,
      },
    },

    costs: {
      constructionBudgetMode: 'global_m2',
      constructionCostPerBuiltM2: 3100,
      totalConstructionCost: 12400000,
      constructionCurveMonths: 24,

      architecturalAndEngineeringProjectsCost: 320000,
      surveyAndSoilTestingCost: 45000,

      marketingBudgetPct: 3.0,
      salesCommissionPct: 4.0,
      launchStandAndDecorationCost: 180000,

      constructionManagementFeePct: 4.0,
      developerIncorporationFeePct: 2.0,
      legalPermitsAndUtilityFees: 95000,
      postConstructionWarrantyReservePct: 1.5,
      contingencyReservePct: 2.0,
    },

    financing: {
      enabled: false,
      facilityType: 'caixa_apoio_producao',
      maxFinancingPctOfConstruction: 70.0,
      annualInterestRatePct: 11.5,
      gracePeriodMonths: 24,
      bankFeePct: 1.5,
      bankInspectionMonthlyFee: 3500,
    },

    taxAndIndex: {
      taxRegime: 'RET_4',
      effectiveTaxRatePct: 4.0,
      projectedInccAnnualPct: 5.5,
      projectedIgpmAnnualPct: 4.5,
      discountRateTmaAnnualPct: 12.0,
    },
  }
}
