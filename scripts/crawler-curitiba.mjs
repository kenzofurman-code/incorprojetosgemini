/**
 * scripts/crawler-curitiba.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Robô Autônomo de Extração de Protocolos - Prefeitura Municipal de Curitiba (PMC)
 * Funcionalidades:
 *  1. Autenticação automatizada no Portal e-Cidadão (CPF + Senha)
 *  2. Persistência de Sessão (storageState / cookies) para não precisar logar toda vez
 *  3. Acesso e extração profunda do ticket SYDLE ONE (CVCO, Alvarás, etc.)
 *  4. Captura de Screenshot e Exportação dos Despachos em JSON estruturado
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

// Função auxiliar para carregar variáveis do .env
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

async function runCrawler() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🤖 INICIANDO CRAWLER DE PROTOCOLOS - PREFEITURA DE CURITIBA')
  console.log('═══════════════════════════════════════════════════════════════')

  if (!CPF || !SENHA) {
    console.log('⚠️ AVISO: CPF ou SENHA não preenchidos no arquivo .env')
    console.log('👉 Abra o arquivo .env e preencha as variáveis:')
    console.log('   CURITIBA_CPF="seu_cpf"')
    console.log('   CURITIBA_SENHA="sua_senha"')
    console.log('───────────────────────────────────────────────────────────────')
  }

  console.log(`🌐 Alvo: ${TICKET_URL}`)
  console.log(`🖥️ Modo Headless: ${IS_HEADLESS ? 'Sim (Invisível)' : 'Não (Janela visível na tela)'}`)

  const browser = await chromium.launch({
    headless: IS_HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  // Verificar se existe sessão salva
  const hasSavedSession = fs.existsSync(SESSION_FILE)
  let context

  if (hasSavedSession) {
    console.log('🔑 Carregando sessão de login salva anteriormente...')
    try {
      context = await browser.newContext({
        storageState: SESSION_FILE,
        viewport: { width: 1280, height: 900 },
      })
    } catch {
      context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    }
  } else {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  }

  const page = await context.newPage()

  try {
    console.log('⏳ Acessando página do processo...')
    await page.goto(TICKET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(4000)

    const currentUrl = page.url()

    // Se redirecionou para o login do e-Cidadão
    if (currentUrl.includes('autenticacao-ecidadao') || currentUrl.includes('/login')) {
      console.log('🔒 Redirecionado para o portal de autenticação e-Cidadão...')

      if (!CPF || !SENHA) {
        console.error('❌ Não é possível fazer login automático sem CPF e SENHA no .env')
        await page.screenshot({ path: 'scripts/curitiba-tela-login.png' })
        console.log('📸 Screenshot da tela de login salvo em: scripts/curitiba-tela-login.png')
        return
      }

      console.log('👉 1. Clicando em "Entrar com CPF"...')
      await page.click('text="Entrar com CPF"', { timeout: 10000 })
      await page.waitForTimeout(2000)

      console.log('👉 2. Preenchendo CPF...')
      await page.fill('#documento', CPF)
      await page.waitForTimeout(500)

      console.log('👉 3. Clicando em "Próxima"...')
      await page.click('text="Próxima"')
      await page.waitForTimeout(3000)

      // Procurar campo de senha
      console.log('👉 4. Preenchendo Senha...')
      const senhaSelector = 'input[type="password"], #senha, #password, input[name="senha"]'
      await page.waitForSelector(senhaSelector, { timeout: 15000 })
      await page.fill(senhaSelector, SENHA)
      await page.waitForTimeout(500)

      console.log('👉 5. Clicando em "Entrar"...')
      const submitBtn = 'button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")'
      await page.click(submitBtn)

      console.log('⏳ Aguardando autenticação e redirecionamento de volta ao processo...')
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(5000)

      // Salvar cookies de sessão para as próximas execuções
      await context.storageState({ path: SESSION_FILE })
      console.log('💾 Sessão de login salva com sucesso em: scripts/session-curitiba.json')
    }

    // Garantir que estamos na página do ticket
    if (!page.url().includes('/t/')) {
      console.log('🔄 Navegando diretamente para a URL do ticket...')
      await page.goto(TICKET_URL, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(5000)
    }

    console.log('⏳ Aguardando renderização completa dos componentes SYDLE...')
    await page.waitForTimeout(6000)

    // Capturar Screenshot do Resultado
    const resultScreenshot = 'scripts/curitiba-processo-resultado.png'
    await page.screenshot({ path: resultScreenshot, fullPage: true })
    console.log(`📸 Screenshot completo do processo salvo em: ${resultScreenshot}`)

    // ── Extração de Dados ──────────────────────────────────────────────────
    const extractedData = await page.evaluate(() => {
      const pageTitle = document.title || ''
      const bodyText = document.body.innerText || ''

      // Extrair linhas de texto relevantes
      const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean)

      // Buscar status
      const statusKeywords = ['Em Análise', 'Com Exigência', 'Aprovado', 'Concluído', 'Indeferido', 'Aguardando', 'Em Tramitação']
      let detectedStatus = 'Em Análise'
      for (const kw of statusKeywords) {
        if (bodyText.toLowerCase().includes(kw.toLowerCase())) {
          detectedStatus = kw
          break
        }
      }

      // Buscar números de protocolo ou datas
      const dateMatches = bodyText.match(/\d{2}\/\d{2}\/\d{4}/g) || []

      return {
        titulo: pageTitle,
        url: window.location.href,
        statusDetectado: detectedStatus,
        datasEncontradas: dateMatches.slice(0, 5),
        resumoTexto: lines.slice(0, 30),
        dataHoraConsulta: new Date().toISOString(),
      }
    })

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('📊 DADOS EXTRAÍDOS COM SUCESSO DO PORTAL DE CURITIBA:')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(JSON.stringify(extractedData, null, 2))

    // Salvar JSON do resultado
    fs.writeFileSync('scripts/curitiba-resultado.json', JSON.stringify(extractedData, null, 2), 'utf-8')
    console.log('💾 Arquivo JSON salvo em: scripts/curitiba-resultado.json')

  } catch (error) {
    console.error('❌ Erro durante a execução do crawler:', error)
    await page.screenshot({ path: 'scripts/curitiba-erro.png' }).catch(() => {})
  } finally {
    await browser.close()
    console.log('🏁 Crawler finalizado.')
  }
}

runCrawler()
