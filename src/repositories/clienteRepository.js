const supabase = require('../config/supabase');
const { normalizePhone } = require('../utils/phone');
const { logger } = require('../utils/logger');

async function buscarClientePorTelefone(telefoneBruto) {
  const telefoneStr = normalizePhone(telefoneBruto);
  
  if (!telefoneStr) {
    return null;
  }

  const { data, error } = await supabase
    .from('clientes_atendimento')
    .select('*')
    .eq('telefone', telefoneStr)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhum resultado
      return null;
    }
    logger.error('Erro ao buscar cliente no Supabase:', error.message);
    return null;
  }

  return data;
}

async function upsertClientesBatch(clientes) {
  // A API do Supabase permite enviar arrays de objetos para UPSERT (onConflict)
  if (!clientes || clientes.length === 0) return 0;
  
  const { data, error } = await supabase
    .from('clientes_atendimento')
    .upsert(clientes, { onConflict: 'telefone' })
    .select();

  if (error) {
    logger.error('Erro ao realizar Upsert no Supabase:', error.message);
    throw error;
  }

  return data ? data.length : 0;
}

module.exports = { buscarClientePorTelefone, upsertClientesBatch };
