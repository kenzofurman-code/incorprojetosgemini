/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Oficial PMC - Extração dos Subdados, PDFs e Fotos
 * Clica em cada ação (.sy-sd-action-container sy-button), extrai o modal e fecha
 * com garantia de liberação da tela.
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

async function runMainCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🏛️ ROBÔ PMC - EXTRAÇÃO COMPLETA DE AÇÕES, PDFS E SUBDADOS')
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

    // Se redirecionar para autenticação
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

    console.log('⏳ Carregando dados da tela da PMC...')
    await page.waitForTimeout(8000)

    // Scroll completo
    console.log('📜 Rolando página inteira para carregar todas as ações...')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(3000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(2000)

    // ── 1. Localizar Botões de Ação Específicos (.sy-sd-action-container) ─────
    const actionButtons = page.locator('.sy-sd-action-container sy-button, sy-button.sy-sd-action-button')
    const totalButtons = await actionButtons.count()
    console.log(`🎯 Encontrados ${totalButtons} botões de Ação na página!`)

    const subdadosAcoes = []

    // ── 2. Clicar em cada botão individualmente com ritmo calmo e seguro ────
    for (let i = 0; i < totalButtons; i++) {
      try {
        const btn = actionButtons.nth(i)
        const btnText = (await btn.innerText()).trim()
        console.log(`\n═══════════════════════════════════════════════════════════════`)
        console.log(`👉 [${i + 1}/${totalButtons}] Iniciando Ação: "${btnText}"...`)
        console.log(`═══════════════════════════════════════════════════════════════`)

        // 1. Rolar suavemente até o botão e aguardar estabilizar
        await btn.scrollIntoViewIfNeeded()
        await page.waitForTimeout(1500)

        // 2. Clicar no botão da ação
        console.log('   🖱️ Clicando no botão...')
        await btn.click({ force: true })

        // 3. Aguardar o modal/diálogo abrir e renderizar completamente
        console.log('   ⏳ Aguardando 5 segundos para o formulário carregar...')
        await page.waitForTimeout(5000)

        // 4. Extrair texto, links de PDFs e imagens do diálogo
        const dialogData = await page.evaluate(() => {
          const dialog = document.querySelector('sy-dialog, sy-sd-dialog-one-form')
          if (!dialog) return null

          function extractAll(root) {
            let str = ''
            let links = []
            let imgs = []

            if (!root) return { str, links, imgs }

            if (root.shadowRoot) {
              const res = extractAll(root.shadowRoot)
              str += res.str + ' '
              links.push(...res.links)
              imgs.push(...res.imgs)
            }

            const children = root.children ? Array.from(root.children) : []
            children.forEach(c => {
              const res = extractAll(c)
              str += res.str + ' '
              links.push(...res.links)
              imgs.push(...res.imgs)

              if (c.tagName === 'A' && c.href) links.push({ texto: c.innerText.trim(), url: c.href })
              if (c.tagName === 'IMG' && c.src && !c.src.includes('data:image/svg')) imgs.push({ src: c.src, alt: c.alt || '' })
            })

            if (root.childNodes) {
              for (const n of root.childNodes) {
                if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
                  str += n.textContent.trim() + '\n'
                }
              }
            }

            return { str, links, imgs }
          }

          return extractAll(dialog)
        })

        if (dialogData && dialogData.str.trim()) {
          console.log(`   📄 Subdado capturado (${dialogData.str.slice(0, 90).replace(/\n/g, ' ')}...)`)
          if (dialogData.links.length > 0) {
            console.log(`   📎 ${dialogData.links.length} arquivo(s)/link(s) encontrados no formulário.`)
          }
          subdadosAcoes.push({
            indice: i + 1,
            acaoNome: btnText,
            conteudoTexto: dialogData.str.trim(),
            linksDocumentos: dialogData.links,
            imagensFotos: dialogData.imgs,
          })
        }

        // 5. Fechar o diálogo com calma e aguardar desobstrução da tela
        console.log('   🚪 Fechando modal e liberando a tela...')
        
        // Tentar fechar pelo botão oficial de fechar
        const closeBtn = page.locator('sy-sd-dialog-one-form-header sy-button, sy-dialog sy-button, button:has-text("Fechar"), .sy-dialog-close').first()
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click({ force: true }).catch(() => {})
        } else {
          await page.keyboard.press('Escape')
        }

        // Limpeza de segurança para garantir que nenhum backdrop residual intercepte o próximo clique
        await page.waitForTimeout(2000)
        await page.evaluate(() => {
          const dialogs = document.querySelectorAll('sy-dialog, .sy-dialog, sy-sd-dialog-one-form')
          dialogs.forEach(d => {
            try { d.remove() } catch {}
          })
        })

        // Pausa de 3 segundos antes de iniciar o próximo botão
        console.log('   ⏸️ Pausa de 3 segundos para estabilização...')
        await page.waitForTimeout(3000)

      } catch (err) {
        console.log(`   ⚠️ Erro na ação ${i + 1}: ${err.message}`)
        await page.evaluate(() => {
          document.querySelectorAll('sy-dialog, sy-sd-dialog-one-form').forEach(d => {
            try { d.remove() } catch {}
          })
        }).catch(() => {})
        await page.waitForTimeout(3000)
      }
    }

    // ── 3. Montar Relatório Consolidado Completo ──────────────────────────────
    console.log('\n📊 Consolidando todos os dados, anexos, pareceres e subdados...')

    const rawComments = apiResponses.comments?.comments || []
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

      // Subdado correspondente
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
      subdadosExtraidosDosBotoes: subdadosAcoes,
      documentosEGuiasAnexadas: anexosGerais,
      historicoCompletoDeMovimentacoes: historico,
    }

    // Salvar JSON Oficial Completo
    const jsonPath = 'scripts/curitiba-dados-completos.json'
    fs.writeFileSync(jsonPath, JSON.stringify(relatorioFinal, null, 2), 'utf-8')
    console.log(`\n💾 JSON oficial completo salvo em: ${jsonPath}`)

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

runMainCrawler()
