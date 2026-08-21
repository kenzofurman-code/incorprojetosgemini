/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Oficial de Extração Profunda de Ações, Subdados, PDFs e Fotos - Curitiba (PMC)
 *  1. Identifica todas as "Ações Disponíveis" (Visualizar, Visualizar documento(s), Atender)
 *  2. Clica em cada ação diretamente na timeline
 *  3. Extrai o conteúdo integral do modal:
 *     - Textos completos de pareceres e exigências
 *     - Lista de PDFs, Pranchas e Documentos com Links de Download
 *     - Fotos e Imagens anexadas
 *  4. Salva tudo consolidado no JSON oficial
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

async function runDeepActionCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🏛️ ROBÔ PMC - EXTRAÇÃO COMPLETA DE AÇÕES, PDFS E FOTOS')
  console.log('═══════════════════════════════════════════════════════════════')

  const browser = await chromium.launch({
    headless: IS_HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let context
  if (fs.existsSync(SESSION_FILE)) {
    console.log('🔑 Carregando sessão de login...')
    try {
      context = await browser.newContext({ storageState: SESSION_FILE, viewport: { width: 1440, height: 1000 } })
    } catch {
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    }
  } else {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  }

  const page = await context.newPage()

  // Interceptar respostas de API
  const apiResponses = { files: [] }
  page.on('response', async (res) => {
    const url = res.url()
    try {
      if (url.includes('showTicketInfo')) apiResponses.ticketInfo = await res.json()
      if (url.includes('getTicketComments')) apiResponses.comments = await res.json()
      if (url.includes('getCards')) apiResponses.cards = await res.json()
      if (url.includes('getFile') || url.includes('/assets/')) {
        apiResponses.files.push(url)
      }
    } catch {}
  })

  try {
    console.log(`🌐 Acessando processo: ${TICKET_URL}`)
    await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(4000)

    // Se redirecionar para o login
    if (page.url().includes('autenticacao-ecidadao') || page.url().includes('/login')) {
      console.log('🔒 Autenticando no e-Cidadão...')

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
      await page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)

      try {
        await context.storageState({ path: SESSION_FILE })
      } catch {}
    }

    if (!page.url().includes('/t/')) {
      await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)
    }

    console.log('⏳ Carregando dados e timeline do SYDLE ONE...')
    await page.waitForTimeout(8000)

    // Scroll para renderizar todos os cards
    console.log('📜 Rolando página inteira para expandir timeline...')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(3000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(2000)

    // ── 1. Extrair os dados da API de comentários e ações ────────────────────
    const rawComments = apiResponses.comments?.comments || []
    console.log(`📌 Identificados ${rawComments.length} despachos oficiais na timeline.`)

    // Encontrar cards com botões de ação na tela
    const actionButtons = page.locator('sy-one-post-card button, sy-one-user-task-card button, [class*="post-card"] button, [class*="task-card"] button, button:has-text("Visualizar"), button:has-text("Atender")')
    const totalButtons = await actionButtons.count()
    console.log(`🎯 Encontrados ${totalButtons} botões de Ação na interface.`)

    const subdadosAcoes = []

    // ── 2. Clicar em cada Ação Disponível para Extrair os Dados Internos ──────
    for (let i = 0; i < totalButtons; i++) {
      try {
        const btn = actionButtons.nth(i)
        if (await btn.isVisible().catch(() => false)) {
          const btnText = (await btn.innerText()).trim()
          console.log(`\n👉 [Ação ${i + 1}/${totalButtons}] Clicando em "${btnText}"...`)

          await btn.scrollIntoViewIfNeeded()
          await page.waitForTimeout(500)
          await btn.click({ force: true })
          await page.waitForTimeout(3000)

          // Extrair tudo de dentro do modal que abriu (Textos, PDFs e Imagens)
          const modalData = await page.evaluate(() => {
            const dialog = document.querySelector('sy-dialog[visible], sy-dialog, sy-sd-dialog-one-form, [role="dialog"]')
            if (!dialog) return null

            // Extrair texto profundo
            function getDeepText(node) {
              let str = ''
              if (!node) return str
              if (node.shadowRoot) str += getDeepText(node.shadowRoot) + ' '
              if (node.children) {
                for (const child of node.children) str += getDeepText(child) + ' '
              }
              if (node.childNodes) {
                for (const n of node.childNodes) {
                  if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
                    str += n.textContent.trim() + ' '
                  }
                }
              }
              return str
            }

            const fullText = getDeepText(dialog).replace(/\s+/g, ' ').trim()

            // Extrair links de PDFs e Documentos
            const links = Array.from(dialog.querySelectorAll('a[href], [download]')).map(a => ({
              texto: a.innerText.trim(),
              href: a.href,
              download: a.getAttribute('download') || '',
            })).filter(l => l.href)

            // Extrair imagens / fotos
            const imagens = Array.from(dialog.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt || '',
            })).filter(img => img.src && !img.src.includes('data:image/svg'))

            return {
              texto: fullText,
              documentosEncontrados: links,
              imagensEncontradas: imagens,
            }
          })

          if (modalData && modalData.texto) {
            console.log(`   📄 Texto capturado: ${modalData.texto.slice(0, 100)}...`)
            if (modalData.documentosEncontrados.length > 0) {
              console.log(`   📎 ${modalData.documentosEncontrados.length} documento(s) / PDF(s) encontrados no modal!`)
            }
            if (modalData.imagensEncontradas.length > 0) {
              console.log(`   🖼️ ${modalData.imagensEncontradas.length} imagem(ns) encontrada(s)!`)
            }

            subdadosAcoes.push({
              indice: i + 1,
              acaoNome: btnText,
              conteudo: modalData.texto,
              documentos: modalData.documentosEncontrados,
              imagens: modalData.imagensEncontradas,
            })
          }

          // Fechar modal
          const closeBtn = page.locator('sy-sd-dialog-one-form-header button, sy-dialog button, button:has-text("Fechar")').first()
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click({ force: true }).catch(() => {})
            await page.waitForTimeout(1000)
          } else {
            await page.keyboard.press('Escape')
            await page.waitForTimeout(1000)
          }
        }
      } catch (err) {
        console.log(`   ⚠️ Ação ${i + 1} pulada: ${err.message}`)
        await page.keyboard.press('Escape')
      }
    }

    // ── 3. Montar Relatório Consolidado Completo ──────────────────────────────
    console.log('\n📊 Consolidando todos os dados, anexos, pareceres e subdados...')

    const anexosGerais = []
    const historico = []
    const pendencias = []
    const deferidos = []

    rawComments.forEach((comment, idx) => {
      const texto = (comment.text || '').replace(/\n\s*\n/g, '\n').trim()
      const dataCriacao = comment._creationDate || ''
      const autor = comment.user?.name || 'Prefeitura Municipal de Curitiba'
      const acaoNome = comment.action ? comment.action.name : null

      // Anexos de PDF na raiz do comentário
      const attachments = []
      if (Array.isArray(comment.attachments)) {
        comment.attachments.forEach(att => {
          const downloadUrl = `https://servicodigital.curitiba.pr.gov.br/api/1/servicedesk-embedded/_classId/00000000000000000000000f/_get/${att._id}`
          const itemDoc = {
            nome: att.name,
            tamanho: `${Math.round(att.length / 1024)} KB`,
            tipo: att.contentType,
            id: att._id,
            urlDownload: downloadUrl,
          }
          attachments.push(itemDoc)
          anexosGerais.push(itemDoc)
        })
      }

      // Procurar se capturamos subdados para essa ação
      const subdadosDestaAcao = subdadosAcoes.filter(s => s.acaoNome === acaoNome)

      const itemHistorico = {
        indice: idx + 1,
        data: dataCriacao,
        orgao: autor,
        acaoDisponivel: acaoNome,
        despacho: texto,
        anexosDocumentos: attachments,
        detalhesSubdadosDaAcao: subdadosDestaAcao.length > 0 ? subdadosDestaAcao[0] : null,
      }

      historico.push(itemHistorico)

      const lower = texto.toLowerCase()
      if (lower.includes('pendência') || lower.includes('aguardando resposta') || lower.includes('exigência')) {
        pendencias.push(itemHistorico)
      } else if (lower.includes('deferido') || lower.includes('aprovado') || lower.includes('reconhecido')) {
        deferidos.push(itemHistorico)
      }
    })

    const relatorioFinal = {
      portal: 'Prefeitura Municipal de Curitiba (PMC) • Serviços Digitais',
      servico: 'Emitir Certificado de Conclusão de Obra (CVCO)',
      ticketUrl: TICKET_URL,
      dataConsulta: new Date().toISOString(),
      statusGeral: pendencias.length > 0 ? 'Com Exigência / Aguardando Resposta' : 'Em Análise / Tramitação',
      resumoGeral: {
        totalDespachos: historico.length,
        totalPendenciasAbertas: pendencias.length,
        totalItensDeferidos: deferidos.length,
        totalAcoesComSubdadosCapturados: subdadosAcoes.length,
        totalDocumentosPdfAnexados: anexosGerais.length,
      },
      pendenciasNaoResolvidas: pendencias,
      itensDeferidosEAprovados: deferidos,
      documentosEGuiasAnexadas: anexosGerais,
      historicoCompletoDeMovimentacoes: historico,
    }

    // Salvar JSON Oficial Completo
    const jsonPath = 'scripts/curitiba-dados-completos.json'
    fs.writeFileSync(jsonPath, JSON.stringify(relatorioFinal, null, 2), 'utf-8')
    console.log(`💾 JSON oficial completo salvo em: ${jsonPath}`)

    // Salvar Screenshot
    await page.screenshot({ path: 'scripts/curitiba-processo-completo.png', fullPage: true })

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('🎉 RESULTADO DA EXTRAÇÃO:')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`• Status: ${relatorioFinal.statusGeral}`)
    console.log(`• Pendências em Aberto: ${relatorioFinal.resumoGeral.totalPendenciasAbertas}`)
    console.log(`• Subdados de Ações extraídos: ${relatorioFinal.resumoGeral.totalAcoesComSubdadosCapturados}`)
    console.log(`• Documentos PDF com links: ${relatorioFinal.resumoGeral.totalDocumentosPdfAnexados}`)

  } catch (error) {
    console.error('❌ Erro durante a execução:', error)
  } finally {
    await browser.close()
    console.log('🏁 Crawler finalizado.')
  }
}

runDeepActionCrawler()
