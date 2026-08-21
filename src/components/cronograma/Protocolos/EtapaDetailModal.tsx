/**
 * EtapaDetailModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal Interativo de Detalhamento de Etapa / Despacho do Protocolo.
 * Exibe tudo o que a prefeitura/órgão apontou ou exigiu naquela data específica,
 * tudo o que foi corrigido/respondido, os documentos anexados e o relatório fotográfico.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import {
  X,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  Download,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import type { MovimentacaoProtocolo, ProtocoloItem } from '../../../types/cronograma'
import { formatDateBR } from '../../../lib/businessCalendar'

interface EtapaDetailModalProps {
  protocolo: ProtocoloItem
  etapa: MovimentacaoProtocolo
  onClose: () => void
}

export default function EtapaDetailModal({
  protocolo,
  etapa,
  onClose,
}: EtapaDetailModalProps) {
  const isExigencia =
    etapa.status === 'com_exigencia' ||
    (etapa.apontamentosExigencias && etapa.apontamentosExigencias.length > 0)
  const isAprovado = etapa.status === 'aprovado'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                isExigencia
                  ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'
                  : isAprovado
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
              }`}
            >
              {isExigencia ? (
                <AlertTriangle size={22} />
              ) : isAprovado ? (
                <CheckCircle2 size={22} />
              ) : (
                <Clock size={22} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-white px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
                  {formatDateBR(etapa.data)}
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {etapa.autor || protocolo.nomeOrgao}
                </span>
                {etapa.unidade && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-orange-400 border border-orange-500/20">
                    {etapa.unidade}
                  </span>
                )}
              </div>

              <h2 className="text-base font-bold text-white mt-1">
                {protocolo.empreendimentoNome ? `${protocolo.empreendimentoNome} • ` : ''}
                {protocolo.tipoProcesso}
              </h2>
              <div className="text-xs text-slate-400">
                Protocolo: <strong className="text-slate-200 font-mono">{protocolo.numeroProtocolo}</strong>
                {protocolo.alvaraNumero && (
                  <> • Alvará: <strong className="text-slate-200">{protocolo.alvaraNumero}</strong></>
                )}
                {protocolo.indicacaoFiscal && (
                  <> • Ind. Fiscal: <strong className="text-slate-200">{protocolo.indicacaoFiscal}</strong></>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body com Scroll ───────────────────────────────────────────── */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-200">
          {/* Card de Prazo e Situação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Situação do Despacho</div>
              <div className="text-xs font-bold text-white mt-0.5">
                {etapa.situacao || (isExigencia ? 'Aguardando resposta do solicitante' : 'Em análise')}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Prazo de Atendimento</div>
              <div className="text-xs font-bold text-orange-400 mt-0.5">
                {etapa.prazoAtendimento || (protocolo.prazoEstimado ? formatDateBR(protocolo.prazoEstimado) : 'Sem prazo determinado')}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Ação no Portal</div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">
                {etapa.acaoNome ? `Botão "${etapa.acaoNome}" disponível` : 'Informativo'}
              </div>
            </div>
          </div>

          {/* Resumo do Parecer Geral */}
          {etapa.descricao && (
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80">
              <div className="text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-orange-400" />
                <span>Parecer Oficial Emitido pelo Analista:</span>
              </div>
              <p className="text-slate-200 leading-relaxed whitespace-pre-line text-xs font-sans">
                {etapa.descricao}
              </p>
            </div>
          )}

          {/* 🔴 SEÇÃO 1: O QUE FOI APONTADO / EXIGIDO NESTA DATA */}
          {etapa.apontamentosExigencias && etapa.apontamentosExigencias.length > 0 && (
            <div className="p-4 rounded-2xl bg-yellow-950/20 border border-yellow-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase tracking-wide">
                <ShieldAlert size={16} />
                <span>O que foi Apontado / Exigido pela Prefeitura nesta data ({etapa.apontamentosExigencias.length}):</span>
              </div>
              <div className="space-y-2">
                {etapa.apontamentosExigencias.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-yellow-500/20 text-slate-200 flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="text-xs font-sans whitespace-pre-line">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🟢 SEÇÃO 2: O QUE FOI CORRIGIDO / ATENDIDO PELO SOLICITANTE */}
          {etapa.correcoesAtendidas && etapa.correcoesAtendidas.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                <UserCheck size={16} />
                <span>O que foi Corrigido / Respondido pelo Responsável Técnico ({etapa.correcoesAtendidas.length}):</span>
              </div>
              <div className="space-y-2">
                {etapa.correcoesAtendidas.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 text-slate-200 flex items-start gap-2.5 leading-relaxed"
                  >
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs font-sans">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📎 SEÇÃO 3: DOCUMENTOS E CERTIDÕES ANEXADOS NESTA DATA */}
          {etapa.documentosAnexados && etapa.documentosAnexados.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText size={15} className="text-blue-400" />
                  <span>Documentos e Certidões Anexadas ({etapa.documentosAnexados.length}):</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {etapa.documentosAnexados.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 font-bold text-[10px]">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate" title={doc.nome}>
                          {doc.nome}
                        </div>
                        {doc.tamanho && (
                          <div className="text-[10px] text-slate-500 font-mono">{doc.tamanho}</div>
                        )}
                      </div>
                    </div>

                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                        title="Baixar ou visualizar documento"
                      >
                        <Download size={13} />
                      </a>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Disponível
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🖼️ SEÇÃO 4: RELATÓRIO FOTOGRÁFICO DE VISTORIA */}
          {etapa.fotosVistoria && etapa.fotosVistoria.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon size={15} className="text-purple-400" />
                <span>Relatório Fotográfico da Vistoria de Obra ({etapa.fotosVistoria.length} itens):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {etapa.fotosVistoria.map((foto, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                      <ImageIcon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-200 truncate" title={foto.nome}>
                        {foto.nome}
                      </div>
                      <div className="text-[10px] text-purple-300/80 truncate">
                        {foto.descricao || 'Foto de vistoria em campo'}
                      </div>
                    </div>
                    {foto.tamanho && (
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        {foto.tamanho}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/80 flex-wrap gap-2">
          {protocolo.linkConsulta ? (
            <a
              href={protocolo.linkConsulta}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors"
            >
              <ExternalLink size={13} />
              <span>Abrir este processo no portal e-Cidadão / PMC</span>
            </a>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  )
}
