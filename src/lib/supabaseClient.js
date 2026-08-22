import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://deohomcyxxnhfxfmnriq.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_RcT5Xp4YQgQncpBaz1COpQ_qels9qg_'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
