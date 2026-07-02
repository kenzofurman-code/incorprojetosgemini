import { useState } from 'react'
import { Box, MessageSquare, Download, ExternalLink } from 'lucide-react'
import IFCViewer from '../../components/bim/IFCViewer'
import { Card, PageHeader } from '../../components/ui'
import type { IFCIssue } from '../../components/bim/IFCViewer'

const CATEGORY_LABELS: Record<string, string> = {
  conflito_projeto:  'Conflito de Projeto',
  incompletude:      'Incompletude',
  erro_cota:         'Erro de Cota',
  falta_detalhe:     'Falta de Detalhe',
  nomenclatura:      'Nomenclatura',
  compatibilizacao:  'Compatibilização',
  outro:             'Outro',
}

const CATEGORY_COLORS: Record<string, string> = {
  conflito_projeto:  '#EF4444',
  incompletude:      '#F97316',
  erro_cota:         '#EAB308',
  falta_detalhe:     '#3B82F6',
  nomenclatura:      '#8B5CF6',
  compatibilizacao:  '#06B6D4',
  outro:             '#6B7280',
}

export default function BIMPage() {
  const [issues, setIssues] = useState<IFCIssue[]>([])

  function handleIssueCreated(issue: IFCIssue) {
    setIssues(prev => [issue, ...prev])
    // TODO: persist to Supabase issues table (same pattern as useDrawings hook)
    console.log('[BIMPage] Nova issue BIM criada:', issue)
  }

  function downloadScreenshot(issue: IFCIssue, index: number) {
    const a = document.createElement('a')
    a.href = issue.screenshotDataUrl
    a.download = `bim-issue-${index + 1}-${issue.title.slice(0, 30).replace(/\s+/g, '-')}.png`
    a.click()
  }

  return (
    <div className="space-y-5 h-full flex flex-col">
      <PageHeader
        title="Visualizador BIM"
        subtitle="Modelos IFC · Anotações e issues integradas ao IncorProjetos"
      />

      {/* Viewer — takes up most of the screen */}
      <IFCViewer
        onIssueCreated={handleIssueCreated}
        className="flex-1"
        style={{ minHeight: 520 }}
      />

      {/* Issues list below viewer */}
      {issues.length > 0 && (
        <Card className="overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--white)' }}>
              <MessageSquare size={16} style={{ color: 'var(--orange)' }} />
              {issues.length} issue{issues.length > 1 ? 's' : ''} BIM criada{issues.length > 1 ? 's' : ''}
            </div>
            <span className="text-xs" style={{ color: 'var(--slate)' }}>
              Clique na thumbnail para baixar o viewpoint
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
            {issues.map((issue, i) => {
              const color = CATEGORY_COLORS[issue.category] || '#6B7280'
              return (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-white/5 transition-colors">
                  {/* Thumbnail */}
                  <button
                    onClick={() => downloadScreenshot(issue, i)}
                    className="flex-shrink-0 relative group"
                    title="Baixar screenshot do viewpoint"
                  >
                    <img
                      src={issue.screenshotDataUrl}
                      alt={`Issue ${i + 1}`}
                      className="w-20 h-16 object-cover rounded-lg"
                      style={{ border: `2px solid ${color}55` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <Download size={16} color="white" />
                    </div>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
                        {issue.title}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ color, background: `${color}22` }}
                        >
                          {CATEGORY_LABELS[issue.category]}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{
                            color: issue.priority === 'alta' ? '#EF4444'
                              : issue.priority === 'media' ? '#EAB308' : '#22C55E',
                            background: issue.priority === 'alta' ? '#EF444422'
                              : issue.priority === 'media' ? '#EAB30822' : '#22C55E22',
                          }}
                        >
                          {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                        </span>
                      </div>
                    </div>
                    {issue.description && (
                      <div className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
                        {issue.description}
                      </div>
                    )}
                    <div className="text-xs mt-1.5" style={{ color: 'var(--slate)' }}>
                      {new Date(issue.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
