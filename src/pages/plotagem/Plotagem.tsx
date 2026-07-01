import { useState } from 'react'
import {
  Printer, QrCode, Plus, CheckCircle, AlertTriangle,
  XCircle, Clock, Search
} from 'lucide-react'
import { Card, PageHeader, Button, DataSourceBadge, QrScanner } from '../../components/ui'
import { usePlotOrders } from '../../hooks/usePlotOrders'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import type { PlotOrder } from '../../types'

function StatusIcon({ status }: { status: PlotOrder['status'] }) {
  if (status === 'entregue')   return <CheckCircle size={14} color="#22C55E" />
  if (status === 'obsoleto')   return <XCircle size={14} color="#EF4444" />
  if (status === 'impresso')   return <Printer size={14} color="#3B82F6" />
  return <Clock size={14} color="#EAB308" />
}

function PlotRow({ order }: { order: PlotOrder }) {
  return (
    <tr className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--surface-border)' }}>
      <td className="px-4 py-3">
        <div className="text-xs font-mono font-semibold" style={{ color: 'var(--white)' }}>
          {order.drawingCode}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
          {order.drawingRevision} · {order.format} · {order.copies} cópia{order.copies > 1 ? 's' : ''}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <StatusIcon status={order.status} />
          <span
            className="text-xs font-semibold capitalize"
            style={{
              color: order.status === 'entregue' ? '#22C55E'
                : order.status === 'obsoleto' ? '#EF4444'
                : order.status === 'impresso' ? '#3B82F6'
                : '#EAB308'
            }}
          >
            {order.status}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className="text-xs px-2 py-0.5 rounded font-semibold inline-block"
          style={{
            background: order.isCurrentVersion ? '#22C55E22' : '#EF444422',
            color: order.isCurrentVersion ? '#22C55E' : '#EF4444',
          }}
        >
          {order.isCurrentVersion ? '✓ Atual' : '⚠ Obsoleto'}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs" style={{ color: 'var(--white)' }}>{order.requestedBy}</div>
        {order.deliveredTo && (
          <div className="text-xs" style={{ color: 'var(--slate)' }}>→ {order.deliveredTo}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs" style={{ color: 'var(--slate)' }}>
          {order.location || '—'}
        </div>
      </td>
      <td className="px-4 py-3">
        {order.printedAt && (
          <div className="text-xs" style={{ color: 'var(--slate)' }}>
            {new Date(order.printedAt).toLocaleDateString('pt-BR')}
          </div>
        )}
      </td>
    </tr>
  )
}


// New plot order form
function NewPlotForm({ onClose }: { onClose: () => void }) {
  const [drawingCode, setDrawingCode] = useState('')
  const [deliveredTo, setDeliveredTo] = useState('')
  const [location, setLocation] = useState('')
  const [copies, setCopies] = useState(1)
  const [format, setFormat] = useState('A1')

  return (
    <Card className="p-5 space-y-3" style={{ border: '1px solid rgba(34,197,94,0.3)' }}>
      <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--white)' }}>
        <Plus size={16} style={{ color: '#22C55E' }} />
        Nova Solicitação de Plotagem
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--slate)' }}>Prancha (código ou scan QR)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="043-EP-ARQ-P03-PLA-002-R05"
              value={drawingCode}
              onChange={e => setDrawingCode(e.target.value)}
              className="flex-1 text-sm rounded-lg px-3 py-2 outline-none font-mono"
              style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
            />
            <Button variant="ghost" size="sm">
              <QrCode size={14} />
            </Button>
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--slate)' }}>Cópias</label>
          <input
            type="number"
            min={1}
            max={20}
            value={copies}
            onChange={e => setCopies(Number(e.target.value))}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--slate)' }}>Formato</label>
          <select
            value={format}
            onChange={e => setFormat(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            {['A0','A1','A2','A3','A4'].map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--slate)' }}>Entregar para</label>
          <input
            type="text"
            placeholder="Ex: Mestre Paulo - Estrutura"
            value={deliveredTo}
            onChange={e => setDeliveredTo(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--slate)' }}>Local em obra</label>
          <input
            type="text"
            placeholder="Ex: Canteiro - 3° Pavimento"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm">Solicitar Plotagem</Button>
      </div>
    </Card>
  )
}

export default function Plotagem() {
  const { currentProject, currentUser } = useApp()
  const projectId = currentProject.id
  const { plotOrders, usingMockData, createPlotOrder } = usePlotOrders(projectId)
  const { drawings } = useDrawings(projectId)

  const [showScanner, setShowScanner] = useState(false)
  const [showNewPlot, setShowNewPlot] = useState(false)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [filter, setFilter] = useState<'todos' | 'obsoleto' | 'entregue' | 'solicitado'>('todos')
  const [search, setSearch] = useState('')

  function handleScanResult(code: string) {
    setScannedCode(code)
    setShowScanner(false)
    // pre-fill search so user sees the scanned drawing
    setSearch(code.split('-R')[0] || code)
  }

  // Look up drawing data for scanned code
  const scannedDrawing = scannedCode
    ? drawings.find(d => d.code === scannedCode || d.code.startsWith(scannedCode.split('-R')[0]))
    : null
  const scannedIsCurrentVersion = scannedDrawing?.code === scannedCode

  const filtered = plotOrders.filter(o => {
    if (filter !== 'todos' && o.status !== filter) return false
    if (search && !o.drawingCode.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: plotOrders.reduce((s, o) => s + o.copies, 0),
    obsoleto: plotOrders.filter(o => !o.isCurrentVersion).length,
    pendente: plotOrders.filter(o => o.status === 'solicitado' || o.status === 'impresso').length,
    entregue: plotOrders.filter(o => o.status === 'entregue').length,
  }

  return (
    <div className="space-y-5">
      <DataSourceBadge usingMockData={usingMockData} />
      <PageHeader
        title="Plotagem"
        subtitle="Controle de impressão e distribuição em obra"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setShowScanner(!showScanner); setShowNewPlot(false) }}>
              <QrCode size={14} /> Scanner QR
            </Button>
            <Button size="sm" onClick={() => { setShowNewPlot(!showNewPlot); setShowScanner(false) }}>
              <Plus size={14} /> Nova Plotagem
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total de Impressos', value: stats.total, color: 'var(--white)', icon: <Printer size={16}/> },
          { label: 'Impressos em Campo',  value: stats.entregue, color: '#22C55E', icon: <CheckCircle size={16}/> },
          { label: 'Impressos Obsoletos', value: stats.obsoleto, color: '#EF4444', icon: <AlertTriangle size={16}/> },
          { label: 'Recebimentos Pend.',  value: stats.pendente, color: '#EAB308', icon: <Clock size={16}/> },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}22`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: s.color }}>
                {s.value.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs" style={{ color: 'var(--slate)' }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Panels */}
      {showScanner && (
        <QrScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Scan result card */}
      {scannedCode && !showScanner && (
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={{
            background: scannedIsCurrentVersion ? '#22C55E11' : '#EF444411',
            border: `1px solid ${scannedIsCurrentVersion ? '#22C55E33' : '#EF444433'}`,
          }}
        >
          {scannedIsCurrentVersion
            ? <CheckCircle size={20} color="#22C55E" />
            : <XCircle size={20} color="#EF4444" />}
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: scannedIsCurrentVersion ? '#22C55E' : '#EF4444' }}>
              {scannedIsCurrentVersion ? '✓ Versão atual' : '⚠ Versão desatualizada'}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--slate)' }}>
              {scannedCode}
              {!scannedIsCurrentVersion && scannedDrawing && ` · Atual: ${scannedDrawing.code}`}
            </div>
          </div>
          <button className="text-xs" style={{ color: 'var(--slate)' }} onClick={() => setScannedCode(null)}>✕</button>
        </div>
      )}

      {showNewPlot && <NewPlotForm onClose={() => setShowNewPlot(false)} />}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate)' }} />
          <input
            type="text"
            placeholder="Buscar por código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm rounded-lg outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
          {[
            { v: 'todos', l: 'Todos' },
            { v: 'solicitado', l: 'Solicitado' },
            { v: 'entregue', l: 'Entregue' },
            { v: 'obsoleto', l: 'Obsoleto' },
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v as any)}
              className="px-3 py-1.5 text-sm transition-colors"
              style={{
                background: filter === f.v ? 'var(--navy-mid)' : 'var(--surface-card)',
                color: filter === f.v ? 'var(--white)' : 'var(--slate)',
              }}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                {['Prancha / Revisão','Status','Versão','Solicitante / Destino','Local em Obra','Data'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => <PlotRow key={o.id} order={o} />)}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm" style={{ color: 'var(--slate)' }}>
                    Nenhuma ordem de plotagem encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
