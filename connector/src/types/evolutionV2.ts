// ============================================================
// TYPES — Tipos para Evolution API v2 (Baileys)
// ============================================================

export interface EvoV2Instance {
  instance: {
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
    serverUrl?: string;
    apikey?: string;
  };
}

export interface EvoV2WebhookPayload {
  event: string;
  instance: string;
  data: unknown;
  apiKey?: string;
}

export interface EvoV2Message {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { url?: string; caption?: string; mimetype?: string };
    videoMessage?: { url?: string; caption?: string; mimetype?: string };
    audioMessage?: { url?: string; mimetype?: string; ptt?: boolean };
    pttMessage?: { url?: string; mimetype?: string };
    documentMessage?: { url?: string; fileName?: string; mimetype?: string; caption?: string };
    stickerMessage?: { url?: string; mimetype?: string };
    locationMessage?: { degreesLatitude: number; degreesLongitude: number; address?: string };
    contactMessage?: { displayName?: string; vcard?: string };
    reactionMessage?: { key?: { id?: string }; text?: string };
    protocolMessage?: {
      key?: { id?: string; remoteJid?: string; fromMe?: boolean };
      type?: number;
      editedMessage?: unknown;
    };
  };
  messageTimestamp?: number | { low?: number };
  pushName?: string;
  status?: string;
}
