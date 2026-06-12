// ============================================================
// WEBHOOK EVOLUTION — Recebe eventos da Evolution Go
// e os encaminha para o Chatwoot
// ============================================================

import { Router, Request, Response } from 'express';
import { evolutionGoService } from '../services/evolutionGo';
import { chatwootService } from '../services/chatwoot';
import { mediaService } from '../services/media';
import { db } from '../services/database';
import { logger } from '../utils/logger';
import {
  EvoGoWebhookPayload,
  EvoGoMessage,
  EvoGoConnectionUpdate,
} from '../types/evolutionGo';
import {
  jidToPhone,
  extractSenderName,
  getTextContent,
  getMessageType,
  extractMediaUrl,
  getMimeType,
  extractFileName,
  isGroupMessage,
  isOutgoingMessage,
} from '../utils/mapper';

export const webhookEvolutionRouter = Router();

// ──────────────────────────────────────────────
// POST /webhooks/evolution/:instanceName?
// Aceita todos os eventos da Evolution Go
// ──────────────────────────────────────────────
webhookEvolutionRouter.post('/:instanceName?', async (req: Request, res: Response) => {
  // Responde imediatamente para não deixar a Evolution Go esperando
  res.status(200).json({ status: 'received' });

  const payload = req.body as EvoGoWebhookPayload;
  const instanceName = req.params.instanceName || payload.instance;

  if (!instanceName) {
    logger.warn('[WebhookEvo] Evento sem nome de instância, ignorando');
    return;
  }

  logger.debug(`[WebhookEvo] Evento recebido: ${payload.event} | Instância: ${instanceName}`);

  try {
    switch (payload.event) {
      case 'messages.upsert':
      case 'message':
        await handleMessageUpsert(instanceName, payload);
        break;

      case 'messages.update':
      case 'message.update':
        await handleMessageUpdate(instanceName, payload);
        break;

      case 'messages.delete':
      case 'message.delete':
        await handleMessageDelete(instanceName, payload);
        break;

      case 'connection.update':
        await handleConnectionUpdate(instanceName, payload);
        break;

      case 'history.set':
      case 'messages.set':
        await handleHistorySync(instanceName, payload);
        break;

      default:
        logger.debug(`[WebhookEvo] Evento não tratado: ${payload.event}`);
    }
  } catch (err) {
    logger.error(`[WebhookEvo] Erro ao processar evento ${payload.event}:`, err);
  }
});

// ══════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════

async function handleMessageUpsert(instanceName: string, payload: EvoGoWebhookPayload): Promise<void> {
  const record = db.findByInstanceName(instanceName);
  if (!record) {
    logger.warn(`[WebhookEvo] Instância não registrada: ${instanceName}`);
    return;
  }

  // A mensagem pode estar em payload.data ou no próprio payload
  const message = (payload.data as EvoGoMessage) || (payload as unknown as EvoGoMessage);

  if (!message?.key?.remoteJid) {
    logger.warn('[WebhookEvo] Mensagem sem remoteJid, ignorando');
    return;
  }

  const isGroup = isGroupMessage(message.key.remoteJid);

  // Ignora mensagens enviadas pelo próprio número (outgoing) — serão criadas pelo Chatwoot
  // EXCETO se é importação de histórico
  if (isOutgoingMessage(message)) {
    logger.debug('[WebhookEvo] Ignorando mensagem outgoing do número conectado');
    return;
  }

  const phone = isGroup ? message.key.remoteJid : jidToPhone(message.key.remoteJid);
  const name = extractSenderName({ ...payload, ...message });
  const messageType = getMessageType(message);
  const textContent = getTextContent(message);

  logger.info(`[WebhookEvo] Nova mensagem de ${phone} (${name}): tipo=${messageType}`);

  try {
    // 1. Busca/cria contato no Chatwoot
    const avatarUrl = await evolutionGoService.getProfilePicture(instanceName, phone).catch(() => null);
    const contact = await chatwootService.getOrCreateContact(
      record.accountId,
      phone,
      name,
      avatarUrl,
      record.accountToken
    );

    // 2. Busca/cria conversa no Chatwoot
    const conversation = await chatwootService.getOrCreateConversation(
      record.accountId,
      contact.id,
      record.inboxId,
      phone, // source_id = JID do contato
      record.accountToken
    );

    // 3. Cria mensagem no Chatwoot
    if (messageType === 'text') {
      await chatwootService.createMessage(
        record.accountId,
        conversation.id,
        {
          content: textContent,
          message_type: 'incoming',
          private: false,
          external_source_ids: { evo_go: message.key.id },
          additional_attributes: {
            evoGoMessageId: message.key.id,
            evoGoInstance: instanceName,
          },
        },
        record.accountToken
      );
    } else {
      // Mensagem com mídia
      const mediaUrl = extractMediaUrl(message);
      const mimeType = getMimeType(message);
      const fileName = extractFileName(message) || `file_${message.key.id}`;

      if (mediaUrl) {
        // Tenta baixar a mídia e criar com anexo
        const media = await mediaService.downloadFromUrl(mediaUrl);

        if (media) {
          await chatwootService.createMessageWithAttachment(
            record.accountId,
            conversation.id,
            textContent,
            media.buffer,
            media.fileName || fileName,
            media.mimeType || mimeType,
            'incoming',
            record.accountToken,
            message.key.id
          );
        } else {
          // Fallback: cria só o texto
          await chatwootService.createMessage(
            record.accountId,
            conversation.id,
            {
              content: textContent,
              message_type: 'incoming',
              external_source_ids: { evo_go: message.key.id },
            },
            record.accountToken
          );
        }
      } else {
        // Sem URL de mídia, cria só o texto
        await chatwootService.createMessage(
          record.accountId,
          conversation.id,
          {
            content: textContent,
            message_type: 'incoming',
          },
          record.accountToken
        );
      }
    }

    logger.info(`[WebhookEvo] Mensagem criada no Chatwoot — conversa ${conversation.id}`);
  } catch (err) {
    logger.error('[WebhookEvo] Erro ao criar mensagem no Chatwoot:', err);
  }
}

