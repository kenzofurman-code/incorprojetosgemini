import { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, QrCode, Layers } from 'lucide-react'
import { Card, PageHeader, Button, DataSourceBadge, QrScanner } from '../../components/ui'
import { DISCIPLINE_MAP } from '../../data/mockData'
import { useDrawings } from '../../hooks/useDrawings'
import { usePlotOrders } from '../../hooks/usePlotOrders'
import { useApp } from '../../context/AppContext'

export default function Versoes() {
  const { currentProject } = useApp()
  const projectId = currentProject.id
  const { drawings, usingMockData } = useDrawings(projectId)
  const { plotOrders } = usePlotOrders(projectId)

  const [scanResult, setScanResult] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  function handleScanResult(code: string) {
    setScanResult(code)
    setShowScanner(false)
  }

  const fieldDrawings = drawings.filter(d =>
    d.status === 'liberado_para_obra' || d.status === 'aprovado'
  )

  // Check if scanned drawing is current
  const scannedDrawing = scanResult
    ? drawings.find(d => d.code === scanResult || d.code.includes(scanResult.split('-R')[0]))
    : null
  const isCurrentVersion = scannedDrawing?.code === scanResult

  return (
    <div className="space-y-5">
      <DataSourceBadge usingMockData={usingMockData} />
      <PageHeader
        title="Controle de Versões em Campo"
        subtitle="Verifique se a prancha impressa é a versão atual"
        actions={
          <Button size="sm" onClick={() => setShowScanner(true)}>
            <QrCode size={14} />
            Verificar Prancha
          </Button>
        }
      />

      {showScanner && (
        <QrScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* QR scan result */}
      {scanResult && (
        <Card className="p-4" style={{
          border: `1px solid ${isCurrentVersion ? '#22C55E' : '#EF4444'}33`,
          background: `${isCurrentVersion ? '#22C55E' : '#EF4444'}11`,
        }}>
          <div className="flex items-center gap-3">
            {isCurrentVersion
              ? <CheckCircle size={24} color="#22C55E" />
              : <XCircle size={24} color="#EF4444" />
            }
            <div>
              <div className="text-sm font-semibold" style={{ color: isCurrentVersion ? '#22C55E' : '#EF4444' }}>
                {isCurrentVersion ? '✓ Versão atual — pode usar!' : '⚠ VERSÃO DESATUALIZADA — NÃO USE!'}
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>
                Lido: {scanResult}
                {!isCurrentVersion && scannedDrawing && ` · Versão atual: ${scannedDrawing.revision}`}
              </div>
            </div>
            <button
              className="ml-auto text-xs"
              style={{ color: 'var(--slate)' }}
              onClick={() => setScanResult(null)}
            >
              Fechar
            </button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pranchas em Campo', value: plotOrders.filter(o => o.status === 'entregue').length, color: '#22C55E', icon: <CheckCircle size={16}/> },
          { label: 'Versões Obsoletas',  value: plotOrders.filter(o => !o.isCurrentVersion).length, color: '#EF4444', icon: <AlertTriangle size={16}/> },
          { label: 'Aprovadas Recentes', value: fieldDrawings.length, color: '#3B82F6', icon: <Layers size={16}/> },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}22`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--slate)' }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Field drawings table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--surface-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
            Pranchas com versão aprovada
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                {['Código','Disciplina','Pavimento','Revisão Atual','Aprovado em','Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fieldDrawings.map(d => {
                const disc = DISCIPLINE_MAP[d.disciplineCode]
                return (
                  <tr key={d.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--surface-border)' }}>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-mono font-semibold" style={{ color: 'var(--white)' }}>{d.code}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: disc?.color || '#6B7280' }} />
                        <span className="text-xs" style={{ color: 'var(--slate)' }}>{d.discipline}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono" style={{ color: 'var(--slate)' }}>{d.floor}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'var(--surface-mid)', color: 'var(--orange)' }}>
                        {d.revision}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs" style={{ color: 'var(--slate)' }}>
                        {d.approvedAt ? new Date(d.approvedAt).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold ${d.status === 'liberado_para_obra' ? 'text-green-400' : 'text-blue-400'}`}>
                        {d.status === 'liberado_para_obra' ? 'Lib. Obra' : 'Aprovado'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Obsolete plots warning */}
      {plotOrders.filter(o => !o.isCurrentVersion).length > 0 && (
        <Card className="p-4" style={{ border: '1px solid #EF444433', background: '#EF444411' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} color="#EF4444" className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                Impressos desatualizados em campo
              </div>
              <div className="space-y-1 mt-2">
                {plotOrders.filter(o => !o.isCurrentVersion).map(o => (
                  <div key={o.id} className="text-xs flex items-center gap-2" style={{ color: 'var(--slate)' }}>
                    <span className="font-mono" style={{ color: '#EF4444' }}>{o.drawingCode}</span>
                    <span>·</span>
                    <span>Portador: {o.deliveredTo || '—'}</span>
                    <span>·</span>
                    <span>{o.location || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
