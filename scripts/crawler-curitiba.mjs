/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Avançado de Extração Profunda - Prefeitura de Curitiba (PMC / SYDLE ONE)
 * Com tempos de espera humanos e tolerância a lentidão de rede.
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

async function runDeepCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🤖 INICIANDO VARREDURA PROFUNDA - PREFEITURA DE CURITIBA (PMC)')
  console.log('═══════════════════════════════════════════════════════════════')

  const browser = await chromium.launch({
    headless: IS_HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  // Carregar sessão salva se existir
  const hasSavedSession = fs.existsSync(SESSION_FILE)
  let context

  if (hasSavedSession) {
    console.log('🔑 Carregando sessão autenticada existente...')
    try {
      context = await browser.newContext({
        storageState: SESSION_FILE,
        viewport: { width: 1440, height: 1000 },
      })
    } catch {
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    }
  } else {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  }

  const page = await context.newPage()

  try {
    console.log(`🌐 Acessando processo: ${TICKET_URL}`)
    await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 })
    
    console.log('⏳ Aguardando 5 segundos para estabilização de redirecionamentos...')
    await page.waitForTimeout(5000)

    const currentUrl = page.url()

    // ── FLUXO DE LOGIN NO e-Cidadão ──────────────────────────────────────────
    if (currentUrl.includes('autenticacao-ecidadao') || currentUrl.includes('/login')) {
      console.log('🔒 Tela de Login do e-Cidadão detectada!')

      if (!CPF || !SENHA) {
        console.error('❌ ERRO: CPF e SENHA precisam estar preenchidos no arquivo .env')
        return
      }

      console.log('⏳ 1. Aguardando botão "Entrar com CPF" aparecer na tela...')
      const btnCpfSelector = 'button:has-text("Entrar com CPF"), #btnEntrarCPF, a:has-text("Entrar com CPF")'
      await page.waitForSelector(btnCpfSelector, { state: 'visible', timeout: 30000 })
      
      console.log('👉 Clicando no botão "Entrar com CPF"...')
      await page.click(btnCpfSelector)
      await page.waitForTimeout(2000)

      console.log('⏳ 2. Aguardando campo de CPF (#documento) carregar...')
      await page.waitForSelector('#documento', { state: 'visible', timeout: 30000 })
      await page.waitForTimeout(1000)

      console.log('👉 Preenchendo CPF...')
      await page.fill('#documento', CPF)
      await page.waitForTimeout(1000)

      console.log('👉 Clicando em "Próxima"...')
      const btnProximoSelector = '#btnProximo, button:has-text("Próxima")'
      await page.waitForSelector(btnProximoSelector, { state: 'visible', timeout: 15000 })
      await page.click(btnProximoSelector)

      console.log('⏳ 3. Aguardando validação do CPF e tela de Senha carregar...')
      await page.waitForTimeout(3000)

      const senhaSelector = 'input[type="password"]:visible, #senha:visible, #password:visible, input[name="senha"]:visible'
      await page.waitForSelector(senhaSelector, { state: 'visible', timeout: 30000 })
      await page.waitForTimeout(1000)

      console.log('👉 Preenchendo Senha...')
      await page.fill(senhaSelector, SENHA)
      await page.waitForTimeout(1000)

      console.log('👉 Clicando em "Entrar"...')
      const submitBtnSelector = '#btnEntrar, #btnLogin, button[type="submit"]:visible, button:has-text("Entrar"):visible, button:has-text("Acessar"):visible'
      await page.click(submitBtnSelector)

      console.log('⏳ 4. Aguardando autenticação e redirecionamento de volta ao processo...')
      await page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)

      // Salvar cookies de sessão para reutilizar nas próximas vezes
      try {
        await context.storageState({ path: SESSION_FILE })
        console.log('💾 Sessão salva com sucesso em: scripts/session-curitiba.json')
      } catch { /* silence */ }
    }

    // Se ainda não estiver na URL do ticket, navega diretamente
    if (!page.url().includes('/t/')) {
      console.log('🔄 Acessando diretamente o link do ticket após autenticação...')
      await page.goto(TICKET_URL, { waitUntil: 'load', timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(6000)
    }

    console.log('⏳ Aguardando 10 segundos para todos os componentes SYDLE ONE renderizarem na tela...')
    await page.waitForTimeout(10000)

    // ── 1. Auto-Scroll pela página inteira ──────────────────────────────────
    console.log('📜 Executando auto-scroll suave para ativar lazy loading de todos os containers...')
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0
        const distance = 250
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight
          window.scrollBy(0, distance)
          totalHeight += distance
          if (totalHeight >= scrollHeight) {
            clearInterval(timer)
            resolve()
          }
        }, 200)
      })
    })
    await page.waitForTimeout(3000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(2000)

    // ── 2. Expandir todos os accordions e seções recolhidas ────────────────
    console.log('📂 Abrindo e expandindo abas, sanfonas e seções recolhidas...')
    await page.evaluate(() => {
      const expandButtons = Array.from(document.querySelectorAll('button, .sy-accordion-header, [aria-expanded="false"], .collapse-toggle, .chevron-down'))
      expandButtons.forEach(btn => {
        try {
          if (btn.getAttribute('aria-expanded') === 'false' || btn.classList.contains('collapsed')) {
            btn.click()
          }
        } catch { /* ignore */ }
      })
    })
    await page.waitForTimeout(3000)

    // ── 3. Localizar e Interagir com Botões "Visualizar" e "Atender" ────────
    console.log('🔍 Procurando botões interativos de "Visualizar", "Atender" e "Detalhes"...')

    const interactiveDetails = []

    const actionButtons = page.locator('button:has-text("Visualizar"), button:has-text("Atender"), button:has-text("Detalhes"), button:has-text("Ver mais"), a:has-text("Visualizar"), a:has-text("Atender")')
    const count = await actionButtons.count()
    console.log(`🎯 Encontrados ${count} botões de ação interativos!`)

    for (let i = 0; i < Math.min(count, 20); i++) {
      try {
        const btn = actionButtons.nth(i)
        if (await btn.isVisible()) {
          const btnText = (await btn.innerText()).trim()
          console.log(`👉 [${i + 1}/${count}] Clicando em "${btnText}"...`)

          await btn.scrollIntoViewIfNeeded()
          await page.waitForTimeout(500)
          await btn.click({ timeout: 5000 })
          await page.waitForTimeout(2500)

          // Extrair o conteúdo do modal/dialog
          const modalInfo = await page.evaluate(() => {
            const modal = document.querySelector('.modal, .sy-dialog, [role="dialog"], .dialog, .popup, .modal-content, .drawer, sy-dialog')
            if (modal) {
              return {
                tipo: 'modal',
                texto: modal.innerText.trim(),
              }
            }
            return null
          })

          if (modalInfo) {
            console.log(`   📄 Informação capturada (${modalInfo.texto.slice(0, 70)}...)`)
            interactiveDetails.push({
              botao: btnText,
              conteudo: modalInfo.texto,
            })

            // Fechar modal
            const closeBtn = page.locator('button[aria-label="Close"], .modal-close, .sy-dialog-close, button:has-text("Fechar"), button:has-text("Cancelar"), .close, [aria-label="Fechar"]').first()
            if (await closeBtn.isVisible()) {
              await closeBtn.click()
              await page.waitForTimeout(1000)
            } else {
              await page.keyboard.press('Escape')
              await page.waitForTimeout(1000)
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️ Botão ${i + 1} pulado: ${err.message}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    }

    // ── 4. Extração Completa e Estruturada do Processo ─────────────────────
    console.log('📊 Compilando todos os dados da página inteira...')

    const fullResult = await page.evaluate((interDetails) => {
      const pageTitle = document.title || ''
      const allText = document.body.innerText || ''
      const lines = allText.split('\n').map(l => l.trim()).filter(Boolean)

      // Extrair todas as tabelas
      const tabelas = Array.from(document.querySelectorAll('table')).map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim())
        const rows = Array.from(table.querySelectorAll('tbody tr, tr')).map(tr => {
          return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
        }).filter(r => r.length > 0)
        return { headers, rows }
      })

      // Classificar pendências e itens resolvidos
      const pendenciasNaoResolvidas = []
      const pendenciasResolvidas = []

      lines.forEach(line => {
        const lower = line.toLowerCase()
        if (lower.includes('pendente') || lower.includes('exigência') || lower.includes('aguardando') || lower.includes('não atendida') || lower.includes('rejeitado') || lower.includes('correção')) {
          pendenciasNaoResolvidas.push(line)
        } else if (lower.includes('atendido') || lower.includes('aprovado') || lower.includes('resolvido') || lower.includes('deferido') || lower.includes('concluído') || lower.includes('aceito')) {
          pendenciasResolvidas.push(line)
        }
      })

      return {
        tituloPagina: pageTitle,
        url: window.location.href,
        dataHoraVarredura: new Date().toISOString(),
        tabelasExtraidas: tabelas,
        detalhesBotoesClicados: interDetails,
        pendenciasNaoResolvidas: Array.from(new Set(pendenciasNaoResolvidas)),
        pendenciasResolvidas: Array.from(new Set(pendenciasResolvidas)),
        textoCompletoPagina: lines,
      }
    }, interactiveDetails)

    // Salvar Screenshot Completo
    const screenshotPath = 'scripts/curitiba-processo-completo.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Screenshot completo salvo em: ${screenshotPath}`)

    // Salvar JSON Completo
    const jsonPath = 'scripts/curitiba-processo-completo.json'
    fs.writeFileSync(jsonPath, JSON.stringify(fullResult, null, 2), 'utf-8')
    console.log(`💾 Relatório completo salvo em: ${jsonPath}`)

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('🎉 VARREDURA PROFUNDA FINALIZADA COM SUCESSO!')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`• Tabelas encontradas: ${fullResult.tabelasExtraidas.length}`)
    console.log(`• Modais/Botões inspecionados: ${fullResult.detalhesBotoesClicados.length}`)
    console.log(`• Pendências Não Resolvidas / Exigências: ${fullResult.pendenciasNaoResolvidas.length}`)
    console.log(`• Itens Resolvidos / Aprovados: ${fullResult.pendenciasResolvidas.length}`)
    console.log(`• Linhas de texto extraídas: ${fullResult.textoCompletoPagina.length}`)

  } catch (error) {
    console.error('❌ Erro na varredura profunda:', error)
    await page.screenshot({ path: 'scripts/curitiba-erro.png' }).catch(() => {})
  } finally {
    await browser.close()
    console.log('🏁 Crawler finalizado.')
  }
}

runDeepCrawler()
