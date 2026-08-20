# Design Document: Módulo de Viabilidade de Incorporação Imobiliária (CRD Pro Forma)

**Data:** 2026-08-20  
**Autor:** Antigravity AI & Engenharia de Projetos  
**Status:** Aprovado em Brainstorming  
**Base de Referência:** Planilha `CRD - 101056 - BLOSSOM - LAN r00 - ARQ v06 r04 - v1.5.1.xlsm` + `SPEC_MVP_Viabilidade_Incorporacao.md`

---

## 1. Visão Geral e Objetivo

Desenvolver e integrar ao ecossistema IncorProjetos um **Módulo de Análise de Viabilidade Econômico-Financeira de Incorporações Imobiliárias (CRD Pro Forma)** com paridade matemática com o modelo Excel de referência, sem simplificações ou aproximações grosseiras.

O módulo separa claramente:
1. **Entidades Tipadas & Premissas Paramétricas** (Terreno, Produto, Cronograma, Custos, Vendas, Financiamento, Tributos, Correções).
2. **Motor de Cálculo Determinístico em TypeScript** (execução reativa e instantânea no client-side com auditabilidade e exportação).
3. **Rastreabilidade Multinível (Lineage)**: Tooltip no hover para visualização rápida da fórmula/fonte, Drawer lateral no clique para decomposição passo a passo da linha do fluxo, e Aba de Matriz de Auditoria com todas as equações do sistema.
4. **Venda Econômica ≠ Recebimento Financeiro**: Curva de vendas dividida em coortes mensais com condições comerciais parametrizáveis (sinal, mensais, balões, chaves, financiamento repassado).
5. **Paridade com Entrada Manual e Template**: Um conjunto completo de dados pré-carregados da planilha Blossom para validação imediata e suporte a preenchimento 100% manual com cálculo idêntico.

---

## 2. Arquitetura do Sistema e Estrutura de Domínios

### 2.1 Domínios de Dados Tipados (`src/types/viabilidade.ts`)

- **Terreno & Negociação (`LandDeal`)**: Área do terreno, taxa de outorga/potencial construtivo, permuta física (% ou unidades) e permuta financeira (% do VGV ou valor fixo), valor de compra em dinheiro (sinal, parcelas, correções), ITBI, escritura e registros.
- **Produto Imobiliário & Tipologias (`ProductModel`)**: Quantidade de torres, pavimentos, unidades por tipologia (Studio, 1Q, 2Q, 3Q, Duplex, Cobertura, Gardens), áreas privativas, vagas de garagem, sacadas, terraços, áreas comuns e coeficientes de eficiência.
- **Cronograma & Grafo de Marcos (`MilestoneGraph`)**: Marcos regulatórios e de engenharia (Briefing, Aprovação, Alvará, RI, Lançamento, Início da Obra, Medições de Obra, CVCO/Habite-se, Chaves/Entrega).
- **Vendas, Preço & Coortes (`SalesModel`)**: Preço/m² por tipologia, valorização ao longo da obra, curva de absorção mensal (VSO), planos de pagamento (Sinal %, Mensais %, Intermediárias/Balões %, Chaves/Financiamento %).
- **Custos de Obra & Gerais (`CostModel`)**:
  - *Custos de Obra*: Macro-orçamento por R$/m² ou composição detalhada de engenharia (Fundação, Estrutura, Instalações, Acabamentos) com curvas de desembolso (curva S / 12m, 18m, 24m, 30m, 36m somando 100%).
  - *Custos Gerais*: Projetos e sondagem, Taxas e licenças, Marketing e lançamento, Comissão de vendas (% do VGV), Administração de obra e incorporação (% ou fixo), Pós-obra e contingência.
- **Financiamento à Produção (`FinancingModel`)**: Linha PJ (Plano Empresário / CAIXA / Banco), limite financiável (% da obra), carência durante a obra, taxa de juros a.a., encargos na fase de obras e amortização por repasse na entrega.
- **Tributação & Correções (`TaxAndIndexModel`)**: Regime tributário (RET 4% com patrimônio de afetação ou Lucro Presumido), projeção de INCC e IGP-M.
- **Fluxo de Caixa Mensal (`CashflowLedger`)**: Ledger analítico mês a mês com todas as entradas de clientes, aportes de financiamento, custos de terreno, projetos, obra, marketing, impostos, amortizações e saldo acumulado.
- **Indicadores de Decisão (`ViabilityMetrics`)**:
  - VGV Bruto e VGV Líquido (pós-permuta)
  - Receita Líquida Total e DRE Consolidada
  - Lucro Bruto, Lucro Líquido e Margem sobre VGV
  - Exposição Máxima de Caixa (Pico de Capital) e Mês da Exposição
  - TIR Mensal e TIR Anual do Projeto
  - TIR do Investidor (sobre Capital Próprio)
  - VPL (Valor Presente Líquido @ TMA configurável)
  - Payback (Mês de Retorno do Capital)
  - Preço Médio de Venda e Custo Total por m²

