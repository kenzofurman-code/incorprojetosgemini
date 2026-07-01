import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import {
  FileText, CheckCircle, Clock, AlertTriangle,
  Printer, TrendingUp, AlertCircle, Target, RefreshCw
} from 'lucide-react'
import { Card, StatCard, PageHeader, DisciplineDot, DataSourceBadge, Button } from '../../components/ui'
import { useDashboard } from '../../hooks/useDashboard'
import { useApp } from '../../context/AppContext'

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {Math.round(percent * 100)}%
    </text>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl border"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--white)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--slate)' }}>{p.name}:</span>
          <span style={{ color: 'var(--white)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { currentProject } = useApp()
  const projectId = currentProject.id

  const {
    stats, docsByDiscipline, docsByStatus, issuesByCategory, weeklyActivity,
    recentDrawings, loading, usingMockData, error, refresh,
  } = useDashboard(projectId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${currentProject.name} · Atualizado agora`}
        actions={
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Carregando…' : 'Atualizar'}
          </Button>
        }
      />

      <DataSourceBadge usingMockData={usingMockData} />

      {error && (
        <div className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* KPI Row 1 - Documentos */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--slate)' }}>
          Documentos
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total de Documentos"
            value={stats.totalDrawings}
            icon={<FileText size={18} />}
            color="var(--white)"
          />
          <StatCard
            label="Aprovados"
            value={stats.approvedDrawings}
            icon={<CheckCircle size={18} />}
            color="#22C55E"
          />
          <StatCard
            label="Em Análise"
            value={stats.inReviewDrawings}
            icon={<Clock size={18} />}
            color="#EAB308"
          />
          <StatCard
            label="Liberados para Obra"
            value={stats.liberadoObra}
            icon={<Target size={18} />}
            color="#3B82F6"
          />
        </div>
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total de Impressos"
          value={stats.totalPlots}
          icon={<Printer size={18} />}
          color="var(--orange)"
        />
        <StatCard
          label="Impressos Obsoletos"
          value={stats.obsoletePlots}
          icon={<AlertCircle size={18} />}
          color="#EF4444"
          sub="em campo"
        />
        <StatCard
          label="Issues Abertas"
          value={stats.openIssues}
          icon={<AlertTriangle size={18} />}
          color="#F97316"
        />
        <StatCard
          label="Aderência ao Prazo"
          value={`${stats.onTimeRate}%`}
          icon={<TrendingUp size={18} />}
          color="#22C55E"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status donut */}
        <Card className="p-5">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--white)' }}>
            Status atual
          </div>
          {docsByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-xs" style={{ color: 'var(--slate)' }}>
              Sem dados ainda
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={docsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {docsByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {docsByStatus.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <DisciplineDot color={d.color} label={d.name} />
                    <span className="font-mono font-semibold" style={{ color: 'var(--white)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Docs by discipline bar */}
        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--white)' }}>
            Documentos por Disciplina
          </div>
          {docsByDiscipline.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-xs" style={{ color: 'var(--slate)' }}>
              Sem dados ainda
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={docsByDiscipline} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--slate)', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: 'var(--slate)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Pranchas" radius={[3, 3, 0, 0]}>
                  {docsByDiscipline.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly activity */}
        <Card className="p-5">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--white)' }}>
            Atividade Semanal – Envio de Documentos
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyActivity} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--slate)', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: 'var(--slate)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'var(--slate)', fontSize: 11 }} />
              <Bar dataKey="novos" name="Novos documentos" fill="#22C55E" radius={[3,3,0,0]} />
              <Bar dataKey="atualizados" name="Atualizados" fill="#3B82F6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Issues by category */}
        <Card className="p-5">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--white)' }}>
            Issues por Categoria – Lições Aprendidas
          </div>
          {issuesByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs" style={{ color: 'var(--slate)' }}>
              Nenhuma issue registrada
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={issuesByCategory} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--slate)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--slate)', fontSize: 10 }} axisLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Issues" radius={[0,3,3,0]}>
                  {issuesByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent Drawings */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
            Últimos documentos enviados
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
          {recentDrawings.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs" style={{ color: 'var(--slate)' }}>
              Nenhum documento enviado ainda
            </div>
          ) : recentDrawings.map(d => (
            <div key={d.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
              <div
                className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: 'var(--surface-mid)',
                  color: 'var(--slate)',
                  border: '1px solid var(--surface-border)',
                  minWidth: 36,
                  textAlign: 'center',
                }}
              >
                {d.disciplineCode}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono font-medium truncate" style={{ color: 'var(--white)' }}>
                  {d.code}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--slate)' }}>
                  {d.phase === 'executivo' ? 'Projeto executivo' : d.phase} · {d.designerName}
                </div>
              </div>
              <div className="text-xs flex-shrink-0" style={{ color: 'var(--slate)' }}>
                {new Date(d.sentAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  d.status === 'liberado_para_obra' || d.status === 'aprovado'
                    ? 'text-green-400 bg-green-400/10'
                    : d.status === 'em_analise'
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : d.status === 'rejeitado'
                    ? 'text-red-400 bg-red-400/10'
                    : 'text-gray-400 bg-gray-400/10'
                }`}>
                  {d.status === 'liberado_para_obra' ? 'Lib. Obra'
                    : d.status === 'aprovado' ? 'Aprovado'
                    : d.status === 'em_analise' ? 'Em análise'
                    : d.status === 'rejeitado' ? 'Rejeitado'
                    : d.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
