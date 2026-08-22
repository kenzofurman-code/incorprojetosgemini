# Plano de Implementação: Módulo de Simulação BIM 4D

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Integrar o motor 3D That Open Company ao cronograma executivo de obras para criar um simulador construtivo BIM 4D completo na Web com cockpit de 3 painéis, vinculação visual, importação de planilhas e player temporal a 60 FPS.

**Architecture:** O módulo desacopla os dados de cronograma de obra (`AtividadeObra4D`), extrai a árvore de elementos do modelo IFC (Storey / Categoria / Material), gerencia o estado através do hook `useBIM4D` e manipula visibilidade (`model.hide/show`) e cores em lote no `@thatopen/fragments` conforme o calendário avança.

**Tech Stack:** React 19, TypeScript, `@thatopen/components`, `@thatopen/fragments`, Three.js, Lucide Icons, Tailwind CSS v4, XLSX/JSZip.

---

### Task 1: Tipagens TypeScript e Template de Demonstração
**Files:**
- Create: `src/types/bim4d.ts`
- Create: `src/data/bim4dTemplate.ts`

**Step 1: Definir os tipos oficiais em `src/types/bim4d.ts`**
- `AtividadeObra4D`: `id`, `eap`, `nome`, `dataInicio`, `dataFim`, `pavimentoAlvo`, `corPersonalizada`, `bimGuids`, `bimExpressIds`.
- `CronogramaObra4D`: `id`, `nome`, `atividades`, `versao`, `dataCriacao`.
- `BIMElementGroup`: `storey`, `category`, `count`, `expressIds`, `guids`, `isLinked`.
- `BIM4DPlayerState`: `currentDate`, `isPlaying`, `speed`, `scale` ('mensal' | 'semanal'), `startDate`, `endDate`, `progressPercent`.

**Step 2: Criar dados de demonstração em `src/data/bim4dTemplate.ts`**
- Criar cronograma padrão de obra vertical (Fundações, Pilares, Vigas, Lajes, Alvenaria, Instalações, Acabamentos).

**Step 3: Testar e commitar**
- `git add src/types/bim4d.ts src/data/bim4dTemplate.ts`
- `git commit -m "feat(bim4d): adicionar tipagens e template inicial do cronograma de obra"`

---

### Task 2: Hook Central de Gestão e Animação 4D (`useBIM4D.ts`)
**Files:**
- Create: `src/components/bim/BIM4D/useBIM4D.ts`

**Step 1: Implementar o hook `useBIM4D`**
- Gerenciar lista de atividades do cronograma de obra.
- Agrupar elementos do modelo IFC por Pavimento e Categoria a partir do modelo carregado.
- Controlar o relógio da simulação (`requestAnimationFrame` / `setInterval`), avanço de datas, Play, Pause, Velocidade (1x, 2x, 5x, 10x) e Jump to Date.
- Executar a lógica de visibilidade no modelo That Open:
  - $T < dataInicio$: `model.hide(ids)`
  - $dataInicio \le T \le dataFim$: `model.setColor(ids, #F59E0B)` (Amarelo em obra)
  - $T > dataFim$: `model.resetColor(ids)` (Sólido permanente)
- Persistência em `localStorage` e suporte a exportar/importar vínculos JSON.

**Step 2: Testar e commitar**
- `git add src/components/bim/BIM4D/useBIM4D.ts`
- `git commit -m "feat(bim4d): criar hook useBIM4D com motor de animacao temporal"`

---

### Task 3: Painel de Seleção de Elementos IFC (`BIM4DElementsPanel.tsx`)
**Files:**
- Create: `src/components/bim/BIM4D/BIM4DElementsPanel.tsx`

**Step 1: Criar o componente do painel esquerdo**
- Filtros rápidos por Pavimento (`Storey`) e Categoria IFC (`IfcColumn`, `IfcSlab`, `IfcWall`, etc.).
- Árvore agrupada com contagem de peças, badges de status (*Vinculado* / *Pendente*).
- Seleção múltipla com suporte a `Shift` e botão "Selecionar Todos os Filtrados".
- Destaque em tempo real no 3D das peças selecionadas para conferência visual.

