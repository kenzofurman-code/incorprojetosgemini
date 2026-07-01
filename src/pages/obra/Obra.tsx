import { useState } from 'react'
import { Building2, Grid3X3, ExternalLink, CheckCircle } from 'lucide-react'
import { Card, PageHeader, Button, DataSourceBadge } from '../../components/ui'
import { DISCIPLINES, FLOORS } from '../../data/mockData'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import type { Drawing } from '../../types'

// Get latest approved drawing for a floor+discipline combination
function getDrawingForCell(drawings: Drawing[], floor: string, discCode: string): Drawing | undefined {
  return drawings.find(
    d => d.floor === floor && d.disciplineCode === discCode &&
    (d.status === 'liberado_para_obra' || d.status === 'aprovado')
  )
}

// ─── Isometric Cabinet Cell ───────────────────────────────────────────────────
function CabinetCell({
  floor,
  discipline,
  drawing,
  onClick,
}: {
  floor: string
  discipline: typeof DISCIPLINES[0]
  drawing?: Drawing
  onClick: () => void
}) {
  const hasDrawing = !!drawing
  const isLiberated = drawing?.status === 'liberado_para_obra'

  return (
    <div
      onClick={hasDrawing ? onClick : undefined}
      className="iso-cell rounded border flex flex-col items-center justify-center p-1.5 text-center"
      style={{
        background: hasDrawing
          ? isLiberated
            ? `${discipline.color}30`
            : `${discipline.color}18`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hasDrawing ? discipline.color + '55' : 'rgba(255,255,255,0.07)'}`,
        cursor: hasDrawing ? 'pointer' : 'default',
        minHeight: 56,
        minWidth: 64,
      }}
    >
      {hasDrawing ? (
        <>
          <div
            className="text-xs font-bold font-mono"
            style={{ color: discipline.color }}
          >
            {drawing!.revision}
          </div>
          <div className="mt-0.5">
            {isLiberated
              ? <CheckCircle size={10} style={{ color: '#22C55E' }} />
              : <div className="w-2 h-2 rounded-full" style={{ background: discipline.color }} />
            }
          </div>
        </>
      ) : (
        <div className="w-4 h-4 border border-dashed rounded opacity-20" style={{ borderColor: 'var(--slate)' }} />
      )}
    </div>
  )
}

// ─── Building Section View ────────────────────────────────────────────────────
function BuildingSection({ drawings, onCellClick }: { drawings: Drawing[]; onCellClick: (floor: string, disc: string) => void }) {
  const floorsReversed = [...FLOORS].reverse()
  const activeDisciplines = DISCIPLINES.slice(0, 8) // Show first 8

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Discipline header */}
        <div className="flex gap-1 mb-2 pl-20">
          {activeDisciplines.map(d => (
            <div
              key={d.code}
              className="text-xs font-bold font-mono text-center flex-shrink-0"
              style={{ width: 64, color: d.color }}
            >
              {d.code}
            </div>
          ))}
        </div>

        {/* Floors */}
        <div className="space-y-1">
          {floorsReversed.map(floor => {
            const isSpecial = floor.code === 'TER' || floor.code === 'COB'
            return (
              <div key={floor.id} className="flex items-center gap-1">
                {/* Floor label */}
                <div
                  className="w-20 flex-shrink-0 text-xs font-mono font-semibold px-2 py-1 rounded text-right"
                  style={{
                    color: isSpecial ? 'var(--orange)' : 'var(--slate)',
                    background: isSpecial ? 'rgba(249,115,22,0.1)' : 'transparent',
                  }}
                >
                  {floor.code}
                </div>

                {/* Cells */}
                <div className="flex gap-1">
                  {activeDisciplines.map(disc => {
                    const drawing = getDrawingForCell(drawings, floor.code, disc.code)
                    return (
                      <CabinetCell
                        key={disc.code}
                        floor={floor.code}
                        discipline={disc}
                        drawing={drawing}
                        onClick={() => onCellClick(floor.code, disc.code)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Cabinet View ─────────────────────────────────────────────────────────────
function CabinetView({ drawings, onCellClick }: { drawings: Drawing[]; onCellClick: (floor: string, disc: string) => void }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {DISCIPLINES.slice(0, 8).map(disc => {
        const disciplineDrawings = drawings.filter(d =>
          d.disciplineCode === disc.code &&
          (d.status === 'liberado_para_obra' || d.status === 'aprovado')
        )

        return (
          <Card
            key={disc.code}
            className="overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ border: `1px solid ${disc.color}33` }}
          >
            {/* Cabinet shelf header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: `${disc.color}22`, borderBottom: `2px solid ${disc.color}66` }}
            >
              <div>
                <div className="text-sm font-bold font-mono" style={{ color: disc.color }}>{disc.code}</div>
                <div className="text-xs" style={{ color: 'var(--slate)' }}>{disc.name}</div>
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: disc.color }}
              >
                {disciplineDrawings.length}
              </div>
            </div>

            {/* Shelf items */}
            <div className="p-3 space-y-1.5">
              {disciplineDrawings.length === 0 ? (
                <div className="text-xs text-center py-3" style={{ color: 'var(--slate)' }}>
                  Sem pranchas liberadas
                </div>
              ) : (
                disciplineDrawings.slice(0, 4).map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors"
                    onClick={() => onCellClick(d.floor, d.disciplineCode)}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${disc.color}22`, color: disc.color }}
                    >
                      {d.floor.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate" style={{ color: 'var(--white)' }}>
                        {d.code}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {d.status === 'liberado_para_obra'
                        ? <CheckCircle size={12} color="#22C55E" />
                        : <div className="w-2 h-2 rounded-full" style={{ background: disc.color }} />
                      }
                    </div>
                  </div>
                ))
              )}
              {disciplineDrawings.length > 4 && (
                <div className="text-xs text-center pt-1" style={{ color: 'var(--slate)' }}>
                  +{disciplineDrawings.length - 4} pranchas
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default function Obra() {
  const { currentProject } = useApp()
  const projectId = currentProject.id
  const { drawings, usingMockData } = useDrawings(projectId)

  const approvedDrawings = drawings.filter(d =>
    d.status === 'liberado_para_obra' || d.status === 'aprovado'
  )

  const [viewMode, setViewMode] = useState<'building' | 'cabinet'>('building')
  const [selected, setSelected] = useState<{ floor: string; disc: string } | null>(null)

  function handleCellClick(floor: string, disc: string) {
    setSelected({ floor, disc })
  }

  const selectedDrawing = selected
    ? approvedDrawings.find(d => d.floor === selected.floor && d.disciplineCode === selected.disc)
    : null

  return (
    <div className="space-y-5">
      <DataSourceBadge usingMockData={usingMockData} />
      <PageHeader
        title="Armário de Projetos"
        subtitle="Última versão aprovada por pavimento e especialidade"
        actions={
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
            {[
              { v: 'building', icon: <Building2 size={14}/>, label: 'Corte' },
              { v: 'cabinet',  icon: <Grid3X3 size={14}/>,   label: 'Armário' },
            ].map(m => (
              <button
                key={m.v}
                onClick={() => setViewMode(m.v as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
                style={{
                  background: viewMode === m.v ? 'var(--navy-mid)' : 'var(--surface-card)',
                  color: viewMode === m.v ? 'var(--white)' : 'var(--slate)',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span style={{ color: 'var(--slate)' }}>Legenda:</span>
        <span className="flex items-center gap-1.5">
          <CheckCircle size={12} color="#22C55E" />
          <span style={{ color: '#22C55E' }}>Liberado para Obra</span>
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} />
          <span style={{ color: 'var(--slate)' }}>Aprovado</span>
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 border border-dashed rounded" style={{ borderColor: 'var(--slate)', opacity: 0.4 }} />
          <span style={{ color: 'var(--slate)' }}>Sem prancha</span>
        </span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <Card className="p-5 overflow-x-auto">
            {viewMode === 'building'
              ? <BuildingSection drawings={approvedDrawings} onCellClick={handleCellClick} />
              : <CabinetView drawings={approvedDrawings} onCellClick={handleCellClick} />
            }
          </Card>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-64 flex-shrink-0">
            <Card className="p-4 space-y-3" style={{ position: 'sticky', top: 0 }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--orange)' }}>
                {selected.floor} · {selected.disc}
              </div>
              {selectedDrawing ? (
                <>
                  <div>
                    <div className="text-xs font-mono font-semibold" style={{ color: 'var(--white)' }}>
                      {selectedDrawing.code}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
                      {selectedDrawing.title}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--slate)' }}>
                    <div className="flex justify-between">
                      <span>Revisão</span>
                      <span className="font-mono font-bold" style={{ color: 'var(--white)' }}>{selectedDrawing.revision}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span style={{ color: selectedDrawing.status === 'liberado_para_obra' ? '#22C55E' : '#3B82F6' }}>
                        {selectedDrawing.status === 'liberado_para_obra' ? 'Lib. Obra' : 'Aprovado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projetista</span>
                      <span style={{ color: 'var(--white)' }}>{selectedDrawing.designerName.split(' ')[0]}</span>
                    </div>
                    {selectedDrawing.approvedAt && (
                      <div className="flex justify-between">
                        <span>Aprovado em</span>
                        <span style={{ color: 'var(--white)' }}>
                          {new Date(selectedDrawing.approvedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="w-full justify-center">
                    <ExternalLink size={12} /> Abrir PDF
                  </Button>
                </>
              ) : (
                <div className="text-xs text-center py-4" style={{ color: 'var(--slate)' }}>
                  Nenhuma prancha aprovada para este pavimento + disciplina.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
