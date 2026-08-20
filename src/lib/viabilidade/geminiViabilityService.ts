/**
 * lib/viabilidade/geminiViabilityService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço de Integração com a API Google Gemini para o Copilot de Viabilidade:
 *  - Análise e auditoria crítica de premissas de incorporação
 *  - Extração de dados a partir de documentos anexados (matrículas, propostas, tabelas)
 *  - Retorno estruturado de premissas sugeridas para aplicação em 1 clique
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  ViabilityStudyModel,
  ViabilityMetrics,
} from '../../types/viabilidade'

export interface GeminiCopilotResponse {
  messageText: string
  suggestedAssumptions?: Partial<ViabilityStudyModel>
  riskAlerts?: string[]
}

/**
 * Consulta o Gemini Copilot enviando o contexto atual da viabilidade e documento opcional.
 */
export async function askViabilityCopilot(
  userPrompt: string,
  study: ViabilityStudyModel,
  metrics: ViabilityMetrics,
  attachedFile?: { name: string; base64: string; mimeType: string },
  customApiKey?: string
): Promise<GeminiCopilotResponse> {
  const apiKey =
    customApiKey ||
    localStorage.getItem('incor_gemini_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''

  const systemInstruction = `
Você é o Assistente Especialista em Viabilidade de Incorporação Imobiliária (CRD Pro Forma) do IncorProjetos.
Seu objetivo é orientar o usuário no preenchimento das premissas, auditar os números financeiros calculados (VGV, DRE, Exposição de Caixa, TIR, VPL, Payback) e extrair dados de documentos anexados (matrículas de terreno, propostas de compra, fichas de zoneamento, tabelas de venda).

Contexto Atual do Estudo:
- Nome: ${study.name} (${study.version})
- Terreno: ${study.land.landAreaM2}m², Compra: R$ ${study.land.cashPurchasePrice}, Permuta Física: ${study.land.physicalPermutationPct}%, Permuta Financeira: ${study.land.financialPermutationPct}%
- Produto: ${study.product.totalUnitsCount} unidades, ${study.product.totalPrivateAreaM2}m² privativos, ${study.product.totalBuiltAreaM2}m² construídos, Eficiência: ${(study.product.efficiencyRatio * 100).toFixed(1)}%
- Vendas: VSO ${study.sales.monthlyAbsorptionVsoPct}% a.m., Lançamento ${study.sales.launchSalesPct}%, Preço Médio R$ ${study.sales.basePriceAverageM2}/m²
- Obra: Custo R$ ${study.costs.constructionCostPerBuiltM2}/m² construído (Total: R$ ${study.costs.totalConstructionCost}), Curva: ${study.costs.constructionCurveMonths} meses
- Financiamento PJ: ${study.financing.enabled ? `Ativo (${study.financing.maxFinancingPctOfConstruction}% a ${study.financing.annualInterestRatePct}% a.a.)` : 'Desativado'}
- Indicadores Calculados: VGV Líquido R$ ${metrics.netVgv}, Lucro Líquido R$ ${metrics.netProfit} (${metrics.netMarginPct.toFixed(1)}% de Margem), Exposição Máxima R$ ${metrics.maxCashExposure} (Mês ${metrics.maxExposureMonth}), TIR Projeto ${metrics.projectAnnualIrrPct.toFixed(1)}% a.a., VPL R$ ${metrics.npvAtTma}, Payback Mês ${metrics.paybackMonth}.

Formato de Resposta Esperado:
Se você identificar dados novos para pré-preencher as premissas (ou se o usuário pediu para ajustar valores), inclua no final da sua resposta um bloco JSON delimitado por \`\`\`json { "suggestedAssumptions": { ... } } \`\`\` contendo os campos compatíveis com o modelo ViabilityStudyModel para que o usuário possa aplicar com 1 clique.
Se for apenas uma dúvida ou análise, responda em formato Markdown claro, técnico e direto ao ponto.
`

  // Se não houver chave de API configurada, gera uma resposta local inteligente
  if (!apiKey) {
    return generateLocalFallbackResponse(userPrompt, study, metrics)
  }

  try {
    const contents: any[] = []

    const parts: any[] = []

    if (attachedFile) {
      parts.push({
        inlineData: {
          mimeType: attachedFile.mimeType,
          data: attachedFile.base64.split(',')[1] || attachedFile.base64,
        },
      })
      parts.push({
        text: `Arquivo anexado: ${attachedFile.name}. Extraia as informações de terreno, produto, custos ou vendas para este estudo de viabilidade.`,
      })
    }

    parts.push({
      text: userPrompt,
    })

    contents.push({ role: 'user', parts })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Erro na API do Gemini: ${response.statusText}`)
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extrai JSON sugerido se houver
    let suggestedAssumptions: Partial<ViabilityStudyModel> | undefined
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/)
    let cleanText = rawText

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        suggestedAssumptions = parsed.suggestedAssumptions || parsed
        cleanText = rawText.replace(/```json[\s\S]*?```/, '').trim()
      } catch { /* silence */ }
    }

    return {
      messageText: cleanText || rawText,
      suggestedAssumptions,
    }
  } catch (err: any) {
    console.warn('Fallback para IA local devido a:', err)
    return generateLocalFallbackResponse(userPrompt, study, metrics)
  }
}

/**
 * Resposta local inteligente caso o usuário esteja offline ou sem API key
 */
function generateLocalFallbackResponse(
  userPrompt: string,
  study: ViabilityStudyModel,
  metrics: ViabilityMetrics
): GeminiCopilotResponse {
  const promptLower = userPrompt.toLowerCase()

  if (promptLower.includes('auditar') || promptLower.includes('risco')) {
    const isTirOk = metrics.projectAnnualIrrPct >= (study.taxAndIndex.discountRateTmaAnnualPct || 12)
    const isMarginOk = metrics.netMarginPct >= 15

    return {
      messageText: `### 🔍 Auditoria Rápida de Viabilidade:

1. **Rentabilidade (TIR)**: A TIR anual apurada é de **${metrics.projectAnnualIrrPct.toFixed(1)}% a.a.** (${isTirOk ? '✅ Acima da TMA de 12%' : '⚠️ Abaixo da TMA de 12%'}).
2. **Margem Líquida**: O projeto atinge **${metrics.netMarginPct.toFixed(1)}% de margem líquida** (${isMarginOk ? '✅ Saudável para o setor' : '⚠️ Atenção: margem abaixo de 15%'}).
3. **Exposição de Caixa**: O pico de capital próprio exigido é de **R$ ${(metrics.maxCashExposure / 1000000).toFixed(2)}M no Mês ${metrics.maxExposureMonth}**, com retorno (Payback) estimado para o **Mês ${metrics.paybackMonth}**.

💡 *Dica*: Ativar o financiamento bancário à produção ou negociar permuta física adicional de 5% reduz substancialmente a exposição máxima de caixa.`,
    }
  }

  if (promptLower.includes('permuta')) {
    return {
      messageText: `### 💡 Simulação de Permuta Física:

Ao aumentar a **permuta física para 15%**, reduz-se o desembolso inicial de compra em dinheiro e a exposição de caixa da obra diminui significativamente.

Clique abaixo para aplicar essa alteração de premissa no estudo.`,
      suggestedAssumptions: {
        land: {
          ...study.land,
          physicalPermutationPct: 15.0,
          cashPurchasePrice: Math.round(study.land.cashPurchasePrice * 0.8),
        },
      },
    }
  }

  return {
    messageText: `Olá! Sou seu Copilot de Viabilidade de Incorporação.
Posso ajudar você a:
- 📑 **Preencher as abas passo a passo** com parâmetros recomendados de mercado;
- 📎 **Analisar arquivos anexados** (matrícula do terreno, proposta comercial ou tabela de vendas) e preencher os dados automaticamente;
- 📊 **Auditar a TIR, VPL, Margem e Exposição de Caixa** identificando gargalos e oportunidades de otimização.

Como posso ajudar no estudo **${study.name}** agora?`,
  }
}
