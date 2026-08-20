/**
 * types/viabilidade.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Modelos de Domínio Tipados para o Módulo de Viabilidade de Incorporação (CRD Pro Forma).
 * Abrange todas as variáveis da planilha de referência (BLOSSOM v1.5.1):
 *  - Terreno e Negociação (dinheiro, permuta física, permuta financeira)
 *  - Produto Imobiliário, Torres e Tipologias
 *  - Cronograma e Grafo de Marcos
 *  - Vendas, Curva de Absorção (VSO) e Planos de Pagamento em Coortes
 *  - Custos de Obra (Composições e Curvas S) e Custos Gerais
 *  - Financiamento Bancário à Produção (PJ)
 *  - Tributos (RET / Lucro Presumido) e Índices (INCC / IGP-M)
 *  - Ledger Mensal do Fluxo de Caixa e DRE
 *  - Indicadores Financeiros (VGV, Lucro, Margem, Exposição, TIR, VPL, Payback)
 *  - Rastreabilidade (Lineage) e Copilot IA
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ViabilityTabId =
  | 'resumo'
  | 'terreno'
  | 'produto'
  | 'cronograma'
  | 'vendas'
  | 'custos'
  | 'financiamento'
  | 'fluxo'
  | 'cenarios'
  | 'auditoria'

export type TaxRegime = 'RET_4' | 'RET_1_MCMV' | 'LUCRO_PRESUMIDO'

export type UnitCategory =
  | 'studio'
  | '1_dorm'
  | '2_dorms'
  | '3_dorms'
  | '4_dorms'
  | 'duplex'
  | 'cobertura'
  | 'garden'
  | 'comercial'

export interface UnitTypeItem {
  id: string
  name: string
  category: UnitCategory
  count: number
  privateAreaM2: number
  gardenAreaM2?: number
  terraceAreaM2?: number
  parkingSpaces: number
  basePriceM2: number
  totalPrivateAreaM2: number
  unitPrice: number
  totalVgv: number
}

export interface TowerItem {
  id: string
  name: string
  floorsCount: number
  unitsPerFloor: number
  totalUnits: number
  elevatorsCount: number
}

export interface LandDealModel {
  landAreaM2: number
  zoningMaxFar: number // Coeficiente de aproveitamento máximo
  basicFar: number // Coeficiente de aproveitamento básico
  additionalFarCost: number // Custo de potencial construtivo adicional / outorga onerosa
  cashPurchasePrice: number // Preço de compra em dinheiro
  downPayment: number // Sinal de entrada
  installmentsCount: number // Número de parcelas mensais do terreno
  installmentsMonthlyAmount: number // Valor de cada parcela
  physicalPermutationPct: number // Permuta física (% das unidades entregues ao terreno)
  financialPermutationPct: number // Permuta financeira (% do VGV líquido)
  transferTaxPct: number // ITBI (% sobre valor de compra)
  brokerageFeePct: number // Comissão de intermediação do terreno (%)
  registryAndNotaryCost: number // Escritura e certidões (R$)
  demolitionAndEarthworkCost: number // Demolição, sondagem de solo e terraplenagem (R$)
  environmentalCompensationCost: number // Compensação ambiental e EIV (R$)
}

export interface ProductModel {
  towers: TowerItem[]
  unitTypes: UnitTypeItem[]
  commonAreaM2: number // Área comum coberta e descoberta
  totalBuiltAreaM2: number // Área construída total
  totalPrivateAreaM2: number // Área privativa total
  efficiencyRatio: number // Eficiência (Privativa / Construída)
  totalUnitsCount: number
  totalParkingSpaces: number
}

export interface MilestoneItem {
  id: string
  name: string
  monthOffset: number // Mês de ocorrência no fluxo (1..N)
  date?: string
  description?: string
}

export interface MilestoneGraphModel {
  projectBriefingMonth: number
  legalApprovalMonth: number
  permitMonth: number
  incorporationRegistryMonth: number // Registro de Incorporação (RI)
  launchMonth: number // Mês de Lançamento Comercial
  constructionStartMonth: number // Início da Obra
  constructionDurationMonths: number // Duração da Obra em Meses
  completionHabiteSeMonth: number // Conclusão de Obra e Habite-se / CVCO
  keysDeliveryMonth: number // Entrega das Chaves
  totalProjectMonths: number // Duração Total do Empreendimento
}

export interface PaymentPlanModel {
  downPaymentPct: number // Entrada / Sinal (%)
  constructionInstallmentsPct: number // Mensais durante a obra (%)
  balloonInstallmentsPct: number // Balões / Intermediárias durante a obra (%)
  keysDeliveryPct: number // Parcela das Chaves (%)
  bankFinancingRepassePct: number // Financiamento Bancário / Repasse (%)
  postKeysInstallmentsPct: number // Direto pós-obra / resíduo (%)
}

export interface SalesModel {
  basePriceAverageM2: number
  launchSalesPct: number // % vendido no lançamento (Mês 1)
  monthlyAbsorptionVsoPct: number // Velocidade de Vendas mensal (VSO % a.m.)
  constructionValueAppreciationPct: number // Valorização do preço durante o período de obra (% total)
  paymentPlan: PaymentPlanModel
}

export interface CostDisbursementCurve {
  name: string
  durationMonths: number
  monthlyPercentages: number[] // Percentuais mês a mês somando 100%
}

export interface CostModel {
  // Obra e Construção
  constructionBudgetMode: 'global_m2' | 'detailed_components'
  constructionCostPerBuiltM2: number // Custo por m² de área construída (R$/m²)
  totalConstructionCost: number
  constructionCurveMonths: number // Ex: 18, 24, 30 meses
  customConstructionCurve?: number[] // Curva personalizada se houver

  // Projetos e Engenharia
  architecturalAndEngineeringProjectsCost: number // Projetos completos (R$)
  surveyAndSoilTestingCost: number // Sondagens e levantamentos (R$)
  
  // Marketing e Comercial
  marketingBudgetPct: number // Verba de Marketing (% do VGV Bruto)
  salesCommissionPct: number // Comissão imobiliária e premiação (% do VGV)
  launchStandAndDecorationCost: number // Estande de vendas e decorado (R$)
  
  // Administração e Taxas
  constructionManagementFeePct: number // Taxa de Administração de Obra (% do custo de obra)
  developerIncorporationFeePct: number // Taxa de Gestão da Incorporadora (% do VGV)
  legalPermitsAndUtilityFees: number // Taxas municipais, concessionárias e bombeiros (R$)
  postConstructionWarrantyReservePct: number // Reserva técnica pós-obra (% do custo de obra)
  contingencyReservePct: number // Contingência e imprevistos (% do custo de obra)
}

export interface FinancingModel {
  enabled: boolean
  facilityType: 'caixa_apoio_producao' | 'plano_empresario_banco' | 'cri_direct'
  maxFinancingPctOfConstruction: number // % do custo de obra financiado (ex: 70% ou 80%)
  annualInterestRatePct: number // Taxa de juros anual (ex: 11.5% a.a. + TR)
  gracePeriodMonths: number // Carência (meses até o início da amortização)
  bankFeePct: number // Taxa de estruturação / abertura de crédito (%)
  bankInspectionMonthlyFee: number // Custo mensal de vistoria / medição (R$)
}

export interface TaxAndIndexModel {
  taxRegime: TaxRegime
  effectiveTaxRatePct: number // Ex: 4.0% para RET com Patrimônio de Afetação
  projectedInccAnnualPct: number // INCC projetado (% a.a.)
  projectedIgpmAnnualPct: number // IGP-M projetado (% a.a.)
  discountRateTmaAnnualPct: number // Taxa Mínima de Atratividade (TMA % a.a. para cálculo de VPL)
}

export interface MonthlyCashflowLine {
  monthIndex: number // Mês 1..N
  dateLabel: string // Ex: "Mai/26"
  isLaunchMonth: boolean
  isConstructionPeriod: boolean
  isDeliveryMonth: boolean

  // Receitas Operacionais
  salesVgvSoldThisMonth: number
  accumulatedSalesPct: number
  customerDownPaymentReceipts: number
  customerMonthlyInstallmentReceipts: number
  customerBalloonReceipts: number
  customerKeysAndFinancingReceipts: number
  grossOperatingReceipts: number

  // Desembolsos e Custos
  landDisbursements: number
  projectsDisbursements: number
  constructionDisbursements: number
  marketingDisbursements: number
  commissionsDisbursements: number
  administrationDisbursements: number
  taxesDisbursements: number
  totalOperatingDisbursements: number

  // Financiamento à Produção (PJ)
  financingDrawdown: number // Liberação do banco no mês
  financingInterestAndFees: number // Juros e encargos na fase de obra
  financingAmortization: number // Amortização / liquidação do saldo
  financingOutstandingBalance: number // Saldo devedor bancário no final do mês

  // Fluxo Líquido e Acumulado
  netOperatingCashflow: number // Receitas - Despesas operacionais
  netCashflowWithFinancing: number // Fluxo de Caixa do Projeto pós-financiamento
  accumulatedCashflow: number // Saldo Acumulado (Curva de Exposição)
}

export interface ViabilityMetrics {
  grossVgv: number // VGV Bruto Total (R$)
  physicalPermutationVgv: number // VGV entregue em permuta física (R$)
  netVgv: number // VGV Líquido da Incorporadora (R$)
  totalOperatingReceipts: number // Receita Líquida Total arrecadada no fluxo (R$)

  totalLandCost: number // Custo total do terreno (R$)
  totalProjectsCost: number // Custo de projetos e sondagens (R$)
  totalConstructionCost: number // Custo total da obra (R$)
  totalMarketingCost: number // Custo total de marketing e comissões (R$)
  totalAdministrationCost: number // Custo de gestão, incorporação e taxas (R$)
  totalTaxesCost: number // Total de tributos RET recolhidos (R$)
  totalFinancingInterestCost: number // Total de juros e taxas financeiras (R$)
  totalProjectCost: number // Custo Total do Empreendimento (R$)

  grossProfit: number // Lucro Bruto (VGV Líquido - Custos Diretos de Obra e Terreno)
  netProfit: number // Lucro Líquido Final (R$)
  netMarginPct: number // Margem Líquida sobre VGV Líquido (%)
  profitToCostRatioPct: number // Margem sobre Custo (ROI %)

  maxCashExposure: number // Exposição Máxima de Caixa / Capital Próprio Necessário (R$)
  maxExposureMonth: number // Mês de pico da exposição
  paybackMonth: number // Mês de retorno do capital (saldo acumulado vira positivo)

  projectMonthlyIrrPct: number // TIR Mensal do Projeto (% a.m.)
  projectAnnualIrrPct: number // TIR Anual do Projeto (% a.a.)
  investorAnnualIrrPct: number // TIR Anual do Investidor / Capital Próprio (% a.a.)
  npvAtTma: number // VPL (Valor Presente Líquido @ TMA configurada)

  averageSalePricePerPrivateM2: number // Preço Médio de Venda por m² privativo (R$/m²)
  totalCostPerBuiltM2: number // Custo Total por m² construído (R$/m²)
  constructionCostPerBuiltM2: number // Custo de Obra por m² construído (R$/m²)
}

export interface ViabilityStudyModel {
  id: string
  projectId: string
  name: string
  version: string
  createdAt: string
  updatedAt: string
  notes?: string
  land: LandDealModel
  product: ProductModel
  milestones: MilestoneGraphModel
  sales: SalesModel
  costs: CostModel
  financing: FinancingModel
  taxAndIndex: TaxAndIndexModel
}

export interface ViabilityScenarioOverride {
  id: string
  name: 'base' | 'conservador' | 'otimista' | 'custom'
  label: string
  priceAdjustmentPct: number // Ex: -5% ou +5%
  costAdjustmentPct: number // Ex: +8% ou -5%
  vsoAdjustmentPct: number // Ex: -20% ou +15%
  constructionDelayMonths: number // Ex: +2 meses
}

export interface LineageFactor {
  name: string
  value: string | number
  sourceTab: ViabilityTabId
  fieldKey: string
}

export interface LineageTrace {
  metricKey: string
  label: string
  formattedValue: string
  formulaExplanation: string
  semanticFormula: string
  factors: LineageFactor[]
  cohortBreakdown?: {
    salesMonth: number
    soldVgv: number
    receiptType: string
    receiptAmount: number
  }[]
}

export interface ViabilityAiMessage {
  id: string
  sender: 'user' | 'assistant' | 'system'
  timestamp: string
  content: string
  suggestedAssumptions?: Partial<ViabilityStudyModel>
  applied?: boolean
}
