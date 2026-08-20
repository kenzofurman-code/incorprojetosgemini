/**
 * components/viabilidade/ViabilidadeAiCopilot.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Assistente de IA Flutuante (Gemini Copilot de Viabilidade):
 *  - Fica posicionado no canto inferior direito da tela
 *  - Guia o usuário no preenchimento e responde dúvidas conceituais
 *  - Suporta upload de arquivos (PDFs, imagens, tabelas) para extração automática
 *  - Botão interativo "Aplicar Premissas Sugeridas" para preenchimento com 1 clique
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  X,
  Send,
  Paperclip,
  Key,
  Check,
  AlertCircle,
  FileText,
  Bot,
  User,
  Sliders,
  ChevronDown,
} from 'lucide-react'
import type {
  ViabilityStudyModel,
  ViabilityMetrics,
  ViabilityAiMessage,
} from '../../types/viabilidade'
import { askViabilityCopilot } from '../../lib/viabilidade/geminiViabilityService'

interface ViabilidadeAiCopilotProps {
  study: ViabilityStudyModel
  metrics: ViabilityMetrics
  onApplyAssumptions: (assumptions: Partial<ViabilityStudyModel>) => void
}

export default function ViabilidadeAiCopilot({
  study,
  metrics,
  onApplyAssumptions,
}: ViabilidadeAiCopilotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ViabilityAiMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      content: `Olá! Sou seu **Copilot de Viabilidade de Incorporação**. 

Estou pronto para ajudar você a:
- 📑 **Preencher as premissas** passo a passo;
- 📎 **Ler arquivos anexados** (matrículas de terreno, propostas comerciais ou tabelas de venda) e pré-preencher com 1 clique;
- 📊 **Auditar riscos**, analisando a TIR, VPL e Exposição Máxima de Caixa.

O que deseja analisar?`,
    },
  ])

  const [inputPrompt, setInputPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('incor_gemini_api_key') || '')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt
    if (!textToSend.trim() && !attachedFile) return

    const userMsg: ViabilityAiMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      content: attachedFile ? `[Arquivo: ${attachedFile.name}]\n${textToSend}` : textToSend,
    }

    setMessages(prev => [...prev, userMsg])
    setInputPrompt('')
    setIsLoading(true)

    const filePayload = attachedFile || undefined
    setAttachedFile(null)

    try {
      const response = await askViabilityCopilot(
        textToSend,
        study,
        metrics,
        filePayload,
        apiKeyInput || undefined
      )

      const assistantMsg: ViabilityAiMessage = {
        id: `msg-assistant-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        content: response.messageText,
        suggestedAssumptions: response.suggestedAssumptions,
        applied: false,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'system',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          content: `⚠️ Não foi possível obter resposta: ${err.message || 'Erro de conexão'}.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        base64: reader.result as string,
        mimeType: file.type || 'application/octet-stream',
      })
    }
    reader.readAsDataURL(file)
  }

  const handleApply = (msgId: string, assumptions: Partial<ViabilityStudyModel>) => {
    onApplyAssumptions(assumptions)
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, applied: true } : m))
    )
  }

  const handleSaveApiKey = () => {
    localStorage.setItem('incor_gemini_api_key', apiKeyInput.trim())
    setShowKeyModal(false)
  }

  return (
    <>
      {/* Botão Flutuante (quando minimizado) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs shadow-2xl hover:scale-105 transition-all duration-200 cursor-pointer border border-orange-400/40 group"
        >
          <div className="p-1 rounded-full bg-white/20">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <span>Copilot de Viabilidade</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 ring-4 ring-emerald-400/20" />
        </button>
      )}

      {/* Janela do Chat Flutuante */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md h-[540px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Cabeçalho */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Gemini Copilot de Viabilidade</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-orange-500/20 text-orange-400 font-mono">
                    IA
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Guia de preenchimento e auditoria</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeyModal(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Configurar Chave da API Gemini"
              >
                <Key size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender !== 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-orange-500 text-white rounded-tr-xs'
                      : msg.sender === 'system'
                      ? 'bg-red-950/60 border border-red-800 text-red-300 rounded-tl-xs'
                      : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Card Interativo com Botão de Aplicar Premissas */}
                  {msg.suggestedAssumptions && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-orange-500/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[11px]">
                        <Sliders size={12} />
                        <span>Premissas Sugeridas pela IA</span>
                      </div>

                      {msg.applied ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                          <Check size={13} />
                          <span>Premissas aplicadas no estudo com sucesso!</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApply(msg.id, msg.suggestedAssumptions!)}
                          className="w-full py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <span>Aplicar Premissas no Estudo</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 ${
                      msg.sender === 'user' ? 'text-orange-200' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs pl-8">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                <span>Analisando viabilidade e processando cálculos...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chips de Ação Rápida */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none">
            <button
              onClick={() => handleSendMessage('🔍 Auditar riscos deste estudo de viabilidade')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
            >
              🔍 Auditar Riscos
            </button>
            <button
              onClick={() => handleSendMessage('💡 Simular permuta física de 15%')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
            >
              💡 Simular Permuta 15%
            </button>
            <button
              onClick={() => handleSendMessage('📋 Qual a sequência recomendada de preenchimento?')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
            >
              📋 Sequência de Preenchimento
            </button>
          </div>

          {/* Anexo de Arquivo Selecionado */}
          {attachedFile && (
            <div className="px-3 py-1.5 bg-orange-500/10 border-t border-orange-500/20 flex items-center justify-between text-[11px] text-orange-300">
              <span className="truncate max-w-[240px]">📎 {attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Input de Mensagem */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Anexar documento (PDF de matrícula, proposta ou tabela de vendas)"
            >
              <Paperclip size={16} />
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Pergunte ao Copilot ou anexe um arquivo..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-orange-500 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || (!inputPrompt.trim() && !attachedFile)}
              className="p-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white transition-colors cursor-pointer"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Chave API Gemini */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key size={16} className="text-orange-400" />
              <span>Chave da API Gemini (Opcional)</span>
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Insira sua chave do Google Gemini (Google AI Studio) para habilitar o processamento multimodal e análise avançada de arquivos em tempo real.
            </p>

            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Cole sua Gemini API Key (AIzaSy...)"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
