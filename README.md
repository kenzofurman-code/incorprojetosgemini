# IncorProjetos

Plataforma web de gestao de versionamento de projetos de construcao, integrando o cronograma de desenvolvimento de projetos com o cronograma de obra — incluindo sobreposicao/comparacao de PDFs, fluxo de revisao e aprovacao com marcacao de issues, e ferramentas de campo (armario virtual, controle de versoes via QR code, e plotagem).

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend (prototipo):** Supabase (Postgres + Auth + Storage)
- **Charts:** Recharts
- **Icones:** Lucide React
- **Deploy:** Vercel

## Status do prototipo

**Conectado ao Supabase de verdade:** `Projetos` (upload real de PDF + leitura da tabela `drawings`) e `Cronograma` (leitura/criacao real na tabela `milestones`).

**Ainda usando dados de exemplo** (`src/data/mockData.ts`): Dashboard, Comparar, Sobrepor, Revisao, Obra, Versoes, Plotagem. Essas telas sao as proximas a conectar.

Se as variaveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` nao estiverem configuradas, **as telas ja conectadas caem automaticamente para dados de exemplo** (ha um aviso amarelo "Exibindo dados de exemplo" no topo da pagina nesse caso) — assim o app continua demonstravel mesmo sem credenciais.

## Estrutura de Pastas

```
src/
├── components/
│   ├── layout/        # Sidebar, Layout principal
│   └── ui/             # Componentes compartilhados (Card, Button, Badges...)
├── pages/
│   ├── dashboard/       # Dashboard com KPIs e graficos
│   ├── cronograma/      # Cronograma de projetos (lista + Gantt)
│   ├── projetos/         # Lista de pranchas, Comparacao, Sobreposicao
│   ├── review/            # Revisao com marcacao de issues e aprovacao
│   ├── obra/                # Armario virtual + Controle de versoes em campo
│   └── plotagem/             # Solicitacao/controle de plotagem com QR
├── context/             # AppContext (usuario atual, projeto atual)
├── data/                  # mockData.ts — dados de exemplo
├── lib/                     # supabase.ts — configuracao do cliente Supabase
└── types/                    # Tipos TypeScript de todo o dominio

supabase/
└── schema.sql            # Schema SQL completo (tabelas, enums, RLS, seed)
```

## Rotas

| Rota | Descricao |
|---|---|
| `/dashboard` | Dashboard geral com KPIs e graficos |
| `/cronograma` | Cronograma de projetos (lista/Gantt) |
| `/projetos` | Lista de pranchas com upload e filtros |
| `/projetos/:id/comparar` | Comparacao de versoes (slider 3 paineis) |
| `/projetos/:id/sobrepor` | Sobreposicao de PDFs com cor/opacidade |
| `/projetos/:id/revisao` | Revisao com marcacao de issues + aprovacao |
| `/obra` | Armario virtual de projetos (visao corte/armario) |
| `/versoes` | Controle de versoes em campo + scanner QR |
| `/plotagem` | Solicitacao e controle de plotagem |

## Como rodar localmente

```bash
npm install
npm run dev
```

## Configurar Supabase

1. Crie um projeto em **app.supabase.com** (free tier ja cobre bem o inicio do prototipo)
2. Va em **SQL Editor** e execute o arquivo `supabase/schema.sql` inteiro — isso cria todas as tabelas, enums, indices, RLS policies basicas e o seed de disciplinas (ARQ, EST, ELE, HID, etc.)
3. Va em **Storage** e crie 3 buckets:
   - `drawings` (privado) — PDFs/DWGs das pranchas
   - `thumbnails` (publico ou privado) — previews gerados
   - `avatars` (publico) — fotos de perfil
4. Va em **Project Settings > API** e copie a **Project URL** e a **anon public key**
5. Copie `.env.example` para `.env.local` e preencha:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. Reinicie o servidor de desenvolvimento

### Sobre as RLS policies do schema

O `schema.sql` cria policies simples ("qualquer usuario autenticado pode ler/escrever tudo") soh para destravar o desenvolvimento inicial. Antes de usar em producao real na obra, vale revisar e restringir por exemplo:
- Projetista so edita pranchas da propria disciplina
- Fiscal de obra so le (nao edita) pranchas e issues
- Issues e reviews vinculadas ao projeto que o usuario tem acesso

## Deploy no Vercel

1. Conecte o repositorio no vercel.com
2. Configure as variaveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) no painel do projeto Vercel
3. Build command: `npm run build` · Output directory: `dist`

## Proximos passos sugeridos

1. Conectar Supabase Auth (login com grupos: escritorio / obra) — `supabase.auth.signInWithPassword()` etc, com tabela `profiles` ja modelada
2. Conectar o Dashboard, Comparar, Sobrepor, Revisao, Obra, Versoes e Plotagem ao Supabase (mesmo padrao usado em `useDrawings`/`useMilestones`: hook com fallback para mock data)
3. Renderizacao real de PDF com `pdfjs-dist` (substituindo os placeholders SVG em Comparar/Sobrepor)
4. Geracao real de QR Code (`qrcode`) vinculado a cada prancha aprovada, salvando em `qr_code_data`
5. Scanner de QR Code real via camera (biblioteca `jsQR` + `getUserMedia`), gravando leituras na tabela `qr_scans`
6. Diff real de PDF (renderizar paginas em canvas e comparar pixel a pixel ou via OCR de vetores)
7. Realtime: usar `supabase.channel()` para atualizar o Dashboard e o Armario de Obra ao vivo quando uma prancha for aprovada
