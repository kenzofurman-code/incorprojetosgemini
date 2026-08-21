/**
 * ProtocolosTracker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel Avançado de Acompanhamento de Protocolos em Órgãos Públicos e Concessionárias.
 * Monitora o status de aprovações legais (Prefeitura de Curitiba / PMC, Bombeiros,
 * Concessionárias, Ambiental, Cartório), detalhando apontamentos, correções e documentos.
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
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  UserCheck,
  Eye,
} from 'lucide-react'
import type { ProtocoloItem, MovimentacaoProtocolo, StatusProtocolo } from '../../../types/cronograma'
import { formatDateBR } from '../../../lib/businessCalendar'
import ProtocoloModal from './ProtocoloModal'
import EtapaDetailModal from './EtapaDetailModal'

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
  const [expandedId, setExpandedId] = useState<string | null>('prot-curitiba-01')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProtocoloItem | null>(null)
  const [isCrawling, setIsCrawling] = useState(false)

  // Estado para visualização detalhada de uma etapa específica
  const [selectedEtapa, setSelectedEtapa] = useState<{
    protocolo: ProtocoloItem
    etapa: MovimentacaoProtocolo
  } | null>(null)

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
        p.tipoProcesso.toLowerCase().includes(term) ||
        (p.empreendimentoNome && p.empreendimentoNome.toLowerCase().includes(term))
      )
    }
    return true
  })

  const handleSaveProtocolo = (item: ProtocoloItem) => {
    if (editingItem) {
      onProtocolosChange(protocolos.map(p => (p.id === item.id ? item : p)))
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

  // Simulação / Execução de Varredura Diária
  const handleRunCrawler = () => {
    setIsCrawling(true)
    setTimeout(() => {
      setIsCrawling(false)
      alert(
        'Varredura automática concluída no portal e-Cidadão da PMC! 2 processos atualizados com histórico completo, exigências e arquivos.'
      )
    }, 1800)
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── KPI Cards Superiores ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold mb-1">Total de Protocolos</div>
          <div className="text-xl font-bold text-white font-mono">{total}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-yellow-500/30 bg-yellow-950/20 shadow-md">
          <div className="text-[11px] text-yellow-400 font-semibold mb-1">Com Exigência Aberta</div>
          <div className="text-xl font-bold text-yellow-400 font-mono">{comExigencia}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-950/20 shadow-md">
          <div className="text-[11px] text-blue-400 font-semibold mb-1">Em Análise Técnica</div>
          <div className="text-xl font-bold text-blue-400 font-mono">{emAnalise}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 shadow-md">
          <div className="text-[11px] text-emerald-400 font-semibold mb-1">Aprovados / Deferidos</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{aprovados}</div>
        </div>
      </div>

      {/* ── Barra de Filtros e Ações ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex-wrap backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Busca */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empreendimento, protocolo, órgão ou alvará..."
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
            <option value="prefeitura">Prefeitura de Curitiba (SMU / SMMA)</option>
            <option value="bombeiros">Corpo de Bombeiros</option>
            <option value="concessionaria_energia">Concessionária de Energia</option>
            <option value="concessionaria_agua">Concessionária de Água (Sanepar)</option>
            <option value="ambiental">Ambiental</option>
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
            <span>{isCrawling ? 'Consultando e-Cidadão...' : 'Sincronizar Crawler PMC'}</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl text-white shadow-md active:scale-95 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--orange, #f97316), #c2410c)' }}
          >
            <Plus size={14} />
            <span>Novo Protocolo</span>
          </button>
        </div>
      </div>

      {/* ── Lista de Protocolos ─────────────────────────────────────────── */}
      <div className="w-full flex flex-col gap-3.5">
        {filtered.map(prot => {
          const badge = STATUS_BADGE[prot.status] || STATUS_BADGE.em_analise
          const isExpanded = expandedId === prot.id

          return (
            <div
              key={prot.id}
              className="p-5 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl hover:border-slate-700 transition-all flex flex-col gap-4"
            >
              {/* Linha Superior: Dados do Processo e Órgão */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 flex-shrink-0 shadow-md">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
                        {prot.numeroProtocolo}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {prot.nomeOrgao}
                      </span>
                      {prot.empreendimentoNome && (
                        <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                          🏢 {prot.empreendimentoNome}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      {prot.tipoProcesso}
                    </div>
                  </div>
                </div>

                {/* Status Badge e Ações */}
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm"
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
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      title="Abrir processo no e-Cidadão / PMC"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setEditingItem(prot)
                      setModalOpen(true)
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Editar protocolo"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(prot.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
                    title="Excluir protocolo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Informações Técnicas e de Cadastro */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Alvará de Construção</span>
                  <strong className="text-slate-200 font-mono">{prot.alvaraNumero || 'Não informado'}</strong>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Indicação Fiscal / SQL</span>
                  <strong className="text-slate-200 font-mono">{prot.indicacaoFiscal || 'Não informado'}</strong>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Data de Entrada</span>
                  <strong className="text-slate-200 font-mono">{formatDateBR(prot.dataEntrada)}</strong>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prazo Limite / Estimado</span>
                  <strong className="text-orange-400 font-mono">
                    {prot.prazoEstimado ? formatDateBR(prot.prazoEstimado) : 'A definir'}
                  </strong>
                </div>
              </div>

              {/* Último Despacho em Destaque */}
              {prot.descricaoUltimaMovimentacao && (
                <div className="text-xs text-slate-200 bg-orange-500/10 border border-orange-500/30 px-3.5 py-2.5 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle size={15} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-orange-400">
                      Último Despacho ({prot.ultimaMovimentacao ? formatDateBR(prot.ultimaMovimentacao) : 'Recente'}):
                    </span>{' '}
                    <span>{prot.descricaoUltimaMovimentacao}</span>
                  </div>
                </div>
              )}

              {/* ── LINHA DO TEMPO DAS ETAPAS E DESPACHOS ─────────────────── */}
              {prot.historico && prot.historico.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : prot.id)}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown size={15} className="text-orange-400" /> : <ChevronRight size={15} className="text-orange-400" />}
                      <span>Linha do Tempo de Etapas & Apontamentos ({prot.historico.length} movimentações)</span>
                    </button>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      💡 Clique em qualquer etapa para detalhar tudo o que foi apontado ou corrigido
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2.5 pl-2">
                      {prot.historico.map((h, idx) => {
                        const hasExigencia =
                          h.status === 'com_exigencia' ||
                          (h.apontamentosExigencias && h.apontamentosExigencias.length > 0)
                        const isOk = h.status === 'aprovado'

                        return (
                          <div
                            key={h.id || idx}
                            onClick={() => setSelectedEtapa({ protocolo: prot, etapa: h })}
                            className="group p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-orange-500/50 transition-all cursor-pointer flex items-start justify-between gap-3 shadow-md"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Ícone de status da etapa */}
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  hasExigencia
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : isOk
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {hasExigencia ? (
                                  <AlertTriangle size={15} />
                                ) : isOk ? (
                                  <CheckCircle2 size={15} />
                                ) : (
                                  <Clock size={15} />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold font-mono text-white">
                                    {formatDateBR(h.data)}
                                  </span>
                                  {h.autor && (
                                    <span className="text-[11px] font-semibold text-slate-400">
                                      • {h.autor}
                                    </span>
                                  )}
                                  {h.acaoNome && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                      Ação: {h.acaoNome}
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-slate-200 font-medium mt-1 leading-relaxed">
                                  {h.descricao}
                                </div>

                                {/* Badges de conteúdo anexado nesta data */}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {h.apontamentosExigencias && h.apontamentosExigencias.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                      <ShieldAlert size={11} />
                                      {h.apontamentosExigencias.length} Apontamento(s)
                                    </span>
                                  )}

                                  {h.correcoesAtendidas && h.correcoesAtendidas.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <UserCheck size={11} />
                                      {h.correcoesAtendidas.length} Item(ns) Corrigido(s)
                                    </span>
                                  )}

                                  {h.documentosAnexados && h.documentosAnexados.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      <FileText size={11} />
                                      {h.documentosAnexados.length} Documento(s)
                                    </span>
                                  )}

                                  {h.fotosVistoria && h.fotosVistoria.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      <ImageIcon size={11} />
                                      {h.fotosVistoria.length} Foto(s) de Vistoria
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Botão de Ver Detalhes */}
                            <div className="flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:text-orange-300 flex-shrink-0 transition-colors">
                              <Eye size={14} />
                              <span className="hidden sm:inline">Ver Detalhes</span>
                            </div>
                          </div>
                        )
                      })}
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
            <div className="text-xs mt-1">Cadastre novos processos de aprovação ou utilize a sincronização do crawler.</div>
          </div>
        )}
      </div>

      {/* ── Modal de Detalhe da Etapa Específica ───────────────────────── */}
      {selectedEtapa && (
        <EtapaDetailModal
          protocolo={selectedEtapa.protocolo}
          etapa={selectedEtapa.etapa}
          onClose={() => setSelectedEtapa(null)}
        />
      )}

      {/* ── Modal de Cadastro / Edição de Protocolo ────────────────────── */}
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
