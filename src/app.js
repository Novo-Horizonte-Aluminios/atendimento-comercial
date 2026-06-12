require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { requestLogger, logger } = require('./utils/logger');
const { initOraclePool } = require('./config/oracle');
const { syncOracleDatabase, triggerSyncManual } = require('./jobs/syncOracle');
const { handleChatwootWebhook } = require('./controllers/webhookController');

const app = express();
app.use(express.json());
app.use(requestLogger);

// Rotas Webhook
app.post('/webhook/chatwoot', handleChatwootWebhook);

// Rota Endpoint Manual de Sync
app.post('/api/sync-manual', triggerSyncManual);

// Rota de Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 3000;
const cronSchedule = process.env.CRON_SYNC_SCHEDULE || '0 * * * *';

// Iniciar Aplicação
async function startApp() {
  logger.info('Iniciando o sistema Router Oracle->Chatwoot...');

  // 1. Iniciar Banco Oracle
  await initOraclePool();

  // 2. Agendar Sincronização
  cron.schedule(cronSchedule, () => {
    logger.info(`⏳ Executando CRON de Sincronização... Schedule: ${cronSchedule}`);
    syncOracleDatabase();
  });
  logger.info(`⏰ Job CRON configurado para: ${cronSchedule}`);

  // Opcional: Primeira Sincronização ao Iniciar
  // syncOracleDatabase();

  // 3. Ouvir Porta Web
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor escutando na porta ${PORT}`);
  });
}

startApp().catch((err) => {
  logger.error('Erro ao iniciar a aplicação:', err);
  process.exit(1);
});
