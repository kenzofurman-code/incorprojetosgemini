# Plano de Execução: Módulo de Viabilidade de Incorporação (CRD Pro Forma)

| Task | Status | Details |
| --- | --- | --- |
| 1. Tipos e Modelos de Domínio (`types/viabilidade.ts`) | [x] | Estruturas tipadas de Terreno, Produto, Cronograma, Vendas, Custos, Financiamento, Fluxo, Linhagem e IA |
| 2. Motor de Cálculo Determinístico (`lib/viabilidade/`) | [x] | Submotores de Matemática Financeira (TIR/VPL), Coortes de Vendas, Curvas de Obra, Financiamento PJ e Linhagem |
| 3. Datasets Fixture e Template em Branco (`data/`) | [x] | Dados reais do Empreendimento Blossom v1.5.1 + Template inicial limpo com premissas recomendadas |
| 4. Inspetor de Rastreabilidade e Auditoria (`Lineage`) | [x] | Tooltip no hover, Drawer lateral com raio-x da fórmula/coortes e Aba de Matriz de Auditoria |
| 5. Componentes das 10 Abas de Gestão (`components/viabilidade/`) | [x] | Abas com Modo Essencial vs Avançado, Gráficos Recharts, DRE e Fluxo de Caixa Mensal interativo |
| 6. Cenários e Matriz de Sensibilidade (`Tab09Cenarios.tsx`) | [x] | Comparador Base/Conservador/Otimista e Matriz Calorífica Preço × Custo de Obra |
| 7. Assistente de IA Gemini Copilot (`ViabilidadeAiCopilot.tsx`) | [x] | Widget flutuante com upload de arquivos, pré-preenchimento automático com 1 clique e análise de riscos |
| 8. Integração na Navegação & Rotas (`Viabilidade.tsx`, `App.tsx`, `Sidebar`) | [x] | Rota `/viabilidade`, item no menu lateral e sincronização com o projeto selecionado |
| 9. Verificação, Testes de Paridade e Build de Produção | [x] | Build de produção verificado com sucesso (`tsc -b && vite build` com exit code 0) |
