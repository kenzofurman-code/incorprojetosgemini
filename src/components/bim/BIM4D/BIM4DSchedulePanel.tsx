import { useState } from 'react'
import {
  Calendar,
  Settings,
  Download,
  Upload,
  Plus,
  Unlink,
  Sparkles,
  ChevronRight,
  Clock,
  Trash2,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import type { AtividadeObra4D, CronogramaObra4D } from '../../../types/bim4d'

export interface BIM4DSchedulePanelProps {
  cronograma: CronogramaObra4D
  selectedActivityId: string | null
  onSelectActivity: (id: string) => void
  onDesvincularAtividade: (id: string) => void
  onOpenImportModal: () => void
  onDownloadTemplate: () => void
  onAutoVincular: () => void
  onAddManualActivity: (act: Omit<AtividadeObra4D, 'id' | 'bimGuids' | 'bimExpressIds'>) => void
}

export default function BIM4DSchedulePanel({
  cronograma,
  selectedActivityId,
  onSelectActivity,
  onDesvincularAtividade,
  onOpenImportModal,
  onDownloadTemplate,
  onAutoVincular,
  onAddManualActivity,
}: BIM4DSchedulePanelProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form de nova atividade manual
  const [newEap, setNewEap] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newDataInicio, setNewDataInicio] = useState('2026-09-01')
  const [newDataFim, setNewDataFim] = useState('2026-09-20')
  const [newPavimento, setNewPavimento] = useState('')

  function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!newNome.trim() || !newDataInicio || !newDataFim) return

    onAddManualActivity({
      eap: newEap.trim() || undefined,
      nome: newNome.trim(),
      dataInicio: newDataInicio,
      dataFim: newDataFim,
      pavimentoAlvo: newPavimento.trim() || undefined,
    })

    setNewNome('')
    setNewEap('')
    setNewPavimento('')
    setShowAddModal(false)
  }

  // Estatísticas de vínculo
  const totalVinculados = cronograma.atividades.reduce(
    (acc, a) => acc + a.bimExpressIds.length,
    0
  )
  const atividadesComVinculo = cronograma.atividades.filter(
    a => a.bimExpressIds.length > 0
  ).length

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-l border-slate-800 w-80 flex-shrink-0 text-slate-200 select-none shadow-2xl backdrop-blur-md relative">
      {/* ── Cabeçalho do Cronograma ───────────────────────────────────────── */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Calendar size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white tracking-wide uppercase truncate">
              Cronograma de Obra
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
              {cronograma.atividades.length} atividades • {atividadesComVinculo} vinculadas
            </p>
          </div>
        </div>

        {/* Menu de Configurações ⚙️ */}
        <div className="relative">
          <button
            onClick={() => setShowSettingsMenu(prev => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Opções do Cronograma"
          >
            <Settings size={15} />
          </button>

          {showSettingsMenu && (
            <div
              className="absolute right-0 top-8 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
              onClick={() => setShowSettingsMenu(false)}
            >
              <button
                onClick={onOpenImportModal}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 text-left cursor-pointer"
              >
                <Upload size={13} className="text-blue-400" />
                <span>Importar Planilha (Excel/CSV)</span>
              </button>

              <button
                onClick={onDownloadTemplate}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 text-left cursor-pointer"
              >
                <Download size={13} className="text-emerald-400" />
                <span>Baixar Planilha Modelo (.CSV)</span>
              </button>

              <button
                onClick={onAutoVincular}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 text-left cursor-pointer"
              >
                <Sparkles size={13} className="text-purple-400" />
                <span>Auto-Vincular por Nome</span>
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 text-left cursor-pointer"
              >
                <Plus size={13} className="text-orange-400" />
                <span>Nova Atividade Manual</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-barra informativa ─────────────────────────────────────────── */}
      <div className="px-3.5 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">
          Total: <strong className="text-blue-400 font-bold">{totalVinculados}</strong> elementos 3D
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold cursor-pointer text-[10px]"
        >
          <Plus size={11} />
          <span>Adicionar</span>
        </button>
      </div>

      {/* ── Lista de Atividades do Cronograma ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {cronograma.atividades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-500">
            <FileSpreadsheet size={28} className="mb-2 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">Nenhuma atividade cadastrada</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Importe uma planilha ou adicione uma tarefa manual no menu ⚙️ acima.
            </p>
          </div>
        ) : (
          cronograma.atividades.map(act => {
            const isSelected = selectedActivityId === act.id
            const hasElements = act.bimExpressIds.length > 0

            return (
              <div
                key={act.id}
                onClick={() => onSelectActivity(act.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {act.eap && (
                        <span className="text-[9px] font-mono font-bold text-slate-500 px-1 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {act.eap}
                        </span>
                      )}
                      <div
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-blue-300' : 'text-slate-200'
                        }`}
                        title={act.nome}
                      >
                        {act.nome}
                      </div>
                    </div>

                    {/* Datas de Início e Término */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-slate-500" />
                        <span>
                          {act.dataInicio.slice(5)} a {act.dataFim.slice(5)}
                        </span>
                      </span>

                      {act.pavimentoAlvo && (
                        <span className="text-slate-500">• {act.pavimentoAlvo}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {hasElements ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        title={`${act.bimExpressIds.length} elementos 3D vinculados`}
                      >
                        {act.bimExpressIds.length} peças
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800/80 text-slate-500">
                        Vazio
                      </span>
                    )}

                    {hasElements && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onDesvincularAtividade(act.id)
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-all"
                        title="Remover vínculos desta atividade"
                      >
                        <Unlink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal Flutuante: Nova Atividade Manual ────────────────────────── */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus size={14} className="text-orange-400" />
                <span>Nova Atividade de Obra</span>
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Nome da Atividade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Concretagem Pilares 2º Pavimento"
                  value={newNome}
                  onChange={e => setNewNome(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Código EAP
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2.1"
                    value={newEap}
                    onChange={e => setNewEap(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Pavimento Alvo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2º Pavimento"
                    value={newPavimento}
                    onChange={e => setNewPavimento(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDataInicio}
                    onChange={e => setNewDataInicio(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Data Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDataFim}
                    onChange={e => setNewDataFim(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Criar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
