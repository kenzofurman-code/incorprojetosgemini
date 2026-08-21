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
      const btnCpf = page.locator('text="Entrar com CPF", #btnEntrarCPF').first()
      if (await btnCpf.isVisible()) {
        await btnCpf.click()
        await page.waitForTimeout(1500)
      }

      console.log('👉 2. Preenchendo CPF...')
      await page.waitForSelector('#documento', { timeout: 10000 })
      await page.fill('#documento', CPF)
      await page.waitForTimeout(500)

      console.log('👉 3. Clicando em "Próxima"...')
      const btnProximo = page.locator('#btnProximo, button:has-text("Próxima")').first()
      await btnProximo.click()
      await page.waitForTimeout(3000)

      console.log('👉 4. Preenchendo Senha...')
      // Aguarda campo de senha visível na tela (evita campos ocultos como campoAplicacao)
      const senhaLocator = page.locator('input[type="password"]:visible, #senha:visible, #password:visible, input[name="senha"]:visible').first()
      
      try {
        await senhaLocator.waitFor({ state: 'visible', timeout: 15000 })
        await senhaLocator.fill(SENHA)
      } catch (err) {
        console.log('⚠️ Tentando seletor alternativo de senha...')
        // Procura qualquer input visível que não seja o documento
        const anyInput = page.locator('input:visible:not(#documento)').first()
        await anyInput.fill(SENHA)
      }

      await page.waitForTimeout(500)

      console.log('👉 5. Clicando em "Entrar"...')
      const submitBtn = page.locator('#btnEntrar, #btnLogin, button[type="submit"]:visible, button:has-text("Entrar"):visible, button:has-text("Acessar"):visible').first()
      await submitBtn.click()

      console.log('⏳ Aguardando autenticação e redirecionamento de volta ao processo...')
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(5000)

      // Salvar cookies de sessão para as próximas execuções
      try {
        await context.storageState({ path: SESSION_FILE })
        console.log('💾 Sessão de login salva com sucesso em: scripts/session-curitiba.json')
      } catch { /* silence */ }
    }

    // Garantir que estamos na página do ticket
    if (!page.url().includes('/t/')) {
      console.log('🔄 Navegando diretamente para a URL do ticket...')
      await page.goto(TICKET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(5000)
    }

    console.log('⏳ Aguardando renderização completa dos componentes SYDLE...')
    await page.waitForTimeout(7000)

    // Capturar Screenshot do Resultado
    const resultScreenshot = 'scripts/curitiba-processo-resultado.png'
    await page.screenshot({ path: resultScreenshot, fullPage: true })
    console.log(`📸 Screenshot completo do processo salvo em: ${resultScreenshot}`)

    // ── Extração de Dados ──────────────────────────────────────────────────
    const extractedData = await page.evaluate(() => {
      const pageTitle = document.title || ''
      const bodyText = document.body.innerText || ''

      const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean)

      // Buscar status
      const statusKeywords = ['Em Análise', 'Com Exigência', 'Aprovado', 'Concluído', 'Indeferido', 'Aguardando Vistoria', 'Em Tramitação', 'Em Andamento']
      let detectedStatus = 'Em Tramitação'
      for (const kw of statusKeywords) {
        if (bodyText.toLowerCase().includes(kw.toLowerCase())) {
          detectedStatus = kw
          break
        }
      }

      // Buscar datas
      const dateMatches = bodyText.match(/\d{2}\/\d{2}\/\d{4}/g) || []

      return {
        titulo: pageTitle,
        url: window.location.href,
        statusDetectado: detectedStatus,
        datasEncontradas: Array.from(new Set(dateMatches)).slice(0, 8),
        conteudoExtraido: lines.slice(0, 40),
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
