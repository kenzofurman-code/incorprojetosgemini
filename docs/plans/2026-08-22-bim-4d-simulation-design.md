# Especificação de Design: Módulo de Simulação e Planejamento BIM 4D

- **Data**: 2026-08-22
- **Status**: Aprovado
- **Autor / Time**: IncorProjetos Engineering
- **Contexto**: Integração do motor 3D That Open Company (`@thatopen/components`, `@thatopen/fragments`) com Cronogramas Executivos de Obra para Simulação Construtiva 4D na Web.

---

## 1. Visão Geral e Objetivos

O módulo **BIM 4D** permite que engenheiros, incorporadores e gestores de obra visualizem o modelo 3D da edificação evoluindo no tempo, conectando os elementos construtivos do IFC (fundações, pilares, vigas, lajes, alvenarias, etc.) às atividades de um cronograma de obra por datas de início e término.

### Principais Casos de Uso:
1. **Modo Coringa / Standalone**: Abrir qualquer arquivo IFC local no computador, importar uma planilha de cronograma (Excel/CSV) e realizar simulações 4D instantâneas.
2. **Modo Plataforma Integrada**: Vincular o modelo BIM de um empreendimento cadastrado ao cronograma executivo de obra.
3. **Apresentações Executivas (Modo Tela Cheia)**: Recolher painéis de vinculação e apresentar a animação da obra mês a mês em reuniões de diretoria e investidores.

---

## 2. Arquitetura de Interface (Cockpit de 3 Painéis + Player)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔝 BARRA SUPERIOR: [📁 Carregar IFC] [⚙️ Simulação 4D (TOGGLE)] [📺 Modo Apresentação]       │
├──────────────────────────┬───────────────────────────────┬──────────────────────────────────┤
│ 📦 1. ELEMENTOS DO IFC   │ 🏛️ 2. MODELO 3D (CENTRO)       │ 📅 3. CRONOGRAMA DE OBRA (4D)    │
│                          │                               │                                  │
│ • Filtro: [Pavimento ▼]  │ • Orbit / Pan / Zoom livre    │ • Topo: Menu ⚙️ (Template, Add)   │
│ • Filtro: [Categoria ▼]  │ • Realce em Ciano (Seleção)   │                                  │
│ • Busca rápida           │ • Destaque 4D:                │ Lista de Atividades:             │
│                          │   - Amarelo: Em Construção    │ ┌──────────────────────────────┐ │
│ Tabela com Checkboxes:   │   - Sólido: Concluído         │ │ 🏗️ Fundações                 │ │
│ [ ] Pav 01 > Pilares (8) │   - Oculto: Não Iniciado      │ │   01/08/2026 ➔ 20/08/2026    │ │
│ [ ] Pav 01 > Vigas (14)  │                               │ │   🏷️ 12 elementos vinculados │ │
│ [ ] Pav 02 > Lajes (4)   │                               │ ├──────────────────────────────┤ │
│                          │                               │ │ 🧱 Alvenaria Pav 01          │ │
│ [ Selecionar Todos ]     │                               │ │   21/08/2026 ➔ 10/09/2026    │ │
│                          │                               │ │   ⚠️ Sem elementos           │ │
│                          │ ── [ 🔗 VINCULAR SELEÇÃO ] ── │ └──────────────────────────────┘ │
├──────────────────────────┴───────────────────────────────┴──────────────────────────────────┤
│ ⏱️ 4. PLAYER DE SIMULAÇÃO 4D (RODAPÉ)                                                        │
│ [ ⏮️ ] [ ▶️ Play / ⏸️ Pause ] [ ⏭️ ] [ Velocidade: 1x, 2x, 5x, 10x ] [ Escala: Mensal/Semanal ]│
│ Data da Obra: 📅 15/Set/2026 ── Progresso: 42% concluído • 3 atividades ativas hoje        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Componentes de Interface:
1. **Painel Esquerdo (`BIM4DElementsPanel`)**:
   - Agrupamento multinível: **Pavimento (Storey) → Categoria IFC (IfcColumn, IfcSlab, IfcWall) → Tipo/Material**.
   - Seleção múltipla com suporte a `Shift` e checkboxes.
   - Destaque imediato no 3D dos elementos selecionados para conferência visual.
2. **Painel Central (`IFCViewer 3D Canvas`)**:
   - Canvas WebGL do That Open Engine com renderização de alto desempenho (60 FPS).
   - Botão flutuante central: **"🔗 Vincular Seleção"** (vínculo Muitos-para-1).
3. **Painel Direito (`BIM4DSchedulePanel`)**:
   - Cabeçalho limpo com menu de engrenagem ⚙️:
     - *Baixar Planilha Modelo (.xlsx / .csv)*
     - *Importar Cronograma Externo (MS Project / Excel)*
     - *Nova Atividade Manual*
     - *Limpar Todos os Vínculos*
   - Cards de atividades com nome, data início, data fim e badge com contagem de elementos vinculados.
