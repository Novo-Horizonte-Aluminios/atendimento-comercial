const oracledb = require('oracledb');
const { logger } = require('../utils/logger');

// Inicialização com Pool de Conexão.
async function initOraclePool() {
  try {
    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    logger.info('Oracle Pool iniciado com sucesso.');
  } catch (error) {
    logger.error('Erro ao conectar ao DB Oracle: ', error.message);
  }
}

async function getOracleConnection() {
  return await oracledb.getConnection();
}

async function fetchOracleClientes() {
  let conn;
  try {
    conn = await getOracleConnection();
    // Substitua esta Query pela Query real disponibilizada
    const query = `
      SELECT 
          CLI.NR_TELEFONE as "telefone",
          CLI.CD_CLIENTE as "cliente_id",
          VEND.CD_VENDEDOR as "vendedor_id",
          VEND.DS_NOME as "vendedor_nome",
          CASE WHEN VEND.ST_ATIVO = 'S' THEN 1 ELSE 0 END as "ativo"
      FROM 
          TAB_CLIENTES CLI
      JOIN 
          TAB_VENDEDORES VEND ON CLI.CD_VENDEDOR = VEND.CD_VENDEDOR
      WHERE 
          CLI.NR_TELEFONE IS NOT NULL
    `;
    const result = await conn.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } catch (err) {
    logger.error('Erro na query do Oracle: ', err.message);
    return [];
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        logger.error('Erro ao fechar conexão Oracle: ', err.message);
      }
    }
  }
}

module.exports = { initOraclePool, fetchOracleClientes };
