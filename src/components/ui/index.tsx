import type { ReactNode, ButtonHTMLAttributes } from 'react'
import type { DrawingStatus, IssueCategory, MilestoneStatus } from '../../types'

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function Card({ children, className = '', style, onClick }: CardProps) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--surface-border)',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size]

  const variantStyle: React.CSSProperties = {
    primary: {
      background: 'var(--orange)',
      color: 'white',
      border: '1px solid var(--orange-dark)',
    },
    secondary: {
      background: 'var(--navy-mid)',
      color: 'white',
      border: '1px solid var(--navy-light)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--slate)',
      border: '1px solid var(--surface-border)',
    },
    danger: {
      background: 'rgba(239,68,68,0.15)',
      color: '#EF4444',
      border: '1px solid rgba(239,68,68,0.3)',
    },
  }[variant]

  return (
    <button
      className={`${sizeClasses} rounded-lg font-medium transition-all hover:opacity-90 active:scale-95 flex items-center gap-2 ${className}`}
      style={variantStyle}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<DrawingStatus, { label: string; color: string; bg: string }> = {
  em_analise:             { label: 'Em Análise',        color: '#EAB308', bg: 'rgba(234,179,8,0.15)'    },
  aprovado:               { label: 'Aprovado',          color: '#22C55E', bg: 'rgba(34,197,94,0.15)'    },
  aprovado_com_ressalva:  { label: 'Com Ressalva',      color: '#06B6D4', bg: 'rgba(6,182,212,0.15)'    },
  liberado_para_obra:     { label: 'Lib. para Obra',    color: '#22C55E', bg: 'rgba(34,197,94,0.25)'    },
  rejeitado:              { label: 'Rejeitado',         color: '#EF4444', bg: 'rgba(239,68,68,0.15)'    },
  bloqueado:              { label: 'Bloqueado',         color: '#6B7280', bg: 'rgba(107,114,128,0.15)'  },
  desativado:             { label: 'Desativado',        color: '#6B7280', bg: 'rgba(107,114,128,0.1)'   },
}

export function StatusBadge({ status }: { status: DrawingStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.em_analise
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

// ─── IssueCategoryBadge ───────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<IssueCategory, { label: string; color: string }> = {
  conflito_projeto:  { label: 'Conflito',       color: '#EF4444' },
  incompletude:      { label: 'Incompleto',     color: '#F97316' },
  erro_cota:         { label: 'Erro de Cota',   color: '#EAB308' },
  falta_detalhe:     { label: 'Sem Detalhe',    color: '#3B82F6' },
  nomenclatura:      { label: 'Nomenclatura',   color: '#8B5CF6' },
  compatibilizacao:  { label: 'Compat.',        color: '#06B6D4' },
  outro:             { label: 'Outro',          color: '#6B7280' },
}

export function IssueCategoryBadge({ category }: { category: IssueCategory }) {
  const cfg = CATEGORY_CONFIG[category]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: cfg.color, background: `${cfg.color}22` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── MilestoneStatusBadge ─────────────────────────────────────────────────────
const MILESTONE_CONFIG: Record<MilestoneStatus, { label: string; color: string }> = {
  no_prazo:  { label: 'No Prazo',   color: '#22C55E' },
  atrasado:  { label: 'Atrasado',   color: '#EF4444' },
  concluido: { label: 'Concluído',  color: '#3B82F6' },
  a_vencer:  { label: 'A Vencer',   color: '#EAB308' },
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const cfg = MILESTONE_CONFIG[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ color: cfg.color, background: `${cfg.color}22` }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: number | string
  icon?: ReactNode
  color?: string
  sub?: string
}

export function StatCard({ label, value, icon, color = 'var(--orange)', sub }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--slate)' }}>{label}</div>
          <div className="text-2xl font-bold" style={{ color }}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </div>
          {sub && <div className="text-xs mt-1" style={{ color: 'var(--slate)' }}>{sub}</div>}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${color}22`, color }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Page Header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--white)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--slate)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-card)', color: 'var(--slate)' }}>
        {icon}
      </div>
      <div className="text-sm font-semibold mb-1" style={{ color: 'var(--white)' }}>{title}</div>
      <div className="text-sm max-w-xs" style={{ color: 'var(--slate)' }}>{description}</div>
    </div>
  )
}

// ─── Discipline Dot ───────────────────────────────────────────────────────────
export function DisciplineDot({ color, label }: { color: string; label?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--slate)' }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

// ─── Data Source Badge ────────────────────────────────────────────────────────
// Shown when the screen is using mock data instead of live Supabase data,
// so it's always clear during development/demo whether data is real.
export function DataSourceBadge({ usingMockData }: { usingMockData: boolean }) {
  if (!usingMockData) return null
  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg mb-4"
      style={{ background: 'rgba(234,179,8,0.12)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.25)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EAB308' }} />
      Exibindo dados de exemplo — configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar dados reais
    </div>
  )
}

// ── PdfViewer re-export ────────────────────────────────────────────────────────
export { default as PdfViewer } from './PdfViewer'

// ── QR components re-export ───────────────────────────────────────────────────
export { default as QrScanner } from './QrScanner'
export { default as DrawingQrCode } from './DrawingQrCode'
