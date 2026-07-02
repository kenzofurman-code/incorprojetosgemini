#!/usr/bin/env node
/**
 * setup.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Script de ajuda para configuração inicial do sync-sharepoint.
 * Executa com: node setup.mjs
 *
 * O que faz:
 *  1. Testa as credenciais do Azure AD (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET)
 *  2. Se SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY configurados, verifica acesso ao banco
 *  3. Lista os sites SharePoint disponíveis para encontrar o MS_SITE_ID correto
 *  4. Mostra o MS_DRIVE_ID padrão do site escolhido
 *  5. Gera um .env pronto pra copiar
 * ─────────────────────────────────────────────────────────────────────────
 */

import { ConfidentialClientApplication } from '@azure/msal-node'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

// ─── Carrega .env manual (sem dotenv) ─────────────────────────────────────
function loadEnv() {
  const envFile = existsSync('.env') ? '.env' : existsSync('.env.local') ? '.env.local' : null
  if (!envFile) {
    console.log('[setup] Nenhum arquivo .env encontrado. Usando variáveis de ambiente do sistema.')
    return
  }
  const lines = readFileSync(envFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && val && !process.env[key]) process.env[key] = val
  }
  console.log(`[setup] Carregou variáveis de ${envFile}`)
}

loadEnv()

const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

function ok(msg) { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.log(`  ✗ ${msg}`) }
function info(msg) { console.log(`  → ${msg}`) }
function section(title) { console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`) }

// ─── Testa Azure AD ───────────────────────────────────────────────────────
async function testAzureAD() {
  section('Azure AD / Microsoft Graph')

  if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) {
    fail('Credenciais do Azure AD não configuradas.')
    info('Configure MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET no .env')
    return null
  }

  info(`Tenant: ${MS_TENANT_ID}`)
  info(`Client ID: ${MS_CLIENT_ID}`)
  info(`Secret: ${MS_CLIENT_SECRET.slice(0, 4)}***`)

  try {
    const msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,
        clientSecret: MS_CLIENT_SECRET,
      },
    })
    const result = await msalApp.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    })
    if (!result?.accessToken) throw new Error('Token vazio')
    ok('Autenticação no Azure AD bem-sucedida')
    return result.accessToken
  } catch (err) {
    fail(`Falha na autenticação: ${err.message}`)
    info('Verifique se o App Registration foi criado corretamente no portal.azure.com')
    info('e se as permissões Sites.ReadWrite.All ou Files.ReadWrite.All foram concedidas')
    return null
  }
}

// ─── Lista sites SharePoint disponíveis ───────────────────────────────────
async function listSharePointSites(token) {
  section('Sites SharePoint disponíveis')

  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/sites?search=*&$select=id,name,displayName,webUrl', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const errText = await res.text()
      fail(`Falha ao listar sites: ${res.status} — ${errText}`)
      info('Isso pode ocorrer se a permissão Sites.ReadWrite.All não foi concedida')
      info('ou se o consentimento do administrador ainda não foi dado')
      return null
    }

    const data = await res.json()
    const sites = data.value || []

    if (sites.length === 0) {
      info('Nenhum site encontrado. Verifique as permissões do App Registration.')
      return null
    }

    console.log('\n  Sites encontrados:')
    for (const site of sites) {
      console.log(`\n    Nome:     ${site.displayName || site.name}`)
      console.log(`    URL:      ${site.webUrl}`)
      console.log(`    Site ID:  ${site.id}`)
      console.log(`    → Use este valor como MS_SITE_ID: ${site.id}`)
    }
    return sites
  } catch (err) {
    fail(`Erro ao listar sites: ${err.message}`)
    return null
  }
}

// ─── Busca o drive padrão de um site ──────────────────────────────────────
async function getSiteDrive(token, siteId) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive?$select=id,name,driveType,webUrl`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ─── Testa Supabase ───────────────────────────────────────────────────────
async function testSupabase() {
  section('Supabase')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail('SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configurados')
    info('Configure essas variáveis para que o sync consiga ler as pranchas aprovadas')
    return false
  }

  info(`URL: ${SUPABASE_URL}`)
  info(`Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.slice(0, 12)}***`)

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await supabase.from('projects').select('id, name, code').limit(5)
    if (error) throw error

    ok(`Conexão com Supabase OK`)
    if (data && data.length > 0) {
      console.log('\n  Projetos encontrados no banco:')
      for (const p of data) {
        console.log(`    [${p.code}] ${p.name}  →  SYNC_PROJECT_ID=${p.id}`)
      }
    } else {
      info('Nenhum projeto encontrado. Execute supabase/schema.sql primeiro.')
    }
    return true
  } catch (err) {
    fail(`Falha na conexão com Supabase: ${err.message}`)
    return false
  }
}

// ─── Gera .env pronto ─────────────────────────────────────────────────────
function printEnvTemplate(siteId, driveId, projectId) {
  section('Template .env gerado')
  console.log('\n  Copie o bloco abaixo para o seu .env (ou GitHub Secrets):\n')
  console.log('  ─────────────────────────────────────────────────────────')
  console.log(`  SUPABASE_URL=${SUPABASE_URL || '(preencher)'}`)
  console.log(`  SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY ? '(já configurado)' : '(preencher)'}`)
  console.log(`  MS_TENANT_ID=${MS_TENANT_ID || '(preencher)'}`)
  console.log(`  MS_CLIENT_ID=${MS_CLIENT_ID || '(preencher)'}`)
  console.log(`  MS_CLIENT_SECRET=(preencher — não exibido por segurança)`)
  if (siteId) console.log(`  MS_SITE_ID=${siteId}`)
  if (driveId) console.log(`  MS_DRIVE_ID=${driveId}`)
  if (projectId) console.log(`  SYNC_PROJECT_ID=${projectId}`)
  console.log(`  SYNC_ROOT_FOLDER=IncorProjetos`)
  console.log('  ─────────────────────────────────────────────────────────\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║      IncorProjetos — Setup: Sync SharePoint               ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')

  const supabaseOk = await testSupabase()
  const token = await testAzureAD()

  let firstSiteId = null
  let firstDriveId = null
  let projectId = null

  if (token) {
    const sites = await listSharePointSites(token)

    if (sites && sites.length > 0) {
      firstSiteId = sites[0].id
      section('Drive padrão do primeiro site')
      const drive = await getSiteDrive(token, firstSiteId)
      if (drive) {
        firstDriveId = drive.id
        ok(`Drive encontrado: "${drive.name}" (${drive.driveType})`)
        info(`Drive URL: ${drive.webUrl}`)
        info(`MS_DRIVE_ID: ${drive.id}`)
      }
    }
  }

  // Tenta pegar o primeiro project id do Supabase
  if (supabaseOk) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data } = await supabase.from('projects').select('id').limit(1).single()
      if (data) projectId = data.id
    } catch (_) { /* silencioso */ }
  }

  printEnvTemplate(firstSiteId, firstDriveId, projectId)

  section('Próximos passos')
  console.log(`
  1. Copie o template acima para .env e preencha os valores faltantes
  2. Rode um dry-run para verificar o que seria sincronizado:
       DRY_RUN=true npm run sync
  3. Se tudo parecer correto, rode sem dry-run:
       npm run sync
  4. Configure os mesmos valores como GitHub Secrets (Settings → Secrets)
     para que o GitHub Actions rode automaticamente 1x por dia
  `)
}

main().catch(err => {
  console.error('\n[setup] Erro fatal:', err.message)
  process.exit(1)
})