4. **Player 4D no Rodapé (`BIM4DTimelinePlayer`)**:
   - Barra de tempo contínua com slider, marcadores de meses e marcos.
   - Controles de reprodução: Play, Pause, Anterior, Próximo, Velocidade (1x, 2x, 5x, 10x).
5. **Modo Apresentação (Tela Cheia)**:
   - Alternância rápida para recolher os painéis laterais e focar apenas no modelo 3D + Player.

---

## 3. Modelo de Dados e Importação

### 3.1. Interfaces TypeScript

```ts
export interface AtividadeObra4D {
  id: string
  eap?: string              // ex: "1.2.1"
  nome: string             // ex: "Estrutura - Pilares 2º Pavimento"
  dataInicio: string       // "2026-09-01" (ISO YYYY-MM-DD)
  dataFim: string          // "2026-09-20"
  pavimentoAlvo?: string   // "2º Pavimento" (opcional para auto-match)
  corPersonalizada?: string// cor customizada para a etapa
  bimGuids: string[]       // GlobalIds do IFC associados
  bimExpressIds: number[]  // expressIds para renderização rápida
}

export interface CronogramaObra4D {
  id: string
  nome: string             // ex: "Cronograma Executivo - Edifício Piemonte"
  atividades: AtividadeObra4D[]
  versao: number
  dataCriacao: string
  dataAtualizacao: string
}
```

### 3.2. Template de Planilha (.XLSX / .CSV)

| EAP | Nome da Atividade | Data Início | Data Fim | Pavimento (Opcional) | Categoria IFC (Opcional) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `1.1` | Serviços Preliminares e Canteiro | `01/08/2026` | `15/08/2026` | Canteiro | - |
| `1.2` | Fundações e Blocos | `16/08/2026` | `05/09/2026` | Fundação | IfcFooting |
| `2.1` | Pilares 1º Pavimento | `06/09/2026` | `20/09/2026` | 1º Pavimento | IfcColumn |
| `2.2` | Vigas e Lajes 1º Pavimento | `21/09/2026` | `10/10/2026` | 1º Pavimento | IfcBeam, IfcSlab |

---

## 4. Motor de Renderização 4D & Comportamento Temporal

Para cada frame ou tick do relógio na data $T$:

```
                                  DATA CORRENTE DA TIMELINE ($T$)
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                         [Filtragem das Atividades em Memória]
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
  $T < Data Início$        $Data Início \le T \le Data Fim$    $T > Data Fim$
   (NÃO INICIADO)                (EM CONSTRUÇÃO)                 (CONCLUÍDO)
       │                            │                            │
  Oculto no 3D            Destaque em Amarelo/Laranja         Sólido / Cor Real
 (model.hide(ids))         (model.setColor(ids, #F59E0B))     (model.resetColor(ids))
```

### Regras Visuais:
- **Não Iniciado ($T < DataInicio$)**: Oculto (`model.hide(ids)`).
- **Em Construção ($DataInicio \le T \le DataFim$)**: Amarelo/Laranja vibrante (`#F59E0B`), simulando obras ativas.
- **Concluído ($T > DataFim$)**: Cor original do material (`model.resetColor(ids)`), permanecendo visível no modelo até o término.
- **Peças sem vínculo**: Opção configurável entre exibição translúcida (20% opacidade) ou ocultas.

---

## 5. Plano de Estrutura de Arquivos

```
src/
├── components/
│   └── bim/
│       ├── BIM4D/
│       │   ├── BIM4DToolbar.tsx         # Barra superior com toggle e tela cheia
│       │   ├── BIM4DElementsPanel.tsx    # Painel esquerdo de seleção de elementos
│       │   ├── BIM4DSchedulePanel.tsx    # Painel direito com lista de atividades e menu ⚙️
│       │   ├── BIM4DTimelinePlayer.tsx   # Player do rodapé com timeline e velocímetro
│       │   ├── BIM4DImportModal.tsx      # Modal de download de template e upload de planilha
│       │   └── useBIM4D.ts               # Hook de estado 4D, relógio e binding com That Open
│       └── IFCViewer.tsx                 # Integração dos painéis 4D no visualizador principal
├── types/
│   └── bim4d.ts                          # Tipagens oficiais do módulo 4D
└── data/
    └── bim4dTemplate.ts                  # Cronograma executivo de demonstração pré-populado
```

---

## 6. Critérios de Sucesso e Validação

1. **Desempenho**: Timeline slider roda sem engasgos a 60 FPS com manipulação de visibilidade em lote.
2. **Usabilidade**: Vínculo Muitos-para-1 realizado em poucos cliques com conferência visual em tempo real.
3. **Importação e Exportação**: Download de planilha modelo funcional e importação de arquivos `.xlsx` / `.csv`.
4. **Persistência**: Vínculos 4D salvos localmente e recarregados automaticamente ao abrir o modelo.
