const { fetchOracleClientes } = require('../config/oracle');
const { upsertClientesBatch } = require('../repositories/clienteRepository');
const { normalizePhone } = require('../utils/phone');
const { logger } = require('../utils/logger');

/**
 * Job para sincronização dos clientes do Oracle pro Supabase
 */
async function syncOracleDatabase() {
  logger.info('🔄 Iniciando rotina de sincronização: Oracle -> Nuvem');
  const startTime = Date.now();

  try {
    const rawClientes = await fetchOracleClientes();
    
    if (!rawClientes || rawClientes.length === 0) {
      logger.info('Nenhum cliente retornado do Oracle.');
      return;
    }

    const payloadSupabase = [];

    rawClientes.forEach(cli => {
      const p = normalizePhone(cli.telefone);
      if (p) {
        payloadSupabase.push({
          telefone: p,
          cliente_id: cli.cliente_id?.toString() || '',
          vendedor_id: cli.vendedor_id ? parseInt(cli.vendedor_id, 10) : null,
          vendedor_nome: cli.vendedor_nome,
          ativo: cli.ativo === 1
        });
      }
    });

    // Enviar dados em chunks se houver muitos, 
    // mas o Supabase aguenta dezenas de milhares de uma vez.
    const numRows = await upsertClientesBatch(payloadSupabase);

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Sincronização Concluída! ${numRows} registros sincronizados em ${timeTaken} segundos.`);

  } catch (error) {
    logger.error('❌ Erro na Sincronização Oracle: ', error.message);
  }
}

// Handler de trigger manual
async function triggerSyncManual(req, res) {
  try {
    // Sincroniza de forma asíncrona sem bloquear
    syncOracleDatabase();
    res.json({ message: 'Sincronização iniciada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar sincronização' });
  }
}

module.exports = { syncOracleDatabase, triggerSyncManual };
