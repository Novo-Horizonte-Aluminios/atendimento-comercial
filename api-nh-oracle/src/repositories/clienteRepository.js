const supabase = require('../config/supabase');

async function upsertClientesBatch(clientes) {
  if (!clientes || clientes.length === 0) return 0;
  
  const { data, error } = await supabase
    .from('client_atendimento')
    .upsert(clientes, { onConflict: 'telefone' });

  if (error) {
    console.error('Erro Upsert Supabase:', error.message);
    throw error;
  }

  return clientes.length;
}

module.exports = { upsertClientesBatch };
