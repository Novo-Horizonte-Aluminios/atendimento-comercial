const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

// Usar chave Service Role que contorna as restrições de RLS para o sistema interno (backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

module.exports = supabase;
