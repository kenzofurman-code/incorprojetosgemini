#!/usr/bin/env node
/**
 * sync.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Sincroniza diariamente a ÚLTIMA VERSÃO APROVADA de cada prancha do
 * IncorProjetos (Supabase) para uma biblioteca de documentos do SharePoint
 * (ou OneDrive — ambos usam o mesmo Microsoft Graph "drive" endpoint).
 *
 * Estrutura espelhada no SharePoint:
 *   /IncorProjetos/<Projeto>/<Disciplina>/<Pavimento>/<codigo-da-prancha>.pdf
 *
 * Cada execução SOBRESCREVE o arquivo (não acumula histórico — o histórico
 * de revisões continua vivendo só no Supabase). O objetivo aqui é só dar
 * para o time de obra e projetistas terceirizados um lugar familiar (que já
 * usam no dia a dia) para consultar a versão mais recente, sem precisar
 * logar no app.
 *
 * Variáveis de ambiente necessárias (ver .env.example neste mesmo diretório):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   -> acesso de leitura ao banco
 *   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET -> app registration no Azure AD
 *   MS_SITE_ID  (ou MS_DRIVE_ID)              -> onde no SharePoint gravar
 *   SYNC_PROJECT_ID                            -> qual projeto sincronizar
 * ─────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { ConfidentialClientApplication } from '@azure/msal-node'

// ─── Config / env ─────────────────────────────────────────────────────────
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MS_TENANT_ID,
  MS_CLIENT_ID,
  MS_CLIENT_SECRET,
  MS_SITE_ID,
  MS_DRIVE_ID,
  SYNC_PROJECT_ID,
  SYNC_ROOT_FOLDER = 'IncorProjetos',
  DRAWINGS_BUCKET = 'drawings',
  DRY_RUN = 'false',
} = process.env

const isDryRun = DRY_RUN === 'true'
function requireEnv(name, value) {
  if (!value) {
    console.error(`[sync] ERRO: variável de ambiente ${name} não configurada.`)
    process.exit(1)
  }
  return value
}

requireEnv('SUPABASE_URL', SUPABASE_URL)
requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)
requireEnv('MS_TENANT_ID', MS_TENANT_ID)
requireEnv('MS_CLIENT_ID', MS_CLIENT_ID)
requireEnv('MS_CLIENT_SECRET', MS_CLIENT_SECRET)
requireEnv('SYNC_PROJECT_ID', SYNC_PROJECT_ID)

if (!MS_SITE_ID && !MS_DRIVE_ID) {
  console.error('[sync] ERRO: configure MS_SITE_ID (SharePoint) ou MS_DRIVE_ID (OneDrive).')
  process.exit(1)
}

// ─── Supabase client (service role -> ignora RLS, só leitura aqui) ───────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─── Microsoft Graph auth (client credentials flow — sem usuário logado) ─
const msalApp = new ConfidentialClientApplication({
  auth: {
    clientId: MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,
    clientSecret: MS_CLIENT_SECRET,
  },
})

async function getGraphToken() {
  const result = await msalApp.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })
  if (!result?.accessToken) {
    throw new Error('Falha ao obter token do Microsoft Graph. Verifique as credenciais do app registration.')
  }
  return result.accessToken
}

// ─── Resolve qual "drive" do Graph usar (SharePoint site ou OneDrive) ────
async function resolveDriveId(token) {
  if (MS_DRIVE_ID) return MS_DRIVE_ID

  // MS_SITE_ID foi informado -> pega o drive padrão (biblioteca "Documentos") do site
  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${MS_SITE_ID}/drive`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Falha ao resolver drive do site ${MS_SITE_ID}: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return data.id
}

// ─── Sanitiza nomes de pasta/arquivo para o SharePoint (sem / \ : * ? " < > |) ─
function sanitizeSegment(segment) {
  return String(segment).replace(/[\\/:*?"<>|]/g, '-').trim()
}

// ─── Upload de um arquivo pequeno (<4MB) direto via PUT ──────────────────
// Pranchas de construção em PDF costumam passar de 4MB; para arquivos
// maiores o Graph exige "upload session" (multi-part). Implementamos os
// dois caminhos e escolhemos automaticamente pelo tamanho do arquivo.
async function uploadSmallFile(token, driveId, path, fileBuffer) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/content`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/pdf',
    },
    body: fileBuffer,
  })

  if (!res.ok) {
    throw new Error(`Upload falhou (${res.status}) para ${path}: ${await res.text()}`)
  }
  return res.json()
}

async function uploadLargeFile(token, driveId, path, fileBuffer) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const sessionUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/createUploadSession`

  const sessionRes = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      item: { '@microsoft.graph.conflictBehavior': 'replace' },
    }),
  })
  if (!sessionRes.ok) {
    throw new Error(`Falha ao criar upload session para ${path}: ${sessionRes.status} ${await sessionRes.text()}`)
  }
  const { uploadUrl } = await sessionRes.json()

  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB por chunk, conforme recomendação do Graph
  const totalSize = fileBuffer.length

  for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, totalSize)
    const chunk = fileBuffer.subarray(start, end)

    const chunkRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
      },
      body: chunk,
    })

    if (!chunkRes.ok && chunkRes.status !== 202) {
      throw new Error(`Falha no chunk ${start}-${end} de ${path}: ${chunkRes.status} ${await chunkRes.text()}`)
    }
  }
}

async function uploadFile(token, driveId, path, fileBuffer) {
  const FOUR_MB = 4 * 1024 * 1024
  if (fileBuffer.length <= FOUR_MB) {
    return uploadSmallFile(token, driveId, path, fileBuffer)
  }
  return uploadLargeFile(token, driveId, path, fileBuffer)
}

// ─── Busca no Supabase: pranchas aprovadas/liberadas do projeto ──────────
async function fetchApprovedDrawings(projectId) {
  const { data, error } = await supabase
    .from('drawings')
    .select('id, code, discipline_code, floor_code, title, pdf_url, status, revision, approved_at, disciplines(name)')
    .eq('project_id', projectId)
    .in('status', ['aprovado', 'aprovado_com_ressalva', 'liberado_para_obra'])

  if (error) throw error
  return data || []
}

// ─── Baixa o PDF do Supabase Storage como Buffer ──────────────────────────
async function downloadDrawingFile(pdfUrl) {
  // pdfUrl já é a URL pública gerada no upload (ver src/lib/queries.ts)
  const res = await fetch(pdfUrl)
  if (!res.ok) {
    throw new Error(`Falha ao baixar PDF de ${pdfUrl}: ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ─── Pega nome do projeto para o caminho raiz da pasta ────────────────────
async function fetchProjectName(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  if (error || !data) return projectId
  return data.name
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`[sync] Iniciando sincronização — ${new Date().toISOString()}`)
  if (isDryRun) console.log('[sync] 🔍 DRY RUN ativado — nenhum arquivo será enviado ao SharePoint.')

  // Em dry-run não precisamos de token Graph (não vamos subir nada)
  const token = isDryRun ? null : await getGraphToken()
  const driveId = isDryRun ? null : await resolveDriveId(token)

  const projectName = await fetchProjectName(SYNC_PROJECT_ID)
  const drawings = await fetchApprovedDrawings(SYNC_PROJECT_ID)

  console.log(`[sync] Projeto: ${projectName} · ${drawings.length} prancha(s) aprovada(s)/liberada(s) encontrada(s)`)

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const d of drawings) {
    const disciplineName = d.disciplines?.name || d.discipline_code || 'Sem-Disciplina'
    const folderPath = [
      SYNC_ROOT_FOLDER,
      sanitizeSegment(projectName),
      sanitizeSegment(disciplineName),
      sanitizeSegment(d.floor_code || 'Sem-Pavimento'),
    ].join('/')
    const fileName = `${sanitizeSegment(d.code)}.pdf`
    const fullPath = `${folderPath}/${fileName}`

    if (!d.pdf_url) {
      console.warn(`[sync] ⚠ Pulando ${d.code} — sem pdf_url cadastrado.`)
      skipped++
      continue
    }

    if (isDryRun) {
      console.log(`[sync] 🔍 DRY RUN: ${d.code} (${d.revision}) -> ${fullPath} (${d.pdf_url})`)
      ok++
      continue
    }

    try {
      const fileBuffer = await downloadDrawingFile(d.pdf_url)
      await uploadFile(token, driveId, fullPath, fileBuffer)
      console.log(`[sync] ✓ ${d.code} (${d.revision}) -> ${fullPath} [${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB]`)
      ok++
    } catch (err) {
      console.error(`[sync] ✗ Falha em ${d.code}: ${err.message}`)
      failed++
    }
  }

  const mode = isDryRun ? 'listado(s)' : 'enviado(s)'
  console.log(`[sync] Concluído. ${ok} ${mode}, ${skipped} pulado(s) sem PDF, ${failed} falha(s).`)
  if (failed > 0) process.exitCode = 1
}

main().catch(err => {
  console.error('[sync] Erro fatal:', err)
  process.exit(1)
})
