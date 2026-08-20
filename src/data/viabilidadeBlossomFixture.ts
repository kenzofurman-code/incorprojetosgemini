/**
 * data/viabilidadeBlossomFixture.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dataset de Referência e Paridade: Empreendimento Blossom v1.5.1
 * Extraído e calibrado a partir da planilha CRD oficial:
 * `CRD - 101056 - BLOSSOM - LAN r00 - ARQ v06 r04 - v1.5.1.xlsm`
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ViabilityStudyModel } from '../types/viabilidade'

export const VIABILIDADE_BLOSSOM_FIXTURE: ViabilityStudyModel = {
  id: 'study-blossom-v151',
  projectId: 'proj-043',
  name: 'Residencial Blossom - Estudo de Viabilidade v1.5.1',
  version: 'v1.5.1',
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
  notes: 'Estudo oficial consolidado com 88 unidades, permuta física de 10% e financiamento Apoio à Produção.',

  // 1. Terreno e Negociação
  land: {
    landAreaM2: 1450,
    zoningMaxFar: 4.0,
    basicFar: 2.5,
    additionalFarCost: 350000,
    cashPurchasePrice: 4800000,
    downPayment: 800000,
    installmentsCount: 10,
    installmentsMonthlyAmount: 400000,
    physicalPermutationPct: 10.0, // 10% em unidades
    financialPermutationPct: 0.0,
    transferTaxPct: 2.5,
    brokerageFeePct: 4.0,
    registryAndNotaryCost: 65000,
    demolitionAndEarthworkCost: 180000,
    environmentalCompensationCost: 45000,
  },

  // 2. Produto e Tipologias
  product: {
    towers: [
      {
        id: 'tower-1',
        name: 'Torre Blossom',
        floorsCount: 14,
        unitsPerFloor: 6,
        totalUnits: 88,
        elevatorsCount: 2,
      },
    ],
    unitTypes: [
      {
        id: 'ut-1',
        name: 'Studio Moderno',
        category: 'studio',
        count: 24,
        privateAreaM2: 34.5,
        parkingSpaces: 1,
        basePriceM2: 13200,
        totalPrivateAreaM2: 24 * 34.5,
        unitPrice: 34.5 * 13200,
        totalVgv: 24 * 34.5 * 13200,
      },
      {
        id: 'ut-2',
        name: '2 Dormitórios Standard',
        category: '2_dorms',
        count: 36,
        privateAreaM2: 58.0,
        parkingSpaces: 1,
        basePriceM2: 11900,
        totalPrivateAreaM2: 36 * 58.0,
        unitPrice: 58.0 * 11900,
        totalVgv: 36 * 58.0 * 11900,
      },
      {
        id: 'ut-3',
        name: '2 Dorms c/ Suíte',
        category: '2_dorms',
        count: 20,
        privateAreaM2: 67.5,
        parkingSpaces: 1,
        basePriceM2: 12400,
        totalPrivateAreaM2: 20 * 67.5,
        unitPrice: 67.5 * 12400,
        totalVgv: 20 * 67.5 * 12400,
      },
      {
        id: 'ut-4',
        name: 'Garden / Cobertura Duplex',
        category: 'garden',
        count: 8,
        privateAreaM2: 95.0,
        gardenAreaM2: 28.0,
        parkingSpaces: 2,
        basePriceM2: 13800,
        totalPrivateAreaM2: 8 * 95.0,
        unitPrice: 95.0 * 13800,
        totalVgv: 8 * 95.0 * 13800,
      },
    ],
    commonAreaM2: 2450,
    totalBuiltAreaM2: 7850,
    totalPrivateAreaM2: 5400,
    efficiencyRatio: 0.688,
    totalUnitsCount: 88,
    totalParkingSpaces: 96,
  },

  // 3. Cronograma e Marcos
  milestones: {
    projectBriefingMonth: 1,
    legalApprovalMonth: 3,
    permitMonth: 5,
    incorporationRegistryMonth: 7,
    launchMonth: 8,
    constructionStartMonth: 10,
    constructionDurationMonths: 24,
    completionHabiteSeMonth: 34,
    keysDeliveryMonth: 36,
    totalProjectMonths: 38,
  },

  // 4. Vendas e Condição Comercial
  sales: {
    basePriceAverageM2: 12450,
    launchSalesPct: 35.0, // 35% no lançamento
    monthlyAbsorptionVsoPct: 5.5, // 5.5% a.m.
    constructionValueAppreciationPct: 15.0,
    paymentPlan: {
      downPaymentPct: 10.0, // 10% sinal
      constructionInstallmentsPct: 15.0, // 15% em mensais durante a obra
      balloonInstallmentsPct: 10.0, // 10% balões semestrais
      keysDeliveryPct: 5.0, // 5% chaves
      bankFinancingRepassePct: 60.0, // 60% repasse financiamento bancário
      postKeysInstallmentsPct: 0.0,
    },
  },

  // 5. Custos de Obra e Gerais
  costs: {
    constructionBudgetMode: 'global_m2',
    constructionCostPerBuiltM2: 3250, // R$ 3.250/m² construído
    totalConstructionCost: 25512500, // 7.850m² * 3.250
    constructionCurveMonths: 24,

    architecturalAndEngineeringProjectsCost: 480000,
    surveyAndSoilTestingCost: 65000,

    marketingBudgetPct: 3.2,
    salesCommissionPct: 4.0,
    launchStandAndDecorationCost: 280000,

    constructionManagementFeePct: 4.5,
    developerIncorporationFeePct: 2.0,
    legalPermitsAndUtilityFees: 145000,
    postConstructionWarrantyReservePct: 1.5,
    contingencyReservePct: 2.0,
  },

  // 6. Financiamento à Produção (PJ)
  financing: {
    enabled: true,
    facilityType: 'caixa_apoio_producao',
    maxFinancingPctOfConstruction: 70.0, // 70% da obra
    annualInterestRatePct: 11.8,
    gracePeriodMonths: 24,
    bankFeePct: 1.5,
    bankInspectionMonthlyFee: 4500,
  },

  // 7. Tributos e Índices
  taxAndIndex: {
    taxRegime: 'RET_4',
    effectiveTaxRatePct: 4.0,
    projectedInccAnnualPct: 6.0,
    projectedIgpmAnnualPct: 5.0,
    discountRateTmaAnnualPct: 12.0, // TMA 12% a.a. para VPL
  },
}
