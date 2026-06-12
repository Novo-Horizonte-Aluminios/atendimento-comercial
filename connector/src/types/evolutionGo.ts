// ============================================================
// TYPES — Tipos para Evolution Go API
// ============================================================

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'reaction'
  | 'unknown';

export interface EvoGoMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text: string;
    contextInfo?: {
      quotedMessage?: Record<string, unknown>;
      stanzaId?: string;
      participant?: string;
    };
  };
  imageMessage?: {
    url?: string;
    mimetype?: string;
    caption?: string;
    fileLength?: string;
    height?: number;
    width?: number;
    mediaKey?: string;
    fileEncSha256?: string;
    directPath?: string;
  };
  videoMessage?: {
    url?: string;
    mimetype?: string;
    caption?: string;
    fileLength?: string;
    seconds?: number;
    mediaKey?: string;
  };
  audioMessage?: {
    url?: string;
    mimetype?: string;
    fileLength?: string;
    seconds?: number;
    ptt?: boolean;
    mediaKey?: string;
    caption?: string;
  };
  pttMessage?: {
    url?: string;
    mimetype?: string;
    fileLength?: string;
    seconds?: number;
    mediaKey?: string;
  };
  documentMessage?: {
    url?: string;
    mimetype?: string;
    title?: string;
    fileName?: string;
    fileLength?: string;
    mediaKey?: string;
    caption?: string;
  };
  documentWithCaptionMessage?: {
    message?: {
      documentMessage?: {
        url?: string;
        mimetype?: string;
        title?: string;
        fileName?: string;
        fileLength?: string;
        mediaKey?: string;
        caption?: string;
      };
    };
  };
  stickerMessage?: {
    url?: string;
    mimetype?: string;
    fileLength?: string;
    mediaKey?: string;
  };
  locationMessage?: {
    degreesLatitude: number;
    degreesLongitude: number;
    address?: string;
    name?: string;
  };
  contactMessage?: {
    displayName?: string;
    vcard?: string;
  };
  reactionMessage?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    text?: string;
  };
  editedMessage?: {
    message?: {
      protocolMessage?: {
        key?: { id?: string };
        editedMessage?: EvoGoMessageContent;
      };
    };
  };
  protocolMessage?: {
    key?: { id?: string; remoteJid?: string; fromMe?: boolean };
    type?: number; // 0 = revoke/delete
    editedMessage?: EvoGoMessageContent;
  };
}

export interface EvoGoMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  message: EvoGoMessageContent;
  messageTimestamp?: number;
  pushName?: string;
  status?: string;
  source?: string;
}

export interface EvoGoWebhookPayload {
  event: string;
  instance: string;
  data: EvoGoMessage | EvoGoConnectionUpdate | EvoGoHistorySync | unknown;
  // Shorthand fields from top-level
  key?: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  message?: EvoGoMessageContent;
  messageTimestamp?: number;
  pushName?: string;
  sender?: {
    pushName?: string;
    jid?: string;
  };
}

export interface EvoGoConnectionUpdate {
  state: 'open' | 'close' | 'connecting';
  statusReason?: number;
  legacy?: boolean;
}

export interface EvoGoHistorySync {
  messages?: EvoGoMessage[];
  count?: number;
}

// Evolution Go API — Request/Response types

export interface EvoGoCreateInstanceRequest {
  instanceName: string;
  webhook?: {
    url: string;
    events?: string[];
    webhookByEvents?: boolean;
  };
  settings?: {
    rejectCall?: boolean;
    msgCall?: string;
    groupsIgnore?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    readStatus?: boolean;
    syncFullHistory?: boolean;
    syncHistoryDays?: number;
  };
}

export interface EvoGoInstance {
  instance: {
    instanceName: string;
    status: string;
    serverUrl?: string;
    apikey?: string;
  };
}

export interface EvoGoSendTextRequest {
  number: string;
  text: string;
  delay?: number;
  quoted?: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: EvoGoMessageContent;
  };
}

export interface EvoGoSendMediaRequest {
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  mimetype?: string;
  caption?: string;
  media: string; // URL ou base64
  fileName?: string;
}

export interface EvoGoDeleteMessageRequest {
  id: string;
  fromMe: boolean;
  remoteJid: string;
}

export interface EvoGoEditMessageRequest {
  number: string;
  text: string;
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
}
