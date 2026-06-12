const oracledb = require('oracledb');

// Configurando para Thin Mode por padrão na v6+ (remover se usar instant client)
async function initOraclePool() {
  try {
    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5
    });
    console.log('✔ Pool Oracle conectado localmente.');
  } catch (error) {
    console.error('✖ Erro no Oracle (verifique se o servidor está online): ', error.message);
  }
}

async function fetchOracleClientes() {
  let conn;
  try {
    conn = await oracledb.getConnection();
    const query = `
      SELECT 
          C.FONCLI as "telefone",
          C.NOMCLI as "nome",
          C.CODCLI as "cliente_id",
          C.USU_CODVEN as "vendedor_id",
          R.NOMREP as "vendedor_nome"
      FROM 
          E085CLI C
      LEFT JOIN 
          E090REP R ON C.USU_CODVEN = R.CODREP
      WHERE 
          C.CODCLI < 200 
          AND C.FONCLI IS NOT NULL
    `;
    const result = await conn.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } catch (err) {
    console.error('Erro Query Oracle: ', err.message);
    return [];
  } finally {
    if (conn) await conn.close();
  }
}

module.exports = { initOraclePool, fetchOracleClientes };
