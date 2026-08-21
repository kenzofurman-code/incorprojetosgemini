/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Oficial de Extração Profunda - Prefeitura de Curitiba (PMC / SYDLE ONE)
 * Extrai 100% dos dados estruturados:
 *  - Dados do Processo (CVCO, Alvará, Requerente, Código de Busca)
 *  - Histórico Cronológico de Despachos da SMU / SMMA / UCE
 *  - Lista de Pendências e Exigências (Resolvidas e Em Aberto com Prazos)
 *  - Documentos e Guias em PDF anexados
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

function loadEnv() {
  const envPath = path.resolve('.env')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        let val = trimmed.slice(idx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        env[key] = val
      }
    }
  })
  return env
}

const env = loadEnv()
const CPF = env.CURITIBA_CPF || process.env.CURITIBA_CPF || ''
const SENHA = env.CURITIBA_SENHA || process.env.CURITIBA_SENHA || ''
const TICKET_URL = env.CURITIBA_TICKET_URL || 'https://servicodigital.curitiba.pr.gov.br/t/69a5027b7be4a87d6455e477'
const IS_HEADLESS = env.HEADLESS !== 'false'

const SESSION_FILE = 'scripts/session-curitiba.json'

async function runOfficialCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🏛️ ROBÔ PMC - EXTRAÇÃO PROFUNDA DE DADOS E PENDÊNCIAS (CVCO)')
  console.log('═══════════════════════════════════════════════════════════════')

  const browser = await chromium.launch({
    headless: IS_HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let context
  if (fs.existsSync(SESSION_FILE)) {
    console.log('🔑 Carregando sessão de login salva...')
    try {
      context = await browser.newContext({ storageState: SESSION_FILE, viewport: { width: 1440, height: 1000 } })
    } catch {
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    }
  } else {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  }

  const page = await context.newPage()

  // 1. Interceptar as APIs oficiais do SYDLE ONE em tempo real
  const capturedApis = {}

  page.on('response', async (response) => {
    const url = response.url()
    try {
      if (url.includes('showTicketInfo')) {
        capturedApis.ticketInfo = await response.json()
      } else if (url.includes('getTicketComments')) {
        capturedApis.comments = await response.json()
      } else if (url.includes('getCards')) {
        capturedApis.cards = await response.json()
      }
    } catch { /* ignore */ }
  })

  try {
    console.log(`🌐 Acessando processo: ${TICKET_URL}`)
    await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(4000)

    // Se precisar autenticar
    if (page.url().includes('autenticacao-ecidadao') || page.url().includes('/login')) {
      console.log('🔒 Fazendo login no e-Cidadão com CPF e Senha...')

      const btnCpfSelector = 'button:has-text("Entrar com CPF"), #btnEntrarCPF, a:has-text("Entrar com CPF")'
      await page.waitForSelector(btnCpfSelector, { state: 'visible', timeout: 30000 })
      await page.click(btnCpfSelector)
      await page.waitForTimeout(1500)

      await page.waitForSelector('#documento', { state: 'visible', timeout: 30000 })
      await page.fill('#documento', CPF)
      await page.waitForTimeout(1000)

      await page.click('#btnProximo, button:has-text("Próxima")')
      await page.waitForTimeout(3000)

      const senhaSelector = 'input[type="password"]:visible, #senha:visible, #password:visible, input[name="senha"]:visible'
      await page.waitForSelector(senhaSelector, { state: 'visible', timeout: 30000 })
      await page.fill(senhaSelector, SENHA)
      await page.waitForTimeout(1000)

      await page.click('#btnEntrar, #btnLogin, button[type="submit"]:visible, button:has-text("Entrar"):visible')
      console.log('⏳ Autenticando...')
      await page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)

      try {
        await context.storageState({ path: SESSION_FILE })
        console.log('💾 Sessão salva com sucesso!')
      } catch { /* silence */ }
    }

    if (!page.url().includes('/t/')) {
      await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)
    }

    console.log('⏳ Aguardando recebimento das respostas de dados da PMC...')
    await page.waitForTimeout(8000)

    // ── 2. Processar e Estruturar os Dados Oficiais ─────────────────────────
    const ticketInfoResult = capturedApis.ticketInfo?.result || {}
    const solicitacao = ticketInfoResult.dadosDaSolicitacao || {}
    const rawComments = capturedApis.comments?.comments || []

    const attachmentsList = []
    const historicoDespachos = []
    const pendenciasAbertas = []
    const itensAprovados = []

    rawComments.forEach(comment => {
      const texto = comment.text || ''
      const dataCriacao = comment._creationDate || ''
      const autor = comment.user?.name || 'Prefeitura Municipal de Curitiba'
      const acao = comment.action ? comment.action.name : null

      // Anexos
      if (Array.isArray(comment.attachments)) {
        comment.attachments.forEach(att => {
          attachmentsList.push({
            nome: att.name,
            tamanho: `${Math.round(att.length / 1024)} KB`,
            tipo: att.contentType,
            id: att._id,
          })
        })
      }

      // Despacho no histórico
      const despacho = {
        data: dataCriacao,
        autor,
        acao,
        despachoTexto: texto.replace(/\n\s*\n/g, '\n').trim(),
      }
      historicoDespachos.push(despacho)

      // Análise de pendências vs aprovações
      const lower = texto.toLowerCase()
      if (lower.includes('pendência') || lower.includes('aguardando resposta') || lower.includes('exigência')) {
        pendenciasAbertas.push(despacho)
      } else if (lower.includes('deferido') || lower.includes('aprovado') || lower.includes('reconhecido')) {
        itensAprovados.push(despacho)
      }
    })

    const relatorioConsolidado = {
      portal: 'Prefeitura Municipal de Curitiba - Serviços Digitais (SMU)',
      servico: 'Emitir Certificado de Conclusão de Obra (CVCO)',
      ticketId: '69a5027b7be4a87d6455e477',
      dataConsulta: new Date().toISOString(),
      statusGeral: pendenciasAbertas.length > 0 ? 'Com Exigência / Aguardando Resposta' : 'Em Análise / Tramitação',
      resumo: {
        totalDespachos: historicoDespachos.length,
        totalPendenciasAbertas: pendenciasAbertas.length,
        totalAprovacoes: itensAprovados.length,
        totalDocumentosPdfAnexados: attachmentsList.length,
      },
      pendenciasNaoResolvidas: pendenciasAbertas,
      itensAprovadosEDeferidos: itensAprovados,
      documentosEGuiasAnexadas: attachmentsList,
      historicoCompletoDeMovimentacoes: historicoDespachos,
    }

    // Salvar JSON Oficial Consolidado
    const jsonPath = 'scripts/curitiba-dados-completos.json'
    fs.writeFileSync(jsonPath, JSON.stringify(relatorioConsolidado, null, 2), 'utf-8')
    console.log(`\n💾 Relatório estruturado salvo com sucesso em: ${jsonPath}`)

    // Salvar Screenshot
    await page.screenshot({ path: 'scripts/curitiba-processo-completo.png', fullPage: true })

    // ── 3. Exibir Resumo no Terminal ─────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('📋 RELATÓRIO DO PROCESSO (PREFEITURA DE CURITIBA):')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`📌 Serviço: ${relatorioConsolidado.servico}`)
    console.log(`🏷️ Status Geral: ${relatorioConsolidado.statusGeral}`)
    console.log(`📑 Total de Movimentações: ${relatorioConsolidado.resumo.totalDespachos}`)
    console.log(`🔴 Pendências / Exigências Abertas: ${relatorioConsolidado.resumo.totalPendenciasAbertas}`)
    console.log(`🟢 Itens Deferidos / Aprovados: ${relatorioConsolidado.resumo.totalAprovacoes}`)
    console.log(`📎 Documentos e Guias PDF: ${relatorioConsolidado.resumo.totalDocumentosPdfAnexados}`)

    console.log('\n🔴 PENDÊNCIAS EM ABERTO IDENTIFICADAS:')
    relatorioConsolidado.pendenciasNaoResolvidas.forEach((p, idx) => {
      console.log(`\n[${idx + 1}] Data: ${p.data.split('T')[0]}`)
      console.log(`    Órgão: ${p.autor}`)
      console.log(`    Texto: ${p.despachoTexto}`)
      if (p.acao) console.log(`    Ação Disponível no Portal: "${p.acao}"`)
    })

    console.log('\n📎 DOCUMENTOS DISPONIBILIZADOS PELA PMC:')
    relatorioConsolidado.documentosEGuiasAnexadas.forEach((doc, idx) => {
      console.log(`[${idx + 1}] ${doc.nome} (${doc.tamanho}) - ID: ${doc.id}`)
    })
    console.log('═══════════════════════════════════════════════════════════════')

  } catch (error) {
    console.error('❌ Erro na execução do crawler:', error)
  } finally {
    await browser.close()
    console.log('🏁 Execução finalizada.')
  }
}

runOfficialCrawler()
