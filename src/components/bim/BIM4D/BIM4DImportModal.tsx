import { useState, useRef } from 'react'
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Table,
} from 'lucide-react'
import type { AtividadeObra4D } from '../../../types/bim4d'

export interface BIM4DImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (atividades: AtividadeObra4D[]) => void
}

export default function BIM4DImportModal({
  isOpen,
  onClose,
  onImport,
}: BIM4DImportModalProps) {
  const [parsedRows, setParsedRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [nameCol, setNameCol] = useState<number>(1)
  const [startCol, setStartCol] = useState<number>(2)
  const [endCol, setEndCol] = useState<number>(3)
  const [eapCol, setEapCol] = useState<number>(0)
  const [storeyCol, setStoreyCol] = useState<number>(4)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  // ─── 1. Download de Planilha Modelo (.CSV) ────────────────────────────────
  function handleDownloadTemplate() {
    const csvContent = [
      'EAP;Nome da Atividade;Data Inicio;Data Fim;Pavimento;Categoria IFC',
      '1.1;Serviços Preliminares e Canteiro;2026-06-01;2026-06-20;Térreo;-',
      '1.2;Fundações e Blocos de Coroamento;2026-06-21;2026-07-20;Fundação;IfcFooting',
      '2.1;Estrutura - Pilares e Muros Subsolo;2026-07-21;2026-08-15;Subsolo;IfcColumn',
      '2.2;Estrutura - Lajes e Vigas Térreo;2026-08-16;2026-09-05;Térreo;IfcBeam, IfcSlab',
      '2.3;Estrutura - Pilares 1º Pavimento;2026-09-06;2026-09-30;1º Pavimento;IfcColumn',
      '2.4;Estrutura - Lajes e Vigas 1º Pav;2026-10-01;2026-10-20;1º Pavimento;IfcBeam, IfcSlab',
      '3.1;Alvenaria de Vedação 1º Pavimento;2026-10-21;2026-11-20;1º Pavimento;IfcWall',
      '4.1;Instalações Hidrossanitárias e Elétricas;2026-11-21;2026-12-30;1º Pavimento;-',
      '5.1;Esquadrias e Fachada;2027-01-01;2027-02-15;Fachada;IfcWindow, IfcDoor',
      '6.1;Acabamentos, Pisos e Pintura;2027-02-16;2027-04-10;Todos;-',
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_cronograma_obra_4d.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── 2. Leitura e Parse de Arquivo CSV ────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string
        if (!text) throw new Error('Arquivo vazio')

        // Normalizar quebras de linha
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length < 2) throw new Error('O arquivo precisa de pelo menos um cabeçalho e 1 linha de dados.')

        // Detectar separador (; ou , ou tab)
        const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ','

        const parsed = lines.map(line =>
          line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
        )

        setHeaders(parsed[0])
        setParsedRows(parsed.slice(1))

        // Auto-identificar colunas pelo nome do cabeçalho
        parsed[0].forEach((h, idx) => {
          const lower = h.toLowerCase()
          if (lower.includes('nome') || lower.includes('atividade') || lower.includes('tarefa') || lower.includes('descri')) {
            setNameCol(idx)
          } else if (lower.includes('inicio') || lower.includes('start') || lower.includes('data in')) {
            setStartCol(idx)
          } else if (lower.includes('fim') || lower.includes('term') || lower.includes('end') || lower.includes('data f')) {
            setEndCol(idx)
          } else if (lower.includes('eap') || lower.includes('wbs') || lower.includes('cod') || lower.includes('item')) {
            setEapCol(idx)
          } else if (lower.includes('pav') || lower.includes('storey') || lower.includes('nivel') || lower.includes('andar')) {
            setStoreyCol(idx)
          }
        })
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar o arquivo CSV.')
      }
    }

    reader.readAsText(file, 'UTF-8')
  }

  // ─── 3. Confirmação e Conversão das Atividades ───────────────────────────
  function handleConfirmImport() {
    if (parsedRows.length === 0) return

    const atividades: AtividadeObra4D[] = []

    parsedRows.forEach((row, i) => {
      const nome = row[nameCol]
      let start = row[startCol] || '2026-06-01'
      let end = row[endCol] || '2026-06-30'

      if (!nome) return

      // Tratar formato brasileiro DD/MM/YYYY para YYYY-MM-DD
      if (start.includes('/')) {
        const parts = start.split('/')
        if (parts.length === 3) start = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }
      if (end.includes('/')) {
        const parts = end.split('/')
        if (parts.length === 3) end = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }

      atividades.push({
        id: `act-imp-${Date.now()}-${i + 1}`,
        eap: eapCol >= 0 ? row[eapCol] : undefined,
        nome,
        dataInicio: start,
        dataFim: end,
        pavimentoAlvo: storeyCol >= 0 ? row[storeyCol] : undefined,
        bimGuids: [],
        bimExpressIds: [],
      })
    })

    if (atividades.length === 0) {
      setErrorMsg('Nenhuma atividade válida foi encontrada nas colunas selecionadas.')
      return
    }

    onImport(atividades)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-2xl w-full shadow-2xl flex flex-col gap-4 text-slate-200 select-none max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Importar Cronograma de Obra (4D)</h3>
              <p className="text-[11px] text-slate-400">
                Carregue planilhas do Excel, MS Project ou utilize o nosso modelo padrão
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {/* Card de Download de Modelo */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Table size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Planilha Modelo Pré-Formatada</h4>
                <p className="text-[11px] text-slate-400">
                  Baixe o modelo com colunas prontas para preencher datas e pavimentos
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex-shrink-0 cursor-pointer"
            >
              <Download size={14} />
              <span>Baixar (.CSV)</span>
            </button>
          </div>

          {/* Área de Upload de Arquivo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-950/70 group"
          >
            <Upload size={32} className="text-slate-500 group-hover:text-blue-400 transition-colors mb-2" />
            <span className="text-xs font-bold text-slate-200">
              Clique para selecionar o arquivo de cronograma
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Formatos aceitos: .CSV, .TXT (separados por vírgula, ponto e vírgula ou tab)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mapeador de Colunas (se o arquivo foi lido) */}
          {headers.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-blue-400" />
                  <span>Confirme o mapeamento das colunas ({parsedRows.length} linhas lidas):</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Nome da Atividade *
                  </label>
                  <select
                    value={nameCol}
                    onChange={e => setNameCol(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Coluna {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Data de Início *
                  </label>
                  <select
                    value={startCol}
                    onChange={e => setStartCol(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Coluna {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Data de Término *
                  </label>
                  <select
                    value={endCol}
                    onChange={e => setEndCol(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Coluna {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Código EAP (Opcional)
                  </label>
                  <select
                    value={eapCol}
                    onChange={e => setEapCol(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={-1}>Nenhuma</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Coluna {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Pavimento (Opcional)
                  </label>
                  <select
                    value={storeyCol}
                    onChange={e => setStoreyCol(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={-1}>Nenhuma</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Coluna {i + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview das primeiras 3 linhas */}
              <div className="mt-2 rounded-xl bg-slate-950 border border-slate-800 p-2 overflow-x-auto">
                <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                  Pré-visualização dos dados:
                </div>
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="p-1">EAP</th>
                      <th className="p-1">Atividade</th>
                      <th className="p-1">Início</th>
                      <th className="p-1">Fim</th>
                      <th className="p-1">Pavimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 3).map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-900">
                        <td className="p-1 text-slate-500">{eapCol >= 0 ? r[eapCol] : '-'}</td>
                        <td className="p-1 font-bold text-white">{r[nameCol] || '-'}</td>
                        <td className="p-1 text-blue-400">{r[startCol] || '-'}</td>
                        <td className="p-1 text-emerald-400">{r[endCol] || '-'}</td>
                        <td className="p-1 text-slate-400">{storeyCol >= 0 ? r[storeyCol] : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            Importar {parsedRows.length > 0 ? `${parsedRows.length} Atividades` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
