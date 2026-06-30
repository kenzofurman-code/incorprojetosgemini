import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Search, Eye, GitCompare, Layers,
  FileCheck, ChevronDown, ChevronRight, QrCode, History, Loader2, AlertCircle
} from 'lucide-react'
import { Card, PageHeader, StatusBadge, Button, DataSourceBadge } from '../../components/ui'
import { DISCIPLINES, DISCIPLINE_MAP } from '../../data/mockData'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp, SEED_PROJECT_ID } from '../../context/AppContext'
import type { Drawing, ProjectPhase } from '../../types'

function VersionPill({ revision, active }: { revision: string; active?: boolean }) {
  return (
    <span
      className="text-xs font-mono px-1.5 py-0.5 rounded"
      style={{
        background: active ? 'var(--orange)' : 'var(--surface-mid)',
        color: active ? 'white' : 'var(--slate)',
        border: `1px solid ${active ? 'var(--orange-dark)' : 'var(--surface-border)'}`,
      }}
    >
      {revision}
    </span>
  )
}

function DrawingRow({ drawing, onAction }: {
  drawing: Drawing
  onAction: (action: 'compare' | 'overlay' | 'review' | 'view', id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const disc = DISCIPLINE_MAP[drawing.disciplineCode]

  return (
    <>
      <tr
        className="border-b hover:bg-white/5 transition-colors cursor-pointer"
        style={{ borderColor: 'var(--surface-border)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 w-6">
          <button className="p-0.5" style={{ color: 'var(--slate)' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{
                background: `${disc?.color || '#6B7280'}22`,
                color: disc?.color || '#6B7280',
                border: `1px solid ${disc?.color || '#6B7280'}44`,
                minWidth: 38,
                textAlign: 'center',
              }}
            >
              {drawing.disciplineCode}
            </span>
            <div>
              <div className="text-xs font-mono font-semibold" style={{ color: 'var(--white)' }}>
                {drawing.code}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                {drawing.title}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs" style={{ color: 'var(--slate)' }}>{drawing.floor}</span>
        </td>
        <td className="px-4 py-3">
          <VersionPill revision={drawing.revision} active />
        </td>
        <td className="px-4 py-3">
          <span className="text-xs" style={{ color: 'var(--slate)' }}>
            {new Date(drawing.sentAt).toLocaleDateString('pt-BR')}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs" style={{ color: 'var(--slate)' }}>{drawing.designerName}</span>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={drawing.status} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onAction('view', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Visualizar"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => onAction('compare', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Comparar versões"
            >
              <GitCompare size={14} />
            </button>
            <button
              onClick={() => onAction('overlay', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Sobrepor projetos"
            >
              <Layers size={14} />
            </button>
            <button
              onClick={() => onAction('review', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Revisar / Aprovar"
            >
              <FileCheck size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
          <td colSpan={8} className="px-6 pb-4 pt-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--slate)' }}>
                <History size={12} className="inline mr-1.5" />
                Histórico de Revisões
              </div>
              <div className="flex flex-wrap gap-2">
                {(drawing.versions || []).map(v => (
                  <div
                    key={v.revision}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: 'var(--surface-mid)',
                      border: `1px solid ${v.revision === drawing.revision ? 'var(--orange)' : 'var(--surface-border)'}`,
                    }}
                  >
                    <VersionPill revision={v.revision} active={v.revision === drawing.revision} />
                    <span className="text-xs" style={{ color: 'var(--slate)' }}>
                      {new Date(v.sentAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-xs font-semibold ${
                      v.status === 'aprovado' || v.status === 'liberado_para_obra' ? 'text-green-400'
                      : v.status === 'rejeitado' ? 'text-red-400'
                      : 'text-yellow-400'
                    }`}>
                      {v.status === 'liberado_para_obra' ? 'Lib.Obra'
                        : v.status === 'aprovado' ? '✓'
                        : v.status === 'rejeitado' ? '✗'
                        : '…'}
                    </span>
                    {v.revision !== drawing.revision && (
                      <button
                        onClick={() => onAction('compare', drawing.id)}
                        className="text-xs hover:underline ml-1"
                        style={{ color: 'var(--orange)' }}
                      >
                        comparar
                      </button>
                    )}
                  </div>
                ))}
                {(!drawing.versions || drawing.versions.length === 0) && (
                  <span className="text-xs" style={{ color: 'var(--slate)' }}>
                    Apenas esta revisão enviada até o momento.
                  </span>
                )}
              </div>
              {drawing.approvedBy && (
                <div className="text-xs mt-2" style={{ color: 'var(--slate)' }}>
                  Aprovado por <span style={{ color: 'var(--white)' }}>{drawing.approvedBy}</span>
                  {drawing.approvedAt && ` em ${new Date(drawing.approvedAt).toLocaleDateString('pt-BR')}`}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
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

function UploadPanel({ projectId, onClose, onUploaded }: {
  projectId: string
  onClose: () => void
  onUploaded: () => void
}) {
  const { upload } = useDrawings(projectId)
  const { currentUser } = useApp()

  const [file, setFile] = useState<File | null>(null)
  const [disciplineCode, setDisciplineCode] = useState('')
  const [floorCode, setFloorCode] = useState('')
  const [docType, setDocType] = useState('PLA')
  const [number, setNumber] = useState('001')
  const [revision, setRevision] = useState('R00')
  const [phase, setPhase] = useState<ProjectPhase>('anteprojeto')
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const generatedCode = disciplineCode && floorCode
    ? `043-EP-${disciplineCode}-${floorCode}-${docType}-${number}-${revision}`
    : ''

  async function handleSubmit() {
    if (!file || !disciplineCode || !floorCode || !title) {
      setError('Preencha arquivo, disciplina, pavimento e título.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await upload({
        projectId,
        file,
        code: generatedCode,
        disciplineCode,
        floorCode,
        docType,
        number,
        revision,
        phase,
        title,
        designerName: currentUser.name,
        designerId: currentUser.id,
      })
      setSuccess(true)
      setTimeout(() => {
        onUploaded()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar prancha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="text-sm font-semibold mb-4" style={{ color: 'var(--white)' }}>
        Upload de Prancha
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs p-3 rounded-lg mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="text-xs p-3 rounded-lg mb-4"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
          ✓ Prancha enviada com sucesso!
        </div>
      )}

      <label
        className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-orange-400/50 transition-colors"
        style={{ borderColor: file ? 'var(--orange)' : 'var(--surface-border)' }}
      >
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <Upload size={32} className="mx-auto mb-3" style={{ color: file ? 'var(--orange)' : 'var(--slate)' }} />
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--white)' }}>
          {file ? file.name : 'Arraste um PDF aqui ou clique para selecionar'}
        </div>
        <div className="text-xs" style={{ color: 'var(--slate)' }}>
          PDF · Máximo 100MB por arquivo
        </div>
      </label>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
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
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Pavimento *</label>
          <input
            type="text"
            placeholder="Ex: P03, TER, COB"
            value={floorCode}
            onChange={e => setFloorCode(e.target.value.toUpperCase())}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
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
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Revisão</label>
          <select
            value={revision}
            onChange={e => setRevision(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            {['R00','R01','R02','R03','R04','R05'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Tipo</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            {['PLA','DET','COR','LAJ','FOR'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Número</label>
          <input
            type="text"
            value={number}
            onChange={e => setNumber(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--slate)' }}>Título *</label>
          <input
            type="text"
            placeholder="Ex: Planta de Acabamentos - Apto 31"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
      </div>

      {generatedCode && (
        <div className="mt-3 text-xs font-mono px-3 py-2 rounded-lg" style={{ background: 'var(--surface-mid)', color: 'var(--orange)' }}>
          Código gerado: {generatedCode}
        </div>
      )}

      <div className="flex gap-2 mt-4 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancelar</Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {submitting ? 'Enviando...' : 'Enviar Prancha'}
        </Button>
      </div>
    </Card>
  )
}

export default function Projetos() {
  const navigate = useNavigate()
  const { currentProject } = useApp()
  const projectId = currentProject.id === 'proj-043' ? SEED_PROJECT_ID : currentProject.id

  const { drawings, loading, error, usingMockData, refresh } = useDrawings(projectId)

  const [search, setSearch] = useState('')
  const [filterDisc, setFilterDisc] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterFloor, setFilterFloor] = useState('todos')
  const [showUpload, setShowUpload] = useState(false)

  const floors = [...new Set(drawings.map(d => d.floor))].sort()

  const filtered = drawings.filter(d => {
    const q = search.toLowerCase()
    if (q && !d.code.toLowerCase().includes(q) && !d.title.toLowerCase().includes(q) && !d.designerName.toLowerCase().includes(q)) return false
    if (filterDisc !== 'todos' && d.disciplineCode !== filterDisc) return false
    if (filterStatus !== 'todos' && d.status !== filterStatus) return false
    if (filterFloor !== 'todos' && d.floor !== filterFloor) return false
    return true
  })

  function handleAction(action: 'compare' | 'overlay' | 'review' | 'view', id: string) {
    if (action === 'compare') navigate(`/projetos/${id}/comparar`)
    if (action === 'overlay') navigate(`/projetos/${id}/sobrepor`)
    if (action === 'review') navigate(`/projetos/${id}/revisao`)
    if (action === 'view') navigate(`/projetos/${id}/comparar`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projetos"
        subtitle={`${filtered.length} pranchas · ${currentProject.name}`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => {}}>
              <QrCode size={14} /> QR Code
            </Button>
            <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
              <Upload size={14} /> Upload Prancha
            </Button>
          </>
        }
      />

      <DataSourceBadge usingMockData={usingMockData} />

      {error && !usingMockData && (
        <div className="flex items-center gap-2 text-xs p-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onUploaded={refresh}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate)' }} />
          <input
            type="text"
            placeholder="Buscar por código, título, projetista..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm rounded-lg outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        {[
          { value: filterDisc, setter: setFilterDisc, label: 'Disciplina', options: DISCIPLINES.map(d => ({ v: d.code, l: `${d.code} – ${d.name}` })) },
          { value: filterStatus, setter: setFilterStatus, label: 'Status', options: [
            { v: 'em_analise', l: 'Em Análise' },
            { v: 'aprovado', l: 'Aprovado' },
            { v: 'liberado_para_obra', l: 'Lib. Obra' },
            { v: 'rejeitado', l: 'Rejeitado' },
          ]},
          { value: filterFloor, setter: setFilterFloor, label: 'Pavimento', options: floors.map(f => ({ v: f, l: f })) },
        ].map(f => (
          <select
            key={f.label}
            value={f.value}
            onChange={e => f.setter(e.target.value)}
            className="text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            <option value="todos">Todos: {f.label}</option>
            {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--slate)' }}>
            <Loader2 size={16} className="animate-spin" /> Carregando pranchas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                  <th className="px-4 py-3 w-6" />
                  {['Código / Título','Pav.','Revisão','Data Envio','Projetista','Status','Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <DrawingRow key={d.id} drawing={d} onAction={handleAction} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm" style={{ color: 'var(--slate)' }}>
                      Nenhuma prancha encontrada com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
