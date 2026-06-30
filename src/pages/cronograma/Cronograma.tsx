import { useState } from 'react'
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus, Loader2, AlertCircle } from 'lucide-react'
import { Card, PageHeader, MilestoneStatusBadge, Button, DataSourceBadge } from '../../components/ui'
import { DISCIPLINES, DISCIPLINE_MAP } from '../../data/mockData'
import { useMilestones } from '../../hooks/useMilestones'
import { useApp, SEED_PROJECT_ID, SEED_SCHEDULE_ID } from '../../context/AppContext'
import type { Milestone, MilestoneStatus, ProjectPhase } from '../../types'

const PHASE_LABELS: Record<string, string> = {
  estudo_preliminar: 'Estudo Preliminar',
  anteprojeto: 'Anteprojeto',
  projeto_legal: 'Projeto Legal',
  projeto_basico: 'Projeto Básico',
  pre_executivo: 'Pré-Executivo',
  executivo: 'Executivo',
  liberado_para_obra: 'Lib. para Obra',
  as_built: 'As Built',
}

const PHASE_OPTIONS: { value: ProjectPhase; label: string }[] = [
  { value: 'estudo_preliminar', label: 'Estudo Preliminar' },
  { value: 'anteprojeto', label: 'Anteprojeto' },
  { value: 'projeto_legal', label: 'Projeto Legal' },
  { value: 'projeto_basico', label: 'Projeto Básico' },
  { value: 'pre_executivo', label: 'Pré-Executivo' },
  { value: 'executivo', label: 'Executivo' },
  { value: 'as_built', label: 'As Built' },
]

function DaysUntil({ date }: { date: string }) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return <span className="text-xs font-mono" style={{ color: '#EF4444' }}>{Math.abs(diff)}d atraso</span>
  if (diff === 0) return <span className="text-xs font-mono" style={{ color: '#EAB308' }}>Hoje</span>
  if (diff <= 7) return <span className="text-xs font-mono" style={{ color: '#EAB308' }}>{diff}d</span>
  return <span className="text-xs font-mono" style={{ color: 'var(--slate)' }}>{diff}d</span>
}

function MilestoneRow({ ms }: { ms: Milestone }) {
  const disc = DISCIPLINE_MAP[ms.disciplineCode]
  const plannedDate = new Date(ms.plannedDate).toLocaleDateString('pt-BR')
  const constructionDate = ms.constructionNeed
    ? new Date(ms.constructionNeed).toLocaleDateString('pt-BR')
    : '—'

  const priorityColor = ms.priority === 'critico' ? '#EF4444'
    : ms.priority === 'alto' ? '#F97316'
    : 'var(--slate)'

  return (
    <tr className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--surface-border)' }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-6 rounded-full flex-shrink-0"
            style={{ background: priorityColor }}
          />
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--white)' }}>
              {ms.description}
            </div>
            <div className="text-xs" style={{ color: 'var(--slate)' }}>
              {ms.responsibleName}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: disc?.color || '#6B7280' }}
          />
          <span className="text-xs font-mono font-semibold" style={{ color: disc?.color || 'var(--slate)' }}>
            {ms.disciplineCode}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs" style={{ color: 'var(--slate)' }}>
          {PHASE_LABELS[ms.phase] || ms.phase}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--white)' }}>{plannedDate}</span>
          {ms.status !== 'concluido' && <DaysUntil date={ms.plannedDate} />}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono" style={{ color: 'var(--orange)' }}>
          {constructionDate}
        </span>
      </td>
      <td className="px-4 py-3">
        <MilestoneStatusBadge status={ms.status} />
      </td>
      <td className="px-4 py-3">
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: priorityColor }}
        >
          {ms.priority}
        </span>
      </td>
    </tr>
  )
}

