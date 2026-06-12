import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Supabase connection missing. Make sure .env files are configured with VITE_ prefixes.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
