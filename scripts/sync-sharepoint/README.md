# Sync SharePoint — IncorProjetos

Script que roda 1x por dia e copia a **última versão aprovada** de cada prancha
(status `aprovado`, `aprovado_com_ressalva` ou `liberado_para_obra`) do Supabase
para uma biblioteca de documentos do SharePoint (ou OneDrive), organizada assim:

```
IncorProjetos/
└── Blanc de Rouge/
    ├── Arquitetura/
    │   ├── P03/
    │   │   └── 043-EP-ARQ-P03-PLA-002-R05.pdf
    │   └── TER/
    │       └── ...
    ├── Estrutura/
    │   └── ...
    └── Elétrica/
        └── ...
```

Cada execução **sobrescreve** o arquivo da pasta — o histórico de revisões
continua só no Supabase/app. O propósito aqui é dar pro time de obra e
projetistas terceirizados um lugar familiar pra consultar a versão mais
recente, sem precisar logar no IncorProjetos.

## Passo 1 — Registrar um App no Azure AD (Entra ID)

Isso é necessário pra gerar credenciais que o script usa para se autenticar
no Microsoft Graph **sem precisar de um usuário logado** (modo "app-only",
ideal para automação).

1. Acesse **portal.azure.com** → busque **"Registros de aplicativo"** (App registrations)
2. Clique em **Novo registro**
   - Nome: `IncorProjetos Sync`
   - Tipos de conta com suporte: **Somente neste diretório organizacional**
   - Não precisa de Redirect URI
3. Após criar, anote o **Application (client) ID** e o **Directory (tenant) ID** — vão para `MS_CLIENT_ID` e `MS_TENANT_ID`
4. Vá em **Certificados e segredos** → **Novo segredo do cliente**
   - Descrição: `sync-job`
   - Expiração: 12 ou 24 meses (anote a data — vai precisar renovar)
   - Copie o **Value** imediatamente (some da tela depois) → vai para `MS_CLIENT_SECRET`
5. Vá em **Permissões de API** → **Adicionar uma permissão** → **Microsoft Graph** → **Permissões de aplicativo** (não "delegadas", já que não tem usuário logado)
   - Adicione: `Sites.ReadWrite.All` (para SharePoint) ou `Files.ReadWrite.All` (para OneDrive de uma conta específica)
6. Clique em **Conceder consentimento do administrador** — isso precisa ser feito por alguém com permissão de admin no Microsoft 365 da Incor

## Passo 2 — Achar o `MS_SITE_ID` (se for usar SharePoint)

Com o token funcionando, a forma mais simples é via Graph Explorer
(developer.microsoft.com/graph/graph-explorer) logado como admin, rodando:

```
GET https://graph.microsoft.com/v1.0/sites/{hostname}:/sites/{site-path}
```

Exemplo, se o site for `https://incor.sharepoint.com/sites/Projetos`:

```
GET https://graph.microsoft.com/v1.0/sites/incor.sharepoint.com:/sites/Projetos
```

A resposta traz um campo `"id"` no formato `incor.sharepoint.com,xxxxx,yyyyy`
— isso inteiro é o seu `MS_SITE_ID`.

Alternativa: se preferir sincronizar para um **OneDrive** específico (mais
simples, sem precisar achar site), use `MS_DRIVE_ID` no lugar — pegue via:

```
GET https://graph.microsoft.com/v1.0/users/{email}/drive
```

## Passo 3 — Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha com as credenciais do Passo 1, o `SUPABASE_SERVICE_ROLE_KEY` (em
Supabase Dashboard → Project Settings → API → `service_role` — **nunca**
exponha essa chave no frontend, só em jobs server-side como este), e o
`SYNC_PROJECT_ID` do projeto que quer sincronizar.

## Passo 4 — Testar localmente

```bash
npm install
npm run sync
```

A saída mostra, prancha por prancha, se subiu com sucesso (`✓`) ou falhou (`✗`).

## Passo 5 — Agendar 1x por dia via GitHub Actions

Já existe um workflow pronto em `.github/workflows/sync-sharepoint.yml` na
raiz do repositório, configurado para rodar todo dia às 6h (horário de
Brasília). Para ativar:

1. No repositório GitHub, vá em **Settings → Secrets and variables → Actions**
2. Adicione cada uma das variáveis do `.env` como um **Repository secret**
   (mesmos nomes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MS_TENANT_ID`, etc.)
3. Pronto — o workflow já roda sozinho no horário configurado. Você também
   pode disparar manualmente em **Actions → Sync SharePoint → Run workflow**
   para testar sem esperar o cron.

## Sobre tamanho de arquivo

Pranchas de construção em PDF de alta resolução costumam passar de 4MB. O
script já trata isso automaticamente: arquivos até 4MB sobem direto (PUT
simples), arquivos maiores usam "upload session" do Graph (upload em pedaços
de 5MB), que é o método recomendado pela Microsoft para arquivos grandes.

## Limitações conhecidas / próximos passos

- O script roda sequencialmente (uma prancha por vez). Para volumes grandes
  (centenas de pranchas), considerar paralelizar com um limite de
  concorrência (ex: 5 uploads simultâneos).
- Não há retry automático em caso de falha de rede pontual — se uma prancha
  falhar, ela é pulada e reportada no log, mas tenta de novo só na próxima
  execução diária.
- O secret do Azure AD expira (12-24 meses) — vale colocar um lembrete de
  calendário para renovar antes do vencimento, ou a sincronização para de
  funcionar silenciosamente.
