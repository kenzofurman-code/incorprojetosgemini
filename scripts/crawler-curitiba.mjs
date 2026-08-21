/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Avançado de Extração Profunda - Prefeitura de Curitiba (PMC / SYDLE ONE)
 * Funcionalidades:
 *  1. Login Automatizado & Reutilização de Sessão (Cookies)
 *  2. Varredura da Página Inteira com Auto-Scroll e Carregamento Completo
 *  3. Abertura e Extração de todos os botões "Visualizar", "Atender" e "Detalhes"
 *  4. Separação de Pendências Resolvidas e Não Resolvidas
 *  5. Exportação em JSON Estruturado e Captura de Telas
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
    await page.goto(TICKET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(4000)

    // Se redirecionar para o login
    if (page.url().includes('autenticacao-ecidadao') || page.url().includes('/login')) {
      console.log('🔒 Realizando autenticação no portal e-Cidadão...')

      const btnCpf = page.locator('text="Entrar com CPF", #btnEntrarCPF').first()
      if (await btnCpf.isVisible()) {
        await btnCpf.click()
        await page.waitForTimeout(1500)
      }

      await page.waitForSelector('#documento', { timeout: 10000 })
      await page.fill('#documento', CPF)
      await page.waitForTimeout(500)

      const btnProximo = page.locator('#btnProximo, button:has-text("Próxima")').first()
      await btnProximo.click()
      await page.waitForTimeout(3000)

      const senhaLocator = page.locator('input[type="password"]:visible, #senha:visible, #password:visible, input[name="senha"]:visible').first()
      try {
        await senhaLocator.waitFor({ state: 'visible', timeout: 15000 })
        await senhaLocator.fill(SENHA)
      } catch {
        const anyInput = page.locator('input:visible:not(#documento)').first()
        await anyInput.fill(SENHA)
      }
      await page.waitForTimeout(500)

      const submitBtn = page.locator('#btnEntrar, #btnLogin, button[type="submit"]:visible, button:has-text("Entrar"):visible, button:has-text("Acessar"):visible').first()
      await submitBtn.click()

      console.log('⏳ Autenticando...')
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(6000)

      try {
        await context.storageState({ path: SESSION_FILE })
        console.log('💾 Sessão salva com sucesso!')
      } catch { /* silence */ }
    }

    if (!page.url().includes('/t/')) {
      await page.goto(TICKET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(6000)
    }

    console.log('⏳ Aguardando renderização completa da página do SYDLE...')
    await page.waitForTimeout(6000)

    // ── 1. Auto-Scroll pela página inteira para carregar todos os componentes ──
    console.log('📜 Executando auto-scroll para carregar toda a página...')
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0
        const distance = 300
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight
          window.scrollBy(0, distance)
          totalHeight += distance
          if (totalHeight >= scrollHeight) {
            clearInterval(timer)
            resolve()
          }
        }, 150)
      })
    })
    await page.waitForTimeout(2000)
    windowScrollTop: await page.evaluate(() => window.scrollTo(0, 0))

    // ── 2. Expandir todos os accordions e seções recolhidas ────────────────
    console.log('📂 Expandindo abas, sanfonas e seções recolhidas...')
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
    await page.waitForTimeout(2000)

    // ── 3. Localizar e Interagir com Botões "Visualizar" e "Atender" ────────
    console.log('🔍 Procurando botões de "Visualizar", "Atender" e "Detalhes"...')

    const interactiveDetails = []

    // Encontrar todos os botões que contêm texto de ação
    const actionButtons = page.locator('button:has-text("Visualizar"), button:has-text("Atender"), button:has-text("Detalhes"), button:has-text("Ver mais"), a:has-text("Visualizar"), a:has-text("Atender")')
    const count = await actionButtons.count()
    console.log(`🎯 Encontrados ${count} botões de ação interativos!`)

    for (let i = 0; i < Math.min(count, 15); i++) {
      try {
        const btn = actionButtons.nth(i)
        const btnText = (await btn.innerText()).trim()
        console.log(`👉 [${i + 1}/${count}] Clicando em "${btnText}"...`)

        await btn.scrollIntoViewIfNeeded()
        await btn.click({ timeout: 4000 })
        await page.waitForTimeout(2000)

        // Extrair o conteúdo do modal/dialog ou do popup que abriu
        const modalInfo = await page.evaluate(() => {
          const modal = document.querySelector('.modal, .sy-dialog, [role="dialog"], .dialog, .popup, .modal-content, .drawer')
          if (modal) {
            return {
              tipo: 'modal',
              texto: modal.innerText.trim(),
            }
          }
          return null
        })

        if (modalInfo) {
          console.log(`   📄 Detalhe capturado (${modalInfo.texto.slice(0, 80)}...)`)
          interactiveDetails.push({
            botao: btnText,
            conteudo: modalInfo.texto,
          })

          // Fechar o modal
          const closeBtn = page.locator('button[aria-label="Close"], .modal-close, .sy-dialog-close, button:has-text("Fechar"), button:has-text("Cancelar"), .close').first()
          if (await closeBtn.isVisible()) {
            await closeBtn.click()
            await page.waitForTimeout(1000)
          } else {
            // Tentar fechar com tecla Escape
            await page.keyboard.press('Escape')
            await page.waitForTimeout(1000)
          }
        }
      } catch (err) {
        console.log(`   ⚠️ Não foi possível abrir o botão ${i + 1}: ${err.message}`)
        await page.keyboard.press('Escape')
      }
    }

    // ── 4. Extração Completa e Estruturada do Processo ─────────────────────
    console.log('📊 Compilando todos os dados da página...')

    const fullResult = await page.evaluate((interDetails) => {
      const pageTitle = document.title || ''
      const allText = document.body.innerText || ''
      const lines = allText.split('\n').map(l => l.trim()).filter(Boolean)

      // Identificar tabelas e campos
      const tabelas = Array.from(document.querySelectorAll('table')).map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim())
        const rows = Array.from(table.querySelectorAll('tbody tr, tr')).map(tr => {
          return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
        }).filter(r => r.length > 0)
        return { headers, rows }
      })

      // Identificar timeline / histórico de movimentações
      const timelineItems = Array.from(document.querySelectorAll('.timeline-item, .history-item, .activity-item, [class*="timeline"], [class*="history"]')).map(item => item.innerText.trim())

      // Classificar pendências
      const pendenciasNaoResolvidas = []
      const pendenciasResolvidas = []

      lines.forEach(line => {
        const lower = line.toLowerCase()
        if (lower.includes('pendente') || lower.includes('exigência') || lower.includes('aguardando') || lower.includes('não atendida') || lower.includes('rejeitado')) {
          pendenciasNaoResolvidas.push(line)
        } else if (lower.includes('atendido') || lower.includes('aprovado') || lower.includes('resolvido') || lower.includes('deferido') || lower.includes('concluído')) {
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
        timelineHistorico: timelineItems,
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
    console.log('🎉 RESUMO DA EXTRAÇÃO PROFUNDA:')
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
    console.log('🏁 Varredura finalizada.')
  }
}

runDeepCrawler()
