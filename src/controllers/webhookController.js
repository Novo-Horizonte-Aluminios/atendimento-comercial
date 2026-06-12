const { buscarClientePorTelefone } = require('../repositories/clienteRepository');
const { atribuirConversaChatwoot } = require('../services/chatwootService');
const { logger } = require('../utils/logger');

async function handleChatwootWebhook(req, res) {
  try {
    const payload = req.body;
    
    // Validar se é evento de "message_created" ou "conversation_created" e não de agentes.
    if (payload.event === 'message_created' && payload.message_type === 'incoming') {      
      const conversationId = payload.conversation?.id;
      const customerPhone = payload.sender?.phone_number;

      if (!conversationId) {
        return res.status(200).json({ error: 'Conversation ID ausente' });
      }
      if (!customerPhone) {
        logger.info(`Webhook recebido mas sem telefone (Conversation ID: ${conversationId}). Falha no roteamento local.`);
        return res.status(200).json({ message: 'Sem telefone' });
      }

      logger.info(`📞 Recebido no webhook. Conversa: ${conversationId} | Telefone: ${customerPhone}`);

      // Buscar cliente sincronizado do oracle e que está na nuvem
      const cliente = await buscarClientePorTelefone(customerPhone);
      let assigneeId = parseInt(process.env.ID_FILA_PADRAO_VENDEDOR, 10);
      let isFallback = true;
      let reason = 'Cliente não encontrado';

      if (cliente) {
        if (cliente.ativo && cliente.vendedor_id) {
          assigneeId = cliente.vendedor_id;
          isFallback = false;
          reason = `Atribuído ao vendedor responsável - ID: ${assigneeId} - Nome: ${cliente.vendedor_nome}`;
        } else {
          reason = `Cliente encontrado mas sem vendedor_id retornado pelo ERP ou Vendedor Inativo. Fallback.`;
        }
      }

      logger.info(`🔍 Resultado roteamento para ${customerPhone}: ${reason} -> Assinando ao ID: ${assigneeId}`);

      // Emite assign assíncrono para garantir latência baixa na reposta ao webhook
      atribuirConversaChatwoot(conversationId, assigneeId);
      
      // Responde com antecedência (<2s exigido no prompt)
      return res.status(200).json({ status: 'processando_roteamento', isFallback });
    }

    // Outros eventos
    return res.status(200).json({ status: 'ignorado' });

  } catch (error) {
    logger.error('Erro no webhook Chatwoot: ' + error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { handleChatwootWebhook };
