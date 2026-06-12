// ============================================================
// MAPPER — Converte entre formatos Evolution Go e Chatwoot
// ============================================================

import { EvoGoWebhookPayload, EvoGoMessage, MessageType } from '../types/evolutionGo';

/**
 * Extrai número de telefone limpo a partir de um JID do WhatsApp
 * Ex: "5511999999999@s.whatsapp.net" → "5511999999999"
 */
export function jidToPhone(jid: string): string {
  return jid.split('@')[0].replace(/[^0-9]/g, '');
}

/**
 * Formata número de telefone para exibição
 * Ex: "5511999999999" → "+55 11 99999-9999"
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    // Brasileiro: 55 + DDD (2) + número (9)
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
}

/**
 * Determina o tipo de mensagem Evolution Go
 */
export function getMessageType(message: EvoGoMessage): MessageType {
  if (message.message?.conversation || message.message?.extendedTextMessage) return 'text';
  if (message.message?.imageMessage) return 'image';
  if (message.message?.videoMessage) return 'video';
  if (message.message?.audioMessage || message.message?.pttMessage) return 'audio';
  if (message.message?.documentMessage || message.message?.documentWithCaptionMessage) return 'document';
  if (message.message?.stickerMessage) return 'sticker';
  if (message.message?.locationMessage) return 'location';
  if (message.message?.contactMessage) return 'contact';
  if (message.message?.reactionMessage) return 'reaction';
  return 'unknown';
}

/**
 * Extrai o texto da mensagem (de todos os tipos possíveis)
 */
export function extractMessageText(message: EvoGoMessage): string {
  const msg = message.message;
  if (!msg) return '';

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    msg.audioMessage?.caption ||
    ''
  );
}

/**
 * Extrai a URL de mídia da mensagem (se disponível)
 */
export function extractMediaUrl(message: EvoGoMessage): string | null {
  const msg = message.message;
  if (!msg) return null;

  // A Evolution Go pode fornecer a URL diretamente no webhook (com WEBHOOKFILES=true)
  return (
    msg.imageMessage?.url ||
    msg.videoMessage?.url ||
    msg.audioMessage?.url ||
    msg.pttMessage?.url ||
    msg.documentMessage?.url ||
    msg.stickerMessage?.url ||
    null
  );
}

/**
 * Mapeia tipo de mídia Evolution Go → MIME type para Chatwoot
 */
export function getMimeType(message: EvoGoMessage): string {
  const msg = message.message;
  if (!msg) return 'application/octet-stream';

  if (msg.imageMessage) return msg.imageMessage.mimetype || 'image/jpeg';
  if (msg.videoMessage) return msg.videoMessage.mimetype || 'video/mp4';
  if (msg.audioMessage || msg.pttMessage) {
    const mime = msg.audioMessage?.mimetype || msg.pttMessage?.mimetype || 'audio/ogg; codecs=opus';
    return mime;
  }
  if (msg.documentMessage) return msg.documentMessage.mimetype || 'application/octet-stream';
  if (msg.documentWithCaptionMessage) {
    return msg.documentWithCaptionMessage.message?.documentMessage?.mimetype || 'application/octet-stream';
  }
  if (msg.stickerMessage) return msg.stickerMessage.mimetype || 'image/webp';
  return 'application/octet-stream';
}

/**
 * Extrai o nome do arquivo da mensagem (documentos)
 */
export function extractFileName(message: EvoGoMessage): string | null {
  const msg = message.message;
  if (!msg) return null;

  return (
    msg.documentMessage?.fileName ||
    msg.documentWithCaptionMessage?.message?.documentMessage?.fileName ||
    null
  );
}

/**
 * Verifica se a mensagem é de um grupo
 */
export function isGroupMessage(jid: string): boolean {
  return jid.includes('@g.us');
}

/**
 * Verifica se a mensagem é outgoing (enviada pelo número conectado)
 */
export function isOutgoingMessage(message: EvoGoMessage): boolean {
  return message.key?.fromMe === true;
}

/**
 * Extrai o nome do remetente
 */
export function extractSenderName(payload: EvoGoWebhookPayload): string {
  return (
    payload.pushName ||
    payload.sender?.pushName ||
    formatPhone(jidToPhone(payload.key?.remoteJid || ''))
  );
}

/**
 * Formata mensagem de localização para texto legível
 */
export function formatLocation(message: EvoGoMessage): string {
  const loc = message.message?.locationMessage;
  if (!loc) return '📍 Localização compartilhada';
  return `📍 Localização\nLatitude: ${loc.degreesLatitude}\nLongitude: ${loc.degreesLongitude}${loc.address ? `\nEndereço: ${loc.address}` : ''}`;
}

/**
 * Gera conteúdo de texto para tipos não-texto no Chatwoot
 */
export function getTextContent(message: EvoGoMessage): string {
  const type = getMessageType(message);
  const text = extractMessageText(message);

  switch (type) {
    case 'text': return text;
    case 'image': return text || '🖼️ Imagem';
    case 'video': return text || '🎥 Vídeo';
    case 'audio': return '🎤 Áudio';
    case 'document': return text || `📄 ${extractFileName(message) || 'Documento'}`;
    case 'sticker': return '🎯 Sticker';
    case 'location': return formatLocation(message);
    case 'contact': return '👤 Contato compartilhado';
    case 'reaction': return `${message.message?.reactionMessage?.text || '❤️'} (reação)`;
    default: return '📎 Mensagem recebida';
  }
}
