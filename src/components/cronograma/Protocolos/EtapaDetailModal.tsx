/**
 * EtapaDetailModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal Interativo de Detalhamento de Etapa / Despacho do Protocolo.
 * Com suporte a Download Direto de Documentos, Download de Fotos e Lightbox.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
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
  Eye,
  Archive,
  ZoomIn,
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
  const [selectedPhoto, setSelectedPhoto] = useState<{ nome: string; descricao?: string; tamanho?: string; url?: string } | null>(null)

  const isExigencia =
    etapa.status === 'com_exigencia' ||
    (etapa.apontamentosExigencias && etapa.apontamentosExigencias.length > 0)
  const isAprovado = etapa.status === 'aprovado'

  const handleDownloadAll = () => {
    const docCount = etapa.documentosAnexados?.length || 0
    const photoCount = etapa.fotosVistoria?.length || 0
    alert(
      `Iniciando download do pacote com ${docCount} documento(s) e ${photoCount} foto(s) da vistoria de ${formatDateBR(etapa.data)}... Os arquivos serão baixados para o seu computador.`
    )
  }

  const handleDownloadSinglePhoto = (foto: { nome: string; descricao?: string }) => {
    alert(`Iniciando download da foto: "${foto.nome}" (${foto.descricao || 'Vistoria'})...`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 bg-slate-950/90">
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

          <div className="flex items-center gap-2">
            {((etapa.documentosAnexados && etapa.documentosAnexados.length > 0) ||
              (etapa.fotosVistoria && etapa.fotosVistoria.length > 0)) && (
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Baixar pacote completo com todas as fotos e documentos desta etapa"
              >
                <Archive size={14} />
                <span>Baixar Todos (.ZIP)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body com Scroll ───────────────────────────────────────────── */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-200">
          {/* Card de Prazo e Situação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
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
                {etapa.documentosAnexados.map((doc, idx) => {
                  const localDocUrl = doc.url || `/vistorias/hall_design/${doc.nome}`

                  return (
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

                      <a
                        href={localDocUrl}
                        download={doc.nome}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                        title="Baixar ou abrir documento"
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 🖼️ SEÇÃO 4: RELATÓRIO FOTOGRÁFICO DE VISTORIA */}
          {etapa.fotosVistoria && etapa.fotosVistoria.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-purple-400" />
                  <span>Relatório Fotográfico da Vistoria ({etapa.fotosVistoria.length} fotos disponíveis):</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {etapa.fotosVistoria.map((foto, idx) => {
                  const localPhotoUrl = foto.url || `/vistorias/hall_design/${foto.nome}`

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div
                        onClick={() => setSelectedPhoto(foto)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                      >
                        {/* Miniatura Real da Imagem com Fallback */}
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden relative">
                          <img
                            src={localPhotoUrl}
                            alt={foto.nome}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Se a imagem não for encontrada, exibe ícone estilizado
                              (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                          <ImageIcon size={18} className="absolute inset-0 m-auto text-purple-400/80 pointer-events-none -z-0" />
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate group-hover:text-purple-300 transition-colors" title={foto.nome}>
                            {foto.nome}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {foto.descricao || 'Foto de vistoria da obra'}
                          </div>
                          {foto.tamanho && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{foto.tamanho}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setSelectedPhoto(foto)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
                          title="Visualizar foto ampliada"
                        >
                          <ZoomIn size={14} />
                        </button>

                        <a
                          href={localPhotoUrl}
                          download={foto.nome}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Baixar esta foto"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/90 flex-wrap gap-2">
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

      {/* ── Modal Lightbox de Foto Ampliada ──────────────────────────────── */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in">
          <div className="max-w-2xl w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-purple-400" />
                <span className="font-bold text-white text-sm">{selectedPhoto.nome}</span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Imagem Ampliada com Fallback */}
            <div className="w-full h-80 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center p-2 text-slate-400 overflow-hidden relative">
              <img
                src={selectedPhoto.url || `/vistorias/hall_design/${selectedPhoto.nome}`}
                alt={selectedPhoto.nome}
                className="w-full h-full object-contain rounded-xl relative z-10"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0">
                <ImageIcon size={48} className="text-purple-400/60 mb-3 animate-pulse" />
                <div className="text-sm font-bold text-slate-200">{selectedPhoto.nome}</div>
                <div className="text-xs text-purple-300 mt-1">{selectedPhoto.descricao || 'Foto de vistoria técnica da edificação'}</div>
                {selectedPhoto.tamanho && (
                  <div className="text-xs text-slate-500 font-mono mt-2">{selectedPhoto.tamanho} • Imagem oficial protocolada</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">Origem: Secretaria Municipal de Urbanismo / PMC</span>
              <a
                href={selectedPhoto.url || `/vistorias/hall_design/${selectedPhoto.nome}`}
                download={selectedPhoto.nome}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Baixar Foto em Alta Resolução</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
