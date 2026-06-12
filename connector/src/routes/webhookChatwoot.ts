// ============================================================
// WEBHOOK CHATWOOT — Recebe eventos do Chatwoot
// e os encaminha para a Evolution Go
// ============================================================

import { Router, Request, Response } from 'express';
import { evolutionGoService } from '../services/evolutionGo';
import { mediaService } from '../services/media';
import { db } from '../services/database';
import { logger } from '../utils/logger';
import { ChatwootWebhookPayload, ChatwootMessage } from '../types/chatwoot';
import { jidToPhone } from '../utils/mapper';

export const webhookChatwootRouter = Router();

// ──────────────────────────────────────────────
// POST /webhooks/chatwoot/:inboxId?
// Recebe eventos do Chatwoot e envia pelo WhatsApp
// ──────────────────────────────────────────────
webhookChatwootRouter.post('/:inboxId?', async (req: Request, res: Response) => {
  res.status(200).json({ status: 'received' });

  const payload = req.body as ChatwootWebhookPayload;
  const inboxIdParam = req.params.inboxId ? parseInt(req.params.inboxId, 10) : undefined;
  const inboxId = inboxIdParam || payload.inbox?.id || payload.conversation?.inbox_id;

  logger.debug(`[WebhookCW] Evento: ${payload.event} | Inbox: ${inboxId}`);

  try {
    switch (payload.event) {
      case 'message_created':
        await handleMessageCreated(payload, inboxId);
        break;

      case 'message_updated':
        await handleMessageUpdated(payload, inboxId);
        break;

      case 'message_deleted':
        await handleMessageDeleted(payload, inboxId);
        break;

      case 'conversation_status_changed':
        logger.debug(`[WebhookCW] Status de conversa alterado: ${payload.conversation?.status}`);
        break;

      default:
        logger.debug(`[WebhookCW] Evento não tratado: ${payload.event}`);
    }
  } catch (err) {
    logger.error(`[WebhookCW] Erro ao processar evento ${payload.event}:`, err);
  }
});

// ══════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════

async function handleMessageCreated(payload: ChatwootWebhookPayload, inboxId?: number): Promise<void> {
  const message = payload.message;
  if (!message) return;

  // Só processa mensagens OUTGOING (tipo 1 = enviadas pelo agente)
  if (message.message_type !== 1) {
    logger.debug('[WebhookCW] Ignorando mensagem não-outgoing');
    return;
  }

  // Ignora mensagens privadas (notas internas)
  if (message.private) {
    logger.debug('[WebhookCW] Ignorando nota interna');
    return;
  }

  // Busca o registro da instância pelo inbox
  const effectiveInboxId = inboxId || payload.conversation?.inbox_id;
  if (!effectiveInboxId) {
    logger.warn('[WebhookCW] Não foi possível determinar o inbox ID');
    return;
  }

  const record = db.findByInboxId(effectiveInboxId);
  if (!record) {
    logger.debug(`[WebhookCW] Inbox ${effectiveInboxId} não mapeado a nenhuma instância`);
    return;
  }

  // Extrai o número do destinatário (source_id da conversa = número do contato)
  const conversation = payload.conversation;
  const contactPhone = conversation?.contact_inbox?.source_id ||
    conversation?.meta?.sender?.phone_number?.replace(/[^0-9]/g, '');

  if (!contactPhone) {
    logger.warn('[WebhookCW] Não foi possível determinar o número do contato');
    return;
  }

  // Formata número para o WhatsApp (se for grupo, mantém o JID intacto; senão, mantém apenas os números)
  const to = contactPhone.includes('@g.us') ? contactPhone : contactPhone.replace(/[^0-9]/g, '');

  logger.info(`[WebhookCW] Enviando mensagem do agente para ${to} via ${record.instanceName}`);

  try {
    // Verifica se tem anexos
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        await sendAttachmentToWhatsApp(
          record.instanceName,
          to,
          attachment.data_url,
          message.content || '',
          attachment.file_type
        );
      }
    } else if (message.content) {
      // Texto simples
      await evolutionGoService.sendText(record.instanceName, {
        number: to,
        text: message.content,
      });
    }

    logger.info(`[WebhookCW] Mensagem enviada com sucesso para ${to}`);
  } catch (err) {
    logger.error('[WebhookCW] Erro ao enviar mensagem via Evolution Go:', err);
  }
}

