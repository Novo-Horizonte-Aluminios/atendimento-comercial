const { fetchOracleClientes } = require('../config/oracle');
const { upsertClientesBatch } = require('../repositories/clienteRepository');
const { normalizePhone } = require('../utils/phone');

async function syncOracleDatabase() {
  const now = new Date().toLocaleString();
  console.log(`[${now}] 🔄 Iniciando Sincronização Local...`);

  try {
    const rawClientes = await fetchOracleClientes();
    
    if (!rawClientes || rawClientes.length === 0) {
      console.log('Sem dados do Oracle para processar.');
      return;
    }

    const uniqueClients = {};

    rawClientes.forEach(cli => {
      const p = normalizePhone(cli.telefone);
      if (p) {
        // Usa o telefone como chave. Se houver telefones duplicados no banco Oracle,
        // o último lido vai sobrescrever o anterior no payload, evitando erro no Supabase.
        uniqueClients[p] = {
          telefone: p,
          nome: cli.nome || 'Sem Nome',
          cliente_id: cli.cliente_id?.toString(),
          vendedor_id: cli.vendedor_id ? parseInt(cli.vendedor_id, 10) : null,
          vendedor_nome: cli.vendedor_nome || ('Vendedor ' + (cli.vendedor_id || 'Indefinido')),
          updated_at: new Date().toISOString()
        };
      }
    });

    const payloadSupabase = Object.values(uniqueClients);

    const count = await upsertClientesBatch(payloadSupabase);
    console.log(`✅ Sucesso! ${count} registros agora estão na nuvem.`);

  } catch (error) {
    console.error('❌ Falha Crítica na Sync: ', error.message);
  }
}

module.exports = { syncOracleDatabase };
