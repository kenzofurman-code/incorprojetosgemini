-- ============================================================================
-- IncorProjetos — Supabase Schema
-- Execute este arquivo inteiro no SQL Editor do Supabase (Project > SQL Editor)
-- ============================================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
create type user_role as enum ('coordenador', 'projetista', 'fiscal_obra', 'admin');
create type user_group as enum ('escritorio', 'obra');

create type drawing_status as enum (
  'em_analise', 'aprovado', 'aprovado_com_ressalva',
  'liberado_para_obra', 'rejeitado', 'bloqueado', 'desativado'
);

create type project_phase as enum (
  'estudo_preliminar', 'anteprojeto', 'projeto_legal', 'projeto_basico',
  'pre_executivo', 'executivo', 'liberado_para_obra', 'as_built'
);

create type issue_category as enum (
  'conflito_projeto', 'incompletude', 'erro_cota',
  'falta_detalhe', 'nomenclatura', 'compatibilizacao', 'outro'
);

create type issue_status as enum ('aberto', 'em_revisao', 'resolvido');

create type review_status as enum ('em_andamento', 'concluido', 'aprovado', 'rejeitado');
create type review_decision as enum ('approve', 'approve_with_notes', 'reject');

create type milestone_status as enum ('no_prazo', 'atrasado', 'concluido', 'a_vencer');
create type milestone_priority as enum ('critico', 'alto', 'normal');

create type plot_status as enum ('solicitado', 'impresso', 'entregue', 'obsoleto');
create type plot_format as enum ('A0', 'A1', 'A2', 'A3', 'A4');

create type project_status as enum ('ativo', 'pausado', 'concluido');

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  address text,
  client text,
  total_floors int default 0,
  basements int default 0,
  start_date date,
  end_date date,
  status project_status default 'ativo',
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── FLOORS (pavimentos) ───────────────────────────────────────────────────
create table floors (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  code text not null,           -- e.g. "TER", "P03", "SS1", "COB"
  name text not null,           -- e.g. "Térreo", "3° Pavimento"
  floor_order int not null,     -- for vertical sorting
  created_at timestamptz default now(),
  unique(project_id, code)
);

-- ─── DISCIPLINES ──────────────────────────────────────────────────────────
create table disciplines (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,    -- e.g. "ARQ", "EST", "ELE"
  name text not null,
  color text not null default '#6B7280',
  created_at timestamptz default now()
);

-- ─── USERS (extends auth.users) ──────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'projetista',
  user_group user_group not null default 'escritorio',
  company text,
  avatar_url text,
  disciplines text[],           -- array of discipline codes
  created_at timestamptz default now()
);

