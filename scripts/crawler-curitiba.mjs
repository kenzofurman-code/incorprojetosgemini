/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Oficial de Extração Profunda & Subdados - Prefeitura de Curitiba (PMC / SYDLE)
 *  - Extrai os Dados Principais do Processo
 *  - Interage e clica em CADA botão de "Visualizar", "Visualizar documento(s)" e "Atender"
 *  - Extrai os subdados dos formulários e modais
 *  - Gera relatório JSON consolidado completo e screenshots
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

async function runFullCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🏛️ ROBÔ PMC - EXTRAÇÃO PROFUNDA COM SUBDADOS & MODAIS')
  console.log('═══════════════════════════════════════════════════════════════')

  const browser = await chromium.launch({
    headless: IS_HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let context
  if (fs.existsSync(SESSION_FILE)) {
    console.log('🔑 Carregando sessão autenticada...')
    try {
      context = await browser.newContext({ storageState: SESSION_FILE, viewport: { width: 1440, height: 1000 } })
    } catch {
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    }
  } else {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  }

  const page = await context.newPage()

  // 1. Interceptar chamadas de API do SYDLE em background
  const apiResponses = {}
  page.on('response', async (res) => {
    const url = res.url()
    try {
      if (url.includes('showTicketInfo')) apiResponses.ticketInfo = await res.json()
      if (url.includes('getTicketComments')) apiResponses.comments = await res.json()
      if (url.includes('getCards')) apiResponses.cards = await res.json()
    } catch {}
  })

  try {
    console.log(`🌐 Acessando processo: ${TICKET_URL}`)
    await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(4000)

    // Se precisar autenticar
    if (page.url().includes('autenticacao-ecidadao') || page.url().includes('/login')) {
      console.log('🔒 Fazendo login no e-Cidadão...')

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
      } catch {}
    }

    if (!page.url().includes('/t/')) {
      await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)
    }

    console.log('⏳ Aguardando renderização completa da página do processo...')
    await page.waitForTimeout(8000)

    // Scroll completo para carregar toda a timeline
    console.log('📜 Rolando página inteira para carregar todos os cards de despachos...')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(3000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(2000)

    // ── 2. Clicar em cada botão marcado (Visualizar / Atender) ──────────────
    console.log('\n🎯 INICIANDO CLIQUE NOS BOTÕES DE SUBDADOS:')
    const cards = page.locator('sy-one-post-card, sy-one-user-task-card, [class*="post-card"], [class*="task-card"]')
    const totalCards = await cards.count()
    console.log(`📌 Encontrados ${totalCards} cards de despacho na timeline.`)

    const subdadosCapturados = []

    for (let i = 0; i < totalCards; i++) {
      try {
        const card = cards.nth(i)
        const btn = card.locator('button, a').first()
        
        if (await btn.isVisible().catch(() => false)) {
          const btnText = (await btn.innerText()).trim()
          if (btnText.includes('Visualizar') || btnText.includes('Atender') || btnText.includes('Detalhes')) {
            console.log(`👉 [Card ${i + 1}] Clicando no botão "${btnText}"...`)

            await btn.scrollIntoViewIfNeeded()
            await page.waitForTimeout(500)
            await btn.click({ force: true })
            await page.waitForTimeout(3000)

            // Extrair o que abriu na tela (sy-dialog, drawer ou popup)
            const modalContent = await page.evaluate(() => {
              const dialog = document.querySelector('sy-dialog[visible], sy-dialog, sy-sd-dialog-one-form, [role="dialog"]')
              if (dialog) {
                function getDeepText(node) {
                  let str = ''
                  if (!node) return str
                  if (node.shadowRoot) str += getDeepText(node.shadowRoot) + ' '
                  if (node.children) {
                    for (const child of node.children) {
                      str += getDeepText(child) + ' '
                    }
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
                const deepText = getDeepText(dialog).replace(/\s+/g, ' ').trim()
                return { text: deepText || dialog.innerText || '' }
              }
              return null
            })

            if (modalContent && modalContent.text) {
              console.log(`   ✅ Subdado capturado (${modalContent.text.slice(0, 90)}...)`)
              subdadosCapturados.push({
                cardIndice: i + 1,
                acao: btnText,
                detalhesTexto: modalContent.text,
              })
            }

            // Fechar o sy-dialog explicitamente
            const closeBtn = page.locator('sy-sd-dialog-one-form-header button, sy-dialog button, button[aria-label*="Fechar"], button:has-text("Fechar")').first()
            if (await closeBtn.isVisible().catch(() => false)) {
              await closeBtn.click({ force: true }).catch(() => {})
              await page.waitForTimeout(1000)
            } else {
              await page.keyboard.press('Escape')
              await page.waitForTimeout(1000)
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️ Card ${i + 1} pulado: ${err.message}`)
        await page.keyboard.press('Escape')
      }
    }

    // ── 3. Estruturação Final com Dados Primários + Subdados ─────────────────
    console.log('\n📊 Consolidando todos os dados do processo...')

    const rawComments = apiResponses.comments?.comments || []
    const historicoCompleto = []
    const pendencias = []
    const aprovacoes = []
    const anexos = []

    rawComments.forEach(comment => {
      const texto = (comment.text || '').replace(/\n\s*\n/g, '\n').trim()
      const dataCriacao = comment._creationDate || ''
      const autor = comment.user?.name || 'Prefeitura Municipal de Curitiba'
      const acao = comment.action ? comment.action.name : null

      if (Array.isArray(comment.attachments)) {
        comment.attachments.forEach(att => {
          anexos.push({
            nome: att.name,
            tamanho: `${Math.round(att.length / 1024)} KB`,
            id: att._id,
          })
        })
      }

      const item = {
        data: dataCriacao,
        orgao: autor,
        acaoDisponivel: acao,
        despacho: texto,
      }
      historicoCompleto.push(item)

      const lower = texto.toLowerCase()
      if (lower.includes('pendência') || lower.includes('aguardando resposta') || lower.includes('exigência')) {
        pendencias.push(item)
      } else if (lower.includes('deferido') || lower.includes('aprovado') || lower.includes('reconhecido')) {
        aprovacoes.push(item)
      }
    })

    const relatorioFinal = {
      portal: 'Prefeitura Municipal de Curitiba (PMC)',
      servico: 'Emitir Certificado de Conclusão de Obra (CVCO)',
      ticketUrl: TICKET_URL,
      dataExtracao: new Date().toISOString(),
      statusGeral: pendencias.length > 0 ? 'Com Exigência / Aguardando Solicitante' : 'Em Análise',
      resumoGeral: {
        totalDespachos: historicoCompleto.length,
        totalPendenciasAbertas: pendencias.length,
        totalItensAprovados: aprovacoes.length,
        totalSubdadosCapturadosNosBotoes: subdadosCapturados.length,
        totalArquivosPdfAnexados: anexos.length,
      },
      pendenciasNaoResolvidas: pendencias,
      itensAprovados: aprovacoes,
      subdadosExtraidosDosBotoes: subdadosCapturados,
      documentosEGuiasAnexadas: anexos,
      historicoCronologicoCompleto: historicoCompleto,
    }

    // Salvar JSON Oficial Completo
    const jsonPath = 'scripts/curitiba-dados-completos.json'
    fs.writeFileSync(jsonPath, JSON.stringify(relatorioFinal, null, 2), 'utf-8')
    console.log(`💾 JSON oficial completo salvo em: ${jsonPath}`)

    // Salvar Screenshot
    await page.screenshot({ path: 'scripts/curitiba-processo-completo.png', fullPage: true })

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('🎉 RELATÓRIO CONSOLIDADO FINAL:')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`• Status do Processo: ${relatorioFinal.statusGeral}`)
    console.log(`• Pendências em Aberto: ${relatorioFinal.resumoGeral.totalPendenciasAbertas}`)
    console.log(`• Subdados extraídos dos botões: ${relatorioFinal.resumoGeral.totalSubdadosCapturadosNosBotoes}`)
    console.log(`• Documentos PDF: ${relatorioFinal.resumoGeral.totalArquivosPdfAnexados}`)

  } catch (error) {
    console.error('❌ Erro durante o crawler:', error)
  } finally {
    await browser.close()
    console.log('🏁 Crawler finalizado.')
  }
}

runFullCrawler()
