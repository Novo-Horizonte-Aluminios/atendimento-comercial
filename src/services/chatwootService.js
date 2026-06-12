const axios = require('axios');
const { logger } = require('../utils/logger');

async function atribuirConversaChatwoot(conversation_id, vendedor_id) {
  try {
    const chatwootUrl = process.env.CHATWOOT_URL;
    const accountId = process.env.ACCOUNT_ID;
    const token = process.env.CHATWOOT_TOKEN;

    const url = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversation_id}/assignments`;

    const response = await axios.post(url, {
      assignee_id: parseInt(vendedor_id, 10)
    }, {
      headers: {
        'api_access_token': token,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Conversa ${conversation_id} atribuida ao vendedor ${vendedor_id} no Chatwoot com sucesso.`);
    return true;
  } catch (error) {
    logger.error(`Erro ao atribuir conversa no Chatwoot:`, error?.response?.data || error.message);
    return false;
  }
}

module.exports = { atribuirConversaChatwoot };