**Step 2: Testar e commitar**
- `git add src/components/bim/BIM4D/BIM4DElementsPanel.tsx`
- `git commit -m "feat(bim4d): criar painel de elementos IFC com selecao multinivel"`

---

### Task 4: Painel de Cronograma de Obra (`BIM4DSchedulePanel.tsx`)
**Files:**
- Create: `src/components/bim/BIM4D/BIM4DSchedulePanel.tsx`

**Step 1: Criar o componente do painel direito**
- Cabeçalho limpo com menu de engrenagem ⚙️ (*Baixar Modelo*, *Importar Planilha*, *Adicionar Manual*, *Auto-Vincular por Nome*).
- Cards interativos de atividades com Nome, EAP, Início, Fim e badge de contagem de elementos vinculados.
- Seleção da atividade ativa para receber o vínculo.
- Botões de desvincular ou editar datas inline.

**Step 2: Testar e commitar**
- `git add src/components/bim/BIM4D/BIM4DSchedulePanel.tsx`
- `git commit -m "feat(bim4d): criar painel de cronograma executivo de obra"`

---

### Task 5: Player de Simulação da Linha do Tempo (`BIM4DTimelinePlayer.tsx`)
**Files:**
- Create: `src/components/bim/BIM4D/BIM4DTimelinePlayer.tsx`

**Step 1: Criar o componente do rodapé**
- Barra de tempo contínua com slider interativo e marcadores de meses.
- Botões de reprodução: Play/Pause, Passo Anterior, Próximo Passo, Velocidade (1x, 2x, 5x, 10x).
- Display de data corrente formatada (ex: `15 de Setembro de 2026`), progresso percentual da obra e total de atividades ativas na data.

**Step 2: Testar e commitar**
- `git add src/components/bim/BIM4D/BIM4DTimelinePlayer.tsx`
- `git commit -m "feat(bim4d): criar player 4D com timeline slider e controles de reproducao"`

---

### Task 6: Modal de Importação e Gerador de Template (`BIM4DImportModal.tsx`)
**Files:**
- Create: `src/components/bim/BIM4D/BIM4DImportModal.tsx`

**Step 1: Criar o modal de importação**
- Botão para gerar e baixar a planilha modelo oficial (`.CSV` / `.XLSX`).
- Upload de arquivos de cronograma (Excel, CSV ou Project XML).
- Mapeador de colunas inteligente com preview das primeiras 5 linhas.

**Step 2: Testar e commitar**
- `git add src/components/bim/BIM4D/BIM4DImportModal.tsx`
- `git commit -m "feat(bim4d): criar modal de importacao e gerador de planilha template"`

---

### Task 7: Barra de Ferramentas e Integração no `IFCViewer.tsx`
**Files:**
- Create: `src/components/bim/BIM4D/BIM4DToolbar.tsx`
- Modify: `src/components/bim/IFCViewer.tsx`

**Step 1: Criar a barra de ferramentas 4D**
- Botão toggle "Simulação 4D" na toolbar principal do visualizador.
- Botão "Modo Apresentação / Ocultar Painéis" (expandir 3D para 100% da tela).
- Botão central flutuante sobre o 3D: `"🔗 Vincular [N] Elementos à Atividade [Nome]"`.

**Step 2: Integrar o layout de 3 painéis no `IFCViewer.tsx`**
- Conectar o estado 4D com o ciclo de vida do modelo That Open.
- Ajustar os layouts responsivos com transições suaves.

**Step 3: Testar e commitar**
- `git add src/components/bim/BIM4D/BIM4DToolbar.tsx src/components/bim/IFCViewer.tsx`
- `git commit -m "feat(bim4d): integrar cockpit 4D completo no IFCViewer"`

---

### Task 8: Verificação, Build e Testes Finais
**Files:**
- Test: Executar `npm run build`
- Test: Abrir navegador, carregar modelo IFC, importar cronograma, vincular pilares/vigas e dar play na simulação 4D.

**Step 1: Executar build de produção**
- Run: `npm run build`
- Expected: 0 erros TypeScript / Vite.

**Step 2: Commit final e relatório**
- `git commit -m "feat(bim4d): finalizar modulo completo de simulacao e planejamento BIM 4D"`