-- ─── DRAWINGS (pranchas) ──────────────────────────────────────────────────
create table drawings (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  code text not null,                       -- full code e.g. "043-EP-ARQ-P03-PLA-002-R05"
  discipline_code text references disciplines(code),
  floor_code text not null,
  doc_type text,                            -- "PLA", "DET", "COR"
  number text,                              -- "002"
  revision text not null,                   -- "R00".."R99"
  phase project_phase not null default 'anteprojeto',
  status drawing_status not null default 'em_analise',
  title text,
  pdf_url text,                             -- Supabase Storage path/URL
  thumbnail_url text,
  designer_id uuid references profiles(id),
  designer_name text,                       -- denormalized for quick display
  is_original boolean default true,
  qr_code_data text,
  sent_at timestamptz default now(),
  updated_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_drawings_project on drawings(project_id);
create index idx_drawings_discipline on drawings(discipline_code);
create index idx_drawings_status on drawings(status);
create index idx_drawings_floor on drawings(floor_code);

-- ─── DRAWING VERSIONS (histórico de revisões) ────────────────────────────
create table drawing_versions (
  id uuid primary key default uuid_generate_v4(),
  drawing_group_code text not null,        -- code without revision suffix, groups versions
  drawing_id uuid references drawings(id) on delete cascade,
  revision text not null,
  pdf_url text,
  sent_at timestamptz default now(),
  status drawing_status not null default 'em_analise',
  approved_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
create index idx_versions_group on drawing_versions(drawing_group_code);

-- ─── REVIEWS ──────────────────────────────────────────────────────────────
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  drawing_id uuid references drawings(id) on delete cascade,
  drawing_code text,
  revision text,
  reviewer_id uuid references profiles(id),
  reviewer_name text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status review_status default 'em_andamento',
  decision review_decision,
  notes text,
  created_at timestamptz default now()
);
create index idx_reviews_drawing on reviews(drawing_id);

-- ─── ISSUES (marcações de revisão / lições aprendidas) ───────────────────
create table issues (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid references reviews(id) on delete cascade,
  drawing_id uuid references drawings(id) on delete cascade,
  x numeric not null,                       -- percentage position on PDF page
  y numeric not null,
  page_number int default 1,
  category issue_category not null default 'outro',
  status issue_status not null default 'aberto',
  title text not null,
  description text,
  assigned_to uuid references profiles(id),
  priority text default 'media',            -- 'alta' | 'media' | 'baixa'
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);
create index idx_issues_drawing on issues(drawing_id);
create index idx_issues_category on issues(category);
create index idx_issues_status on issues(status);

-- ─── SCHEDULES & MILESTONES (cronograma) ─────────────────────────────────
create table schedules (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table milestones (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid references schedules(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  discipline_code text references disciplines(code),
  phase project_phase not null,
  description text not null,
  planned_date date not null,
  actual_date date,
  status milestone_status default 'no_prazo',
  responsible_id uuid references profiles(id),
  responsible_name text,
  construction_need date,                   -- when needed on-site
  priority milestone_priority default 'normal',
  created_at timestamptz default now()
);
create index idx_milestones_project on milestones(project_id);
create index idx_milestones_discipline on milestones(discipline_code);

-- ─── PLOT ORDERS (plotagem) ───────────────────────────────────────────────
create table plot_orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  drawing_id uuid references drawings(id) on delete cascade,
  drawing_code text,
  drawing_revision text,
  is_current_version boolean default true,
  requested_by uuid references profiles(id),
  requested_by_name text,
  printed_by uuid references profiles(id),
  printed_at timestamptz,
  delivered_to text,
  delivered_at timestamptz,
  location text,
  copies int default 1,
  format plot_format default 'A1',
  status plot_status default 'solicitado',
  scanned_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
create index idx_plots_project on plot_orders(project_id);
create index idx_plots_status on plot_orders(status);
create index idx_plots_current on plot_orders(is_current_version);

-- ─── QR SCANS (log de leituras em campo) ─────────────────────────────────
create table qr_scans (
  id uuid primary key default uuid_generate_v4(),
  drawing_id uuid references drawings(id),
  plot_order_id uuid references plot_orders(id),
  scanned_by uuid references profiles(id),
  scanned_code text not null,
  was_current_version boolean,
  location text,
  scanned_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Habilita RLS em todas as tabelas. Ajuste as policies conforme sua
-- necessidade real de permissões (ex: projetista só edita o que é dele).
-- ============================================================================
alter table projects enable row level security;
alter table floors enable row level security;
alter table disciplines enable row level security;
alter table profiles enable row level security;
alter table drawings enable row level security;
alter table drawing_versions enable row level security;
alter table reviews enable row level security;
alter table issues enable row level security;
alter table schedules enable row level security;
alter table milestones enable row level security;
alter table plot_orders enable row level security;
alter table qr_scans enable row level security;

-- Policy simples para o protótipo: qualquer usuário autenticado pode ler/escrever.
-- IMPORTANTE: refine isso antes de ir para produção (ex: restringir por projeto,
-- por grupo escritorio/obra, e por papel coordenador/projetista/fiscal_obra).
create policy "Authenticated users full access" on projects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on floors
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on disciplines
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on profiles
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on drawings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on drawing_versions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on reviews
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on issues
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on schedules
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on milestones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on plot_orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on qr_scans
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================================
-- SEED: Disciplinas padrão (baseado nas siglas que você já usa)
-- ============================================================================
insert into disciplines (code, name, color) values
  ('ARQ',  'Arquitetura',          '#22C55E'),
  ('EST',  'Estrutura',            '#3B82F6'),
  ('ELE',  'Elétrica',             '#EAB308'),
  ('HID',  'Hidráulica',           '#06B6D4'),
  ('AR',   'Ar Condicionado',      '#8B5CF6'),
  ('AVAC', 'AVAC',                 '#A855F7'),
  ('INC',  'Incêndio',             '#EF4444'),
  ('GAS',  'Gás',                  '#F97316'),
  ('FND',  'Fundações',            '#92400E'),
  ('TOP',  'Topografia',           '#6B7280'),
  ('ARR',  'Arrimo',               '#1D4ED8'),
  ('AUT',  'Automação',            '#7C3AED'),
  ('ELEV', 'Elevadores',           '#BE185D'),
  ('INT',  'Interiores',           '#0D9488'),
  ('PAI',  'Paisagismo',           '#16A34A'),
  ('ANC',  'Ancoragens Definitivas', '#6B7280'),
  ('ASP',  'Aspiração Central',    '#6B7280'),
  ('ARTS', 'Aterramento/SPDA',     '#EF4444'),
  ('CGA',  'Consultoria Garagem',  '#EF4444'),
  ('COO',  'Coordenação',          '#EF4444');

-- ============================================================================
-- SEED: Projeto de demonstração (Blanc de Rouge) + pavimentos
-- Use isso para já ter um project_id real para testar Upload e Cronograma.
-- ============================================================================
insert into projects (id, name, code, address, client, total_floors, basements, start_date, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'Blanc de Rouge',
  '043',
  'Rua Moraes de Barros, 790 – Campo Belo, São Paulo',
  'Incorporadora Incor',
  25, 2, '2025-01-15', 'ativo'
)
on conflict (code) do nothing;

insert into floors (project_id, code, name, floor_order) values
  ('11111111-1111-1111-1111-111111111111', 'SS2', '2° Subsolo', 0),
  ('11111111-1111-1111-1111-111111111111', 'SS1', '1° Subsolo', 1),
  ('11111111-1111-1111-1111-111111111111', 'TER', 'Térreo', 2),
  ('11111111-1111-1111-1111-111111111111', 'P01', '1° Pavimento', 3),
  ('11111111-1111-1111-1111-111111111111', 'P02', '2° Pavimento', 4),
  ('11111111-1111-1111-1111-111111111111', 'P03', '3° Pavimento (1° Tipo)', 5),
  ('11111111-1111-1111-1111-111111111111', 'TIP', 'Pavimento Tipo', 6),
  ('11111111-1111-1111-1111-111111111111', 'ULT', 'Último Pavimento', 7),
  ('11111111-1111-1111-1111-111111111111', 'DUP', 'Duplex Superior', 8),
  ('11111111-1111-1111-1111-111111111111', 'COB', 'Cobertura', 9)
on conflict (project_id, code) do nothing;

insert into schedules (id, project_id, name) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Cronograma Principal — Blanc de Rouge'
)
on conflict (id) do nothing;

-- ============================================================================
-- STORAGE BUCKETS
-- Crie estes buckets manualmente em Supabase Dashboard > Storage,
-- ou via supabase-js / CLI:
--   drawings    (privado — PDFs/DWGs das pranchas)
--   thumbnails  (público ou privado — previews gerados)
--   avatars     (público — fotos de perfil)
--
-- IMPORTANTE: depois de criar o bucket "drawings", adicione uma policy de
-- Storage permitindo INSERT/SELECT para usuários autenticados, por exemplo:
--
--   create policy "Authenticated can upload drawings"
--     on storage.objects for insert
--     with check (bucket_id = 'drawings' and auth.role() = 'authenticated');
--
--   create policy "Authenticated can read drawings"
--     on storage.objects for select
--     using (bucket_id = 'drawings' and auth.role() = 'authenticated');
-- ============================================================================
