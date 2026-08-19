/**
 * ProtocoloModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal para Cadastro e Edição de Protocolos em Órgãos Públicos / Concessionárias
 * e registro de histórico de despachos/movimentações.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import { X, Building2, Plus, Calendar, Link as LinkIcon, FileText } from 'lucide-react'
import type { ProtocoloItem, OrgaoProtocolo, StatusProtocolo } from '../../../types/cronograma'
import { formatDateISO } from '../../../lib/businessCalendar'

interface ProtocoloModalProps {
  protocolo?: ProtocoloItem | null
  onSave: (item: ProtocoloItem) => void
  onClose: () => void
}

const ORGAO_OPTIONS: { value: OrgaoProtocolo; label: string }[] = [
  { value: 'prefeitura', label: '🏛️ Prefeitura Municipal (Alvará / Licenças)' },
  { value: 'bombeiros', label: '🚒 Corpo de Bombeiros (AVCB / PPCI)' },
  { value: 'concessionaria_energia', label: '⚡ Concessionária de Energia Elétrica (CEMIG/Enel)' },
  { value: 'concessionaria_agua', label: '💧 Concessionária de Água e Esgoto (COPASA/Sabesp)' },
  { value: 'ambiental', label: '🌿 Órgão Ambiental (Licenciamento)' },
  { value: 'cartorio', label: '📜 Cartório de Registro de Imóveis (R.I.)' },
  { value: 'outro', label: '📌 Outros Órgãos' },
]

export default function ProtocoloModal({ protocolo, onSave, onClose }: ProtocoloModalProps) {
  const today = formatDateISO(new Date())

  const [numero, setNumero] = useState(protocolo?.numeroProtocolo || '')
  const [orgao, setOrgao] = useState<OrgaoProtocolo>(protocolo?.orgao || 'prefeitura')
  const [nomeOrgao, setNomeOrgao] = useState(protocolo?.nomeOrgao || 'Prefeitura Municipal')
  const [tipoProcesso, setTipoProcesso] = useState(protocolo?.tipoProcesso || 'Alvará de Construção')
  const [dataEntrada, setDataEntrada] = useState(protocolo?.dataEntrada || today)
  const [prazoEstimado, setPrazoEstimado] = useState(protocolo?.prazoEstimado || '')
  const [status, setStatus] = useState<StatusProtocolo>(protocolo?.status || 'em_analise')
  const [linkConsulta, setLinkConsulta] = useState(protocolo?.linkConsulta || '')
  const [responsavel, setResponsavel] = useState(protocolo?.responsavel || '')
  const [novaMovimentacao, setNovaMovimentacao] = useState('')

  const handleSave = () => {
    if (!numero.trim() || !tipoProcesso.trim()) {
      alert('Preencha o número do protocolo e o tipo de processo.')
      return
    }

    const historicoAtual = protocolo?.historico ? [...protocolo.historico] : []
    if (novaMovimentacao.trim()) {
      historicoAtual.unshift({
        id: `h-${Date.now()}`,
        data: today,
        descricao: novaMovimentacao.trim(),
        status,
      })
    }

    const item: ProtocoloItem = {
      id: protocolo?.id || `prot-${Date.now()}`,
      numeroProtocolo: numero.trim(),
      orgao,
      nomeOrgao: nomeOrgao.trim(),
      tipoProcesso: tipoProcesso.trim(),
      dataEntrada,
      prazoEstimado: prazoEstimado || undefined,
      status,
      ultimaMovimentacao: novaMovimentacao.trim() ? today : protocolo?.ultimaMovimentacao,
      descricaoUltimaMovimentacao: novaMovimentacao.trim() || protocolo?.descricaoUltimaMovimentacao,
      linkConsulta: linkConsulta.trim() || undefined,
      responsavel: responsavel.trim() || undefined,
      historico: historicoAtual,
    }

    onSave(item)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700 flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-orange-400" />
            <span className="text-sm font-bold text-white">
              {protocolo ? 'Editar Protocolo de Aprovação' : 'Novo Protocolo em Órgão Público'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Órgão e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-slate-300">Categoria do Órgão</label>
              <select
                value={orgao}
                onChange={e => setOrgao(e.target.value as OrgaoProtocolo)}
                className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 outline-none"
              >
                {ORGAO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-300">Nome do Órgão / Entidade</label>
              <input
                type="text"
                value={nomeOrgao}
                onChange={e => setNomeOrgao(e.target.value)}
                placeholder="Ex: Prefeitura Municipal de Belo Horizonte"
                className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {/* Número e Tipo de Processo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-slate-300">Nº do Processo / Protocolo *</label>
              <input
                type="text"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Ex: 2026/04982-BH"
                className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-300">Tipo de Processo *</label>
              <input
                type="text"
                value={tipoProcesso}
                onChange={e => setTipoProcesso(e.target.value)}
                placeholder="Ex: Alvará de Aprovação e Execução"
                className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {/* Datas e Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-slate-300">Data de Entrada</label>
              <input
                type="date"
                value={dataEntrada}
                onChange={e => setDataEntrada(e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 bg-slate-800 border border-slate-700 text-white font-mono outline-none text-center"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-300">Prazo Estimado</label>
              <input
                type="date"
                value={prazoEstimado}
                onChange={e => setPrazoEstimado(e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 bg-slate-800 border border-slate-700 text-white font-mono outline-none text-center"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-300">Status Atual</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as StatusProtocolo)}
                className="w-full rounded-xl px-2.5 py-2 bg-slate-800 border border-slate-700 text-white font-bold outline-none"
              >
                <option value="em_analise" className="text-blue-400">⏳ Em Análise</option>
                <option value="com_exigencia" className="text-yellow-400">⚠️ Com Exigência</option>
                <option value="aprovado" className="text-emerald-400">✅ Aprovado</option>
                <option value="indeferido" className="text-red-400">❌ Indeferido</option>
                <option value="arquivado" className="text-slate-400">📁 Arquivado</option>
              </select>
            </div>
          </div>

          {/* Link e Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-slate-300">Link do Portal de Consulta</label>
              <input
                type="url"
                value={linkConsulta}
                onChange={e => setLinkConsulta(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-300">Responsável / Despachante</label>
              <input
                type="text"
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                placeholder="Ex: Dra. Camila (Jurídico)"
                className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {/* Nova Movimentação / Despacho */}
          <div>
            <label className="block mb-1 font-semibold text-slate-300">
              Registrar Nova Movimentação / Despacho
            </label>
            <textarea
              value={novaMovimentacao}
              onChange={e => setNovaMovimentacao(e.target.value)}
              placeholder="Ex: Parecer favorável emitido na comissão técnica..."
              rows={2}
              className="w-full rounded-xl px-3 py-2 bg-slate-800 border border-slate-700 text-white outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl text-slate-300 hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95"
          >
            Salvar Protocolo
          </button>
        </div>
      </div>
    </div>
  )
}