async function handleMessageUpdate(instanceName: string, payload: EvoGoWebhookPayload): Promise<void> {
  const record = db.findByInstanceName(instanceName);
  if (!record) return;

  // Edição de mensagem: payload.data contém a mensagem editada
  const data = payload.data as EvoGoMessage;
  const editedContent = data?.message?.editedMessage?.message?.protocolMessage?.editedMessage;
  const originalId = data?.message?.editedMessage?.message?.protocolMessage?.key?.id ||
    data?.message?.protocolMessage?.key?.id;

  if (!editedContent || !originalId) {
    logger.debug('[WebhookEvo] Update sem edição de conteúdo, ignorando');
    return;
  }

  const newText = editedContent.conversation || editedContent.extendedTextMessage?.text || '';
  if (!newText) return;

  const phone = jidToPhone(data.key.remoteJid);

  try {
    // Busca contato e conversa
    const contacts = await chatwootService.searchContacts(record.accountId, phone, record.accountToken);
    const contact = contacts[0];
    if (!contact) return;

    const res = await chatwootService['getAccountClient'](record.accountToken)
      .get(`/api/v1/accounts/${record.accountId}/contacts/${contact.id}/conversations`);
    const conversations = res.data?.payload || [];
    const conversation = conversations.find((c: { inbox_id: number }) => c.inbox_id === record.inboxId);
    if (!conversation) return;

    // Busca a mensagem original pelo ID externo
    const cwMessage = await chatwootService.findMessageByExternalId(
      record.accountId,
      conversation.id,
      originalId,
      record.accountToken
    );

    if (cwMessage) {
      await chatwootService.updateMessage(
        record.accountId,
        conversation.id,
        cwMessage.id,
        newText,
        record.accountToken
      );
      logger.info(`[WebhookEvo] Mensagem ${cwMessage.id} editada no Chatwoot`);
    }
  } catch (err) {
    logger.error('[WebhookEvo] Erro ao editar mensagem no Chatwoot:', err);
  }
}

async function handleMessageDelete(instanceName: string, payload: EvoGoWebhookPayload): Promise<void> {
  const record = db.findByInstanceName(instanceName);
  if (!record) return;

  const data = payload.data as EvoGoMessage;
  const deletedId = data?.message?.protocolMessage?.key?.id || data?.key?.id;

  if (!deletedId) return;

  const phone = jidToPhone(data.key?.remoteJid || '');

  try {
    const contacts = await chatwootService.searchContacts(record.accountId, phone, record.accountToken);
    const contact = contacts[0];
    if (!contact) return;

    const client = chatwootService['getAccountClient'](record.accountToken);
    const res = await client.get(`/api/v1/accounts/${record.accountId}/contacts/${contact.id}/conversations`);
    const conversations = res.data?.payload || [];
    const conversation = conversations.find((c: { inbox_id: number }) => c.inbox_id === record.inboxId);
    if (!conversation) return;

    const cwMessage = await chatwootService.findMessageByExternalId(
      record.accountId,
      conversation.id,
      deletedId,
      record.accountToken
    );

    if (cwMessage) {
      await chatwootService.deleteMessage(
        record.accountId,
        conversation.id,
        cwMessage.id,
        record.accountToken
      );
      logger.info(`[WebhookEvo] Mensagem ${cwMessage.id} deletada no Chatwoot`);
    }
  } catch (err) {
    logger.error('[WebhookEvo] Erro ao deletar mensagem no Chatwoot:', err);
  }
}

async function handleConnectionUpdate(instanceName: string, payload: EvoGoWebhookPayload): Promise<void> {
  const update = payload.data as EvoGoConnectionUpdate;
  logger.info(`[WebhookEvo] Status de conexão: ${instanceName} → ${update?.state}`);

  if (update?.state === 'open') {
    db.updateStatus(instanceName, 'active');
  } else if (update?.state === 'close') {
    db.updateStatus(instanceName, 'inactive');
  } else if (update?.state === 'connecting') {
    db.updateStatus(instanceName, 'connecting');
  }
}

async function handleHistorySync(instanceName: string, payload: EvoGoWebhookPayload): Promise<void> {
  const record = db.findByInstanceName(instanceName);
  if (!record) return;

  logger.info(`[WebhookEvo] Sincronizando histórico para ${instanceName}...`);

  // O evento history.set contém array de mensagens
  const data = payload.data as { messages?: EvoGoMessage[] };
  const messages = data?.messages || [];

  if (!messages.length) {
    logger.info('[WebhookEvo] Histórico vazio');
    return;
  }

  // Processa cada mensagem do histórico em ordem cronológica
  const sorted = messages
    .filter((m) => m?.key?.remoteJid)
    .sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

  logger.info(`[WebhookEvo] Processando ${sorted.length} mensagens do histórico`);

  for (const message of sorted) {
    try {
      await handleMessageUpsert(instanceName, {
        event: 'messages.upsert',
        instance: instanceName,
        data: message,
        key: message.key,
        message: message.message,
        messageTimestamp: message.messageTimestamp,
        pushName: message.pushName,
      });
      // Pequeno delay para não sobrecarregar o Chatwoot
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      logger.error('[WebhookEvo] Erro ao processar mensagem do histórico:', err);
    }
  }

  logger.info(`[WebhookEvo] Histórico sincronizado: ${sorted.length} mensagens`);
}