async function handleMessageUpdated(payload: ChatwootWebhookPayload, inboxId?: number): Promise<void> {
  const message = payload.message as ChatwootMessage & { message_type: number };
  if (!message || message.message_type !== 1) return;
  if (message.private) return;

  const effectiveInboxId = inboxId || payload.conversation?.inbox_id;
  if (!effectiveInboxId) return;

  const record = db.findByInboxId(effectiveInboxId);
  if (!record) return;

  const contactPhone = payload.conversation?.contact_inbox?.source_id ||
    payload.conversation?.meta?.sender?.phone_number?.replace(/[^0-9]/g, '');

  if (!contactPhone || !message.content) return;

  const to = contactPhone.includes('@g.us') ? contactPhone : contactPhone.replace(/[^0-9]/g, '');

  // Recupera o ID original da mensagem na Evolution Go
  const evoGoMessageId = message.external_source_ids?.evo_go ||
    message.additional_attributes?.evoGoMessageId as string;

  if (!evoGoMessageId) {
    logger.debug('[WebhookCW] Mensagem sem ID Evolution Go para editar');
    return;
  }

  try {
    await evolutionGoService.editMessage(record.instanceName, {
      number: to,
      text: message.content,
      key: {
        id: evoGoMessageId,
        remoteJid: to.includes('@g.us') ? to : `${to}@s.whatsapp.net`,
        fromMe: true,
      },
    });
    logger.info(`[WebhookCW] Mensagem editada via Evolution Go: ${evoGoMessageId}`);
  } catch (err) {
    logger.error('[WebhookCW] Erro ao editar mensagem via Evolution Go:', err);
  }
}

async function handleMessageDeleted(payload: ChatwootWebhookPayload, inboxId?: number): Promise<void> {
  const message = payload.message as ChatwootMessage & { message_type: number };
  if (!message || message.message_type !== 1) return;

  const effectiveInboxId = inboxId || payload.conversation?.inbox_id;
  if (!effectiveInboxId) return;

  const record = db.findByInboxId(effectiveInboxId);
  if (!record) return;

  const contactPhone = payload.conversation?.contact_inbox?.source_id ||
    payload.conversation?.meta?.sender?.phone_number?.replace(/[^0-9]/g, '');

  if (!contactPhone) return;
  const to = contactPhone.includes('@g.us') ? contactPhone : contactPhone.replace(/[^0-9]/g, '');

  const evoGoMessageId = message.external_source_ids?.evo_go ||
    message.additional_attributes?.evoGoMessageId as string;

  if (!evoGoMessageId) return;

  try {
    await evolutionGoService.deleteMessage(record.instanceName, {
      id: evoGoMessageId,
      fromMe: true,
      remoteJid: to.includes('@g.us') ? to : `${to}@s.whatsapp.net`,
    });
    logger.info(`[WebhookCW] Mensagem deletada via Evolution Go: ${evoGoMessageId}`);
  } catch (err) {
    logger.error('[WebhookCW] Erro ao deletar mensagem via Evolution Go:', err);
  }
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

async function sendAttachmentToWhatsApp(
  instanceName: string,
  to: string,
  attachmentUrl: string,
  caption: string,
  fileType: string
): Promise<void> {
  const media = await mediaService.downloadFromUrl(attachmentUrl);

  if (!media) {
    // Fallback: envia URL diretamente
    const evoMediaType = mediaService.evoGoMediaType(
      fileType === 'image' ? 'image/jpeg' :
        fileType === 'video' ? 'video/mp4' :
          fileType === 'audio' ? 'audio/ogg' : 'application/octet-stream'
    );

    await evolutionGoService.sendMedia(instanceName, {
      number: to,
      mediatype: evoMediaType,
      media: attachmentUrl,
      caption,
    });
    return;
  }

  const evoMediaType = mediaService.evoGoMediaType(media.mimeType);

  // Converte buffer para base64 para enviar
  const base64 = `data:${media.mimeType};base64,${media.buffer.toString('base64')}`;

  if (evoMediaType === 'audio') {
    await evolutionGoService.sendAudio(instanceName, to, base64);
  } else {
    await evolutionGoService.sendMedia(instanceName, {
      number: to,
      mediatype: evoMediaType,
      media: base64,
      caption,
      fileName: media.fileName,
      mimetype: media.mimeType,
    });
  }
}