---

## 3. Rastreabilidade e Auditoria (Lineage)

1. **Tooltip no Hover**: Exibe a equação de alto nível e as variáveis diretas da célula.
2. **Drawer Lateral no Clique (`LineageDrawer.tsx`)**:
   - Equação matemática expandida.
   - Valores ativos das premissas.
   - Decomposição das coortes de vendas (quais meses de venda geraram a receita daquele mês).
   - Decomposição da curva de obra (qual percentual da curva incidiu naquele mês).
3. **Aba de Matriz de Auditoria (`AuditMatrixTab.tsx`)**:
   - Tabela geral com todas as fórmulas do sistema, referências cruzadas e testes de validação matemática.

---

## 4. Estrutura de Navegação e Telas

A interface do módulo (`src/pages/viabilidade/Viabilidade.tsx`) será organizada em:

1. **Barra Superior**: Seletor de Versão/Cenário, Botão "Carregar Exemplo (Blossom)", Botão "Novo Estudo em Branco", Toggle "Modo Essencial / Avançado", Exportar PDF/Excel.
2. **Cards de KPIs do Topo**: VGV Líquido, Lucro Líquido (Margem %), Exposição Máxima, TIR Projeto a.a., VPL @ TMA, Payback.
3. **Abas Principais**:
   - 📑 **1. Resumo Executivo**: Gráfico de Exposição/Saldo Acumulado, DRE Sintética, Curva de Vendas vs Obra, Principais Indicadores.
   - 🏗️ **2. Terreno & Negociação**: Área, Potencial, Condições de Pagamento e Permutas.
   - 🏢 **3. Produto & Tipologias**: Cadastro de Torres, Unidades, Áreas Privativas e Comuns.
   - 📅 **4. Cronograma & Prazos**: Marcos regulatórios, obra e entrega.
   - 📈 **5. Vendas & Recebíveis**: Preço/m², Velocidade de Vendas (VSO), Condições Comerciais (Entrada, Mensais, Balões, Chaves).
   - 💰 **6. Custos & Obra**: Projetos, Curva de Desembolso de Obra, Marketing, Administração e Impostos.
   - 🏦 **7. Financiamento**: Linha PJ à Produção, Juros na Obra e Repasse.
   - 📊 **8. Fluxo de Caixa Mensal**: Grade tabular mês a mês com drill-down e inspeção de linha.
   - 🎛️ **9. Cenários & Sensibilidade**: Cenário Base, Conservador e Otimista + Matriz de Sensibilidade Preço × Custo de Obra.
   - 🔍 **10. Matriz de Auditoria**: Lista completa de fórmulas e equações rastreáveis.
4. **Assistente de IA Flutuante (Gemini Viability Copilot)**:
   - Widget expansível no canto da tela integrado à API do Gemini.
   - **Guia Passo a Passo**: Explica a sequência ideal de preenchimento e tira dúvidas de conceitos de incorporação.
   - **Upload de Documentos & Pré-Preenchimento**: Permite arrastar PDFs/imagens/textos (matrículas, propostas de terreno, tabelas de vendas) para extração automática e aplicação direta nas premissas do estudo com 1 clique ("Aplicar Premissas").
   - **Auditoria de Riscos & Sugestões**: Analisa os indicadores calculados e gera parecer crítico (ex: alerta de exposição de caixa muito alta, prazo de vendas discrepante, sensibilidade de margem).

---

## 5. Plano de Entrega

1. **Fase 1**: Tipos TypeScript e Catálogo de Campos Canônicos.
2. **Fase 2**: Motor de Cálculo Determinístico Puro com Coortes e Curvas.
3. **Fase 3**: Datasets Fixture do Empreendimento Blossom v1.5.1 e Testes de Paridade.
4. **Fase 4**: Componentes de UI (Abas, Formulários com Modo Essencial/Avançado, Inspetor de Rastreabilidade Drawer/Tooltip).
5. **Fase 5**: DRE, Fluxo de Caixa Mensal, Cenários de Sensibilidade e Exportação.
6. **Fase 6**: Assistente de IA Gemini (Widget Copilot com upload de arquivos, pré-preenchimento guiado e auditoria de riscos).