// Mini Gantt visual bar
function GanttBar({ ms }: { ms: Milestone }) {
  const disc = DISCIPLINE_MAP[ms.disciplineCode]
  const start = new Date('2026-05-01').getTime()
  const end = new Date('2026-09-30').getTime()
  const total = end - start

  const barStart = Math.max(0, (new Date(ms.plannedDate).getTime() - start) / total * 100)

  const statusColor = ms.status === 'concluido' ? '#22C55E'
    : ms.status === 'atrasado' ? '#EF4444'
    : ms.status === 'a_vencer' ? '#EAB308'
    : disc?.color || '#3B82F6'

  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <div className="w-48 text-xs truncate flex-shrink-0" style={{ color: 'var(--slate)' }}>
        <span className="font-mono font-semibold" style={{ color: disc?.color }}>[{ms.disciplineCode}]</span>{' '}
        {ms.description.split(' ').slice(0, 4).join(' ')}
      </div>
      <div className="flex-1 relative h-5 rounded" style={{ background: 'var(--surface-mid)' }}>
        <div
          className="absolute top-0 bottom-0 w-px z-10"
          style={{
            left: `${Math.max(0, (Date.now() - start) / total * 100)}%`,
            background: 'rgba(249,115,22,0.6)',
          }}
        />
        {ms.constructionNeed && (
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${Math.max(0, (new Date(ms.constructionNeed).getTime() - start) / total * 100)}%`,
              background: 'rgba(234,179,8,0.5)',
            }}
          />
        )}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white/20"
          style={{
            left: `${barStart}%`,
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}88`,
          }}
        />
      </div>
    </div>
  )
}

