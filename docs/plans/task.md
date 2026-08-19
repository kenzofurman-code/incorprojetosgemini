# Plano de Execução: Cronograma Avançado do Projeto

| Task | Status | Details |
| --- | --- | --- |
| 1. Tipos e Modelos (`types/cronograma.ts`) | [/] | Modelos para EAP/WBS, Dependências, Calendário Útil, Entregáveis e Protocolos |
| 2. Motor de Cálculo e CPM (`dependencySchedule.ts`) | [ ] | Motor de dias úteis, recálculo topológico de dependências e caminho crítico |
| 3. Template Padrão de Incorporação (`incorporacaoTemplate.ts`) | [ ] | Template completo com fases de Estudo, Legal, Executivos, Aprovações e Obra |
| 4. Componentes do Gráfico de Gantt (`components/cronograma/Gantt/`) | [ ] | Tabela EAP inline, barras com drag/resize, régua temporal, SVG de setas e toolbar |
| 5. Quadro Kanban Sincronizado (`components/cronograma/Kanban/`) | [ ] | Colunas por status com drag & drop e filtros por fase/responsável |
| 6. Diagrama de Rede PERT/CPM (`components/cronograma/Network/`) | [ ] | Diagrama de fluxo com nós de processo e destaque do Caminho Crítico |
| 7. Acompanhamento de Protocolos (`components/cronograma/Protocolos/`) | [ ] | Monitoramento de processos em Prefeitura, Bombeiros, Concessionárias e Cartório |
| 8. Integração na Página Principal (`pages/cronograma/Cronograma.tsx`) | [ ] | Navegação por abas sincronizadas, vínculo com projetos e exportação |
| 9. Verificação & Build | [ ] | Testes de recálculo, drag & drop, templates e build de produção |
