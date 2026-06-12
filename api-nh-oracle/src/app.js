require('dotenv').config();
const cron = require('node-cron');
const { initOraclePool } = require('./config/oracle');
const { syncOracleDatabase } = require('./jobs/syncOracle');

async function startEngine() {
  console.log('🚀 Iniciando Extrator Local Comercial...');
  
  // Conecta ao DB Oracle
  await initOraclePool();

  // Executa uma vez no início
  await syncOracleDatabase();

  // Agendar a cada 1 hora ('0 * * * *') para economizar recursos enquanto o Chatwoot não está em produção
  const interval = '0 * * * *'; 
  
  cron.schedule(interval, () => {
    syncOracleDatabase();
  });
  
  console.log(`⏰ Sistema agendado para rodar a cada: 5 minutos (${interval})`);
  console.log('Aperte Ctrl+C para encerrar se estiver testando manualmente.');
}

startEngine().catch(e => console.error(e));