function NewMilestoneForm({ projectId, scheduleId, onClose, onCreated }: {
  projectId: string
  scheduleId: string
  onClose: () => void
  onCreated: () => void
}) {
  const { add } = useMilestones(projectId)
  const { currentUser } = useApp()

  const [description, setDescription] = useState('')
  const [disciplineCode, setDisciplineCode] = useState('')
  const [phase, setPhase] = useState<ProjectPhase>('executivo')
  const [plannedDate, setPlannedDate] = useState('')
  const [constructionNeed, setConstructionNeed] = useState('')
  const [priority, setPriority] = useState<Milestone['priority']>('normal')
  const [responsibleName, setResponsibleName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!description || !disciplineCode || !plannedDate || !responsibleName) {
      setError('Preencha descrição, disciplina, data prevista e responsável.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await add({
        projectId,
        scheduleId,
        disciplineCode,
        phase,
        description,
        plannedDate,
        constructionNeed: constructionNeed || undefined,
        responsibleName,
        responsibleId: currentUser.id,
        priority,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar marco.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-5 space-y-3" style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--white)' }}>Novo Marco de Cronograma</div>

      {error && (
        <div className="flex items-start gap-2 text-xs p-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="col-span-2 lg:col-span-3">
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Descrição *</label>
          <input
            type="text"
            placeholder="Ex: Projeto Executivo EST - Pavimento Tipo"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Disciplina *</label>
          <select
            value={disciplineCode}
            onChange={e => setDisciplineCode(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            <option value="">Selecionar...</option>
            {DISCIPLINES.map(d => <option key={d.code} value={d.code}>{d.code} – {d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Fase</label>
          <select
            value={phase}
            onChange={e => setPhase(e.target.value as ProjectPhase)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            {PHASE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Prioridade</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Milestone['priority'])}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            <option value="normal">Normal</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Entrega Prevista *</label>
          <input
            type="date"
            value={plannedDate}
            onChange={e => setPlannedDate(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Necessidade em Obra</label>
          <input
            type="date"
            value={constructionNeed}
            onChange={e => setConstructionNeed(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Responsável *</label>
          <input
            type="text"
            placeholder="Nome do projetista"
            value={responsibleName}
            onChange={e => setResponsibleName(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancelar</Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {submitting ? 'Salvando...' : 'Criar Marco'}
        </Button>
      </div>
    </Card>
  )
}

export default function Cronograma() {
  const { currentProject } = useApp()
  const projectId = currentProject.id === 'proj-043' ? SEED_PROJECT_ID : currentProject.id

  const { milestones, loading, error, usingMockData, refresh } = useMilestones(projectId)

  const [view, setView] = useState<'lista' | 'gantt'>('lista')
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | 'todos'>('todos')
  const [filterDisc, setFilterDisc] = useState<string>('todos')
  const [showNewForm, setShowNewForm] = useState(false)

  const filtered = milestones.filter(ms => {
    if (filterStatus !== 'todos' && ms.status !== filterStatus) return false
    if (filterDisc !== 'todos' && ms.disciplineCode !== filterDisc) return false
    return true
  })

  const counts = {
    concluido: milestones.filter(m => m.status === 'concluido').length,
    atrasado:  milestones.filter(m => m.status === 'atrasado').length,
    no_prazo:  milestones.filter(m => m.status === 'no_prazo').length,
    a_vencer:  milestones.filter(m => m.status === 'a_vencer').length,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cronograma de Projetos"
        subtitle={`Marcos de entrega por disciplina · ${currentProject.name}`}
        actions={
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)}>
            <Plus size={14} /> Novo Marco
          </Button>
        }
      />

      <DataSourceBadge usingMockData={usingMockData} />

      {error && !usingMockData && (
        <div className="flex items-center gap-2 text-xs p-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {showNewForm && (
        <NewMilestoneForm
          projectId={projectId}
          scheduleId={SEED_SCHEDULE_ID}
          onClose={() => setShowNewForm(false)}
          onCreated={refresh}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Concluídos',   count: counts.concluido, color: '#22C55E', icon: <CheckCircle size={16}/> },
          { label: 'No Prazo',     count: counts.no_prazo,  color: '#3B82F6', icon: <Clock size={16}/> },
          { label: 'A Vencer',     count: counts.a_vencer,  color: '#EAB308', icon: <Calendar size={16}/> },
          { label: 'Atrasados',    count: counts.atrasado,  color: '#EF4444', icon: <AlertTriangle size={16}/> },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}22`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs" style={{ color: 'var(--slate)' }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters + View toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
          {(['lista', 'gantt'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-1.5 text-sm capitalize transition-colors"
              style={{
                background: view === v ? 'var(--navy-mid)' : 'var(--surface-card)',
                color: view === v ? 'var(--white)' : 'var(--slate)',
              }}
            >
              {v === 'gantt' ? 'Gantt' : 'Lista'}
            </button>
          ))}
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
        >
          <option value="todos">Todos os status</option>
          <option value="no_prazo">No Prazo</option>
          <option value="atrasado">Atrasado</option>
          <option value="a_vencer">A Vencer</option>
          <option value="concluido">Concluído</option>
        </select>

        <select
          value={filterDisc}
          onChange={e => setFilterDisc(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
        >
          <option value="todos">Todas disciplinas</option>
          {DISCIPLINES.map(d => (
            <option key={d.code} value={d.code}>{d.code} – {d.name}</option>
          ))}
        </select>

        <span className="text-xs ml-auto" style={{ color: 'var(--slate)' }}>
          {filtered.length} marcos
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <Card className="p-16 flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--slate)' }}>
          <Loader2 size={16} className="animate-spin" /> Carregando cronograma...
        </Card>
      ) : view === 'lista' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                  {['Descrição / Responsável','Disciplina','Fase','Entrega Prevista','Necessidade Obra','Status','Prioridade'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ms => <MilestoneRow key={ms.id} ms={ms} />)}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm" style={{ color: 'var(--slate)' }}>
                      Nenhum marco encontrado com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="w-48 text-xs font-semibold" style={{ color: 'var(--slate)' }}>Descrição</div>
            <div className="flex-1 flex justify-between text-xs" style={{ color: 'var(--slate)' }}>
              {['Mai','Jun','Jul','Ago','Set'].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
          <div className="flex gap-4 mb-4 text-xs" style={{ color: 'var(--slate)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-px" style={{ background: 'rgba(249,115,22,0.6)', display: 'inline-block' }} />
              Hoje
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-px" style={{ background: 'rgba(234,179,8,0.5)', display: 'inline-block' }} />
              Necessidade Obra
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#22C55E' }} />
              Concluído
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#EF4444' }} />
              Atrasado
            </span>
          </div>
          <div className="space-y-0.5">
            {filtered.map(ms => <GanttBar key={ms.id} ms={ms} />)}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--slate)' }}>
                Nenhum marco encontrado com esses filtros.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
