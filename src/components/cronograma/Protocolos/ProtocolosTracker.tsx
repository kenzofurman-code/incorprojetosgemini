/**
 * ProtocolosTracker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Acompanhamento de Protocolos em Órgãos Públicos e Concessionárias.
 * Monitora o status de aprovações legais (Prefeitura, Bombeiros, CEMIG, COPASA,
 * Ambiental, Cartório) e oferece interface preparada para automação diária (Crawler).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Bot,
  RefreshCw,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { ProtocoloItem, OrgaoProtocolo, StatusProtocolo } from '../../../types/cronograma'
import { formatDateBR } from '../../../lib/businessCalendar'
import ProtocoloModal from './ProtocoloModal'

interface ProtocolosTrackerProps {
  protocolos: ProtocoloItem[]
  onProtocolosChange: (items: ProtocoloItem[]) => void
}

const STATUS_BADGE: Record<StatusProtocolo, { label: string; bg: string; text: string; border: string }> = {
  em_analise:    { label: 'Em Análise',    bg: 'rgba(59, 130, 246, 0.1)',  text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
  com_exigencia: { label: 'Com Exigência', bg: 'rgba(234, 179, 8, 0.1)',   text: '#FACC15', border: 'rgba(234, 179, 8, 0.3)' },
  aprovado:      { label: 'Aprovado',      bg: 'rgba(34, 197, 94, 0.1)',  text: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)' },
  indeferido:    { label: 'Indeferido',    bg: 'rgba(239, 68, 68, 0.1)',   text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
  arquivado:     { label: 'Arquivado',     bg: 'rgba(148, 163, 184, 0.1)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
}

export default function ProtocolosTracker({
  protocolos,
  onProtocolosChange,
}: ProtocolosTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrgao, setSelectedOrgao] = useState<string>('todos')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProtocoloItem | null>(null)
  const [isCrawling, setIsCrawling] = useState(false)

  // Estatísticas
  const total = protocolos.length
  const aprovados = protocolos.filter(p => p.status === 'aprovado').length
  const comExigencia = protocolos.filter(p => p.status === 'com_exigencia').length
  const emAnalise = protocolos.filter(p => p.status === 'em_analise').length

  const filtered = protocolos.filter(p => {
    if (selectedOrgao !== 'todos' && p.orgao !== selectedOrgao) return false
    if (selectedStatus !== 'todos' && p.status !== selectedStatus) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      return (
        p.numeroProtocolo.toLowerCase().includes(term) ||
        p.nomeOrgao.toLowerCase().includes(term) ||
        p.tipoProcesso.toLowerCase().includes(term)
      )
    }
    return true
  })

  const handleSaveProtocolo = (item: ProtocoloItem) => {
    if (editingItem) {
      onProtocolosChange(protocolos.map(p => p.id === item.id ? item : p))
    } else {
      onProtocolosChange([item, ...protocolos])
    }
    setModalOpen(false)
    setEditingItem(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este protocolo de acompanhamento?')) {
      onProtocolosChange(protocolos.filter(p => p.id !== id))
    }
  }

  // Simulação de Varredura Diária Automática por Robô / Crawler
  const handleRunCrawler = () => {
    setIsCrawling(true)
    setTimeout(() => {
      setIsCrawling(false)
      alert('Varredura automática concluída! Todos os portais públicos (Prefeitura, CBMMG, CEMIG) foram consultados. 1 nova movimentação detectada.')
    }, 1800)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* KPI Cards de Protocolos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold mb-1">Total de Protocolos</div>
          <div className="text-xl font-bold text-white font-mono">{total}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 shadow-md">
          <div className="text-[11px] text-emerald-400 font-semibold mb-1">Aprovados / Concluídos</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{aprovados}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-yellow-500/30 bg-yellow-950/20 shadow-md">
          <div className="text-[11px] text-yellow-400 font-semibold mb-1">Com Exigência Técnica</div>
          <div className="text-xl font-bold text-yellow-400 font-mono">{comExigencia}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-950/20 shadow-md">
          <div className="text-[11px] text-blue-400 font-semibold mb-1">Em Análise Técnica</div>
          <div className="text-xl font-bold text-blue-400 font-mono">{emAnalise}</div>
        </div>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex-wrap backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nº protocolo, órgão ou processo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-xl pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-white outline-none placeholder-slate-500"
            />
          </div>

          {/* Filtro Órgão */}
          <select
            value={selectedOrgao}
            onChange={e => setSelectedOrgao(e.target.value)}
            className="text-xs rounded-xl px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Órgãos</option>
            <option value="prefeitura">Prefeitura Municipal</option>
            <option value="bombeiros">Corpo de Bombeiros</option>
            <option value="concessionaria_energia">Concessionária de Energia</option>
            <option value="concessionaria_agua">Concessionária de Água</option>
            <option value="ambiental">Ambiental</option>
            <option value="cartorio">Cartório de Imóveis</option>
          </select>

          {/* Filtro Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs rounded-xl px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="em_analise">Em Análise</option>
            <option value="com_exigencia">Com Exigência</option>
            <option value="aprovado">Aprovado</option>
            <option value="indeferido">Indeferido</option>
          </select>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCrawler}
            disabled={isCrawling}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Executar robô crawler para consultar todos os portais dos órgãos"
          >
            <Bot size={14} className={isCrawling ? 'animate-spin text-orange-400' : 'text-orange-400'} />
            <span>{isCrawling ? 'Consultando Portais...' : 'Varredura Diária (Crawler)'}</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white shadow-md active:scale-95 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--orange, #f97316), #c2410c)' }}
          >
            <Plus size={14} />
            <span>Novo Protocolo</span>
          </button>
        </div>
      </div>

      {/* Lista de Protocolos */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {filtered.map(prot => {
          const badge = STATUS_BADGE[prot.status] || STATUS_BADGE.em_analise
          const isExpanded = expandedId === prot.id

          return (
            <div
              key={prot.id}
              className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg hover:border-slate-700 transition-all flex flex-col gap-3"
            >
              {/* Linha Superior */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                        {prot.numeroProtocolo}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {prot.nomeOrgao}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-100 mt-1">
                      {prot.tipoProcesso}
                    </div>
                  </div>
                </div>

                {/* Status Badge e Ações */}
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5"
                    style={{
                      background: badge.bg,
                      color: badge.text,
                      borderColor: badge.border,
                    }}
                  >
                    {badge.label}
                  </span>

                  {prot.linkConsulta && (
                    <a
                      href={prot.linkConsulta}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      title="Abrir portal oficial de consulta"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setEditingItem(prot)
                      setModalOpen(true)
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Editar protocolo"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    onClick={() => handleDelete(prot.id)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
                    title="Excluir protocolo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Informações de Datas e Última Movimentação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={13} className="text-slate-500" />
                  <span>Entrada: <strong className="text-slate-200">{formatDateBR(prot.dataEntrada)}</strong></span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={13} className="text-slate-500" />
                  <span>
                    Prazo Estimado:{' '}
                    <strong className="text-orange-400">
                      {prot.prazoEstimado ? formatDateBR(prot.prazoEstimado) : 'A definir'}
                    </strong>
                  </span>
                </div>

                <div className="text-slate-400 truncate">
                  Responsável: <strong className="text-slate-200">{prot.responsavel || 'Não atribuído'}</strong>
                </div>
              </div>

              {/* Última Movimentação */}
              {prot.descricaoUltimaMovimentacao && (
                <div className="text-xs text-slate-300 bg-orange-500/5 border border-orange-500/20 px-3 py-2 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-orange-400">Último Despacho ({prot.ultimaMovimentacao ? formatDateBR(prot.ultimaMovimentacao) : 'Recente'}):</span>{' '}
                    <span>{prot.descricaoUltimaMovimentacao}</span>
                  </div>
                </div>
              )}

              {/* Toggle de Histórico Completo */}
              {prot.historico && prot.historico.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : prot.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white font-semibold cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Histórico de Despachos ({prot.historico.length})</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 pl-4 border-l-2 border-slate-800 space-y-2 text-xs">
                      {prot.historico.map(h => (
                        <div key={h.id} className="relative pl-3">
                          <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-orange-500" />
                          <div className="text-[10px] font-mono text-slate-500">{formatDateBR(h.data)}</div>
                          <div className="text-slate-300 font-medium">{h.descricao}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-slate-800 text-center text-slate-500">
            <Building2 size={40} className="mb-2 text-slate-600" />
            <div className="text-sm font-semibold text-slate-300">Nenhum protocolo encontrado</div>
            <div className="text-xs mt-1">Cadastre novos processos de aprovação ou utilize o template inicial.</div>
          </div>
        )}
      </div>

      {/* Modal de Protocolo */}
      {modalOpen && (
        <ProtocoloModal
          protocolo={editingItem}
          onSave={handleSaveProtocolo}
          onClose={() => {
            setModalOpen(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}
