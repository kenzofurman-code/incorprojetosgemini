import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const SUPABASE_CONFIGURED = !!(supabaseUrl && supabaseAnonKey)

if (!SUPABASE_CONFIGURED) {
  console.warn(
    '[Supabase] Variáveis de ambiente não configuradas. ' +
    'Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local.'
  )
}

// ── Cria o cliente SOMENTE se as variáveis estiverem presentes ─────────────
// Isso evita o crash "supabaseUrl is required" que derrubava a página toda.
let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    if (!SUPABASE_CONFIGURED) {
      // Retorna um cliente apontando para URL inválida —
      // as queries vão falhar, mas o fallback para mock data vai tratá-las.
      _client = createClient('https://placeholder.supabase.co', 'placeholder-key')
    } else {
      _client = createClient(supabaseUrl, supabaseAnonKey)
    }
  }
  return _client
}

// Proxy: qualquer acesso a `supabase.from(...)` etc. chama getClient() na hora
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ─── Storage bucket names (create these in Supabase Dashboard > Storage) ─────
export const BUCKETS = {
  DRAWINGS: 'drawings',
  THUMBNAILS: 'thumbnails',
  AVATARS: 'avatars',
} as const

export default supabase
