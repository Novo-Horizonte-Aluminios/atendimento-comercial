// ============================================================
// TYPES — Tipos para Chatwoot API
// ============================================================

export interface ChatwootContact {
  id: number;
  name: string;
  phone_number?: string;
  identifier?: string;
  avatar_url?: string;
  additional_attributes?: Record<string, unknown>;
}

export interface ChatwootConversation {
  id: number;
  inbox_id: number;
  account_id: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  meta?: {
    sender?: ChatwootContact;
    assignee?: ChatwootAgent;
  };
  additional_attributes?: Record<string, unknown>;
  contact_inbox?: {
    id: number;
    contact_id: number;
    inbox_id: number;
    source_id: string;
  };
}

export interface ChatwootMessage {
  id: number;
  content: string;
  content_type: 'text' | 'input_select' | 'cards' | 'form';
  message_type: 0 | 1 | 2 | 3; // 0=incoming, 1=outgoing, 2=activity, 3=template
  account_id: number;
  conversation_id: number;
  created_at: number;
  private?: boolean;
  attachments?: ChatwootAttachment[];
  sender?: ChatwootAgent | ChatwootContact;
  external_source_ids?: Record<string, string>;
  additional_attributes?: {
    evoGoMessageId?: string;
    evoGoInstance?: string;
    evoGoFromMe?: boolean;
    [key: string]: unknown;
  };
}

export interface ChatwootAttachment {
  id: number;
  message_id: number;
  file_type: 'image' | 'audio' | 'video' | 'file';
  account_id: number;
  extension?: string;
  data_url: string;
  thumb_url?: string;
  file_size?: number;
}

export interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: string;
  account_id: number;
  webhook_url?: string;
  channel?: {
    phone_number?: string;
  };
}

export interface ChatwootAgent {
  id: number;
  name: string;
  email?: string;
  role?: string;
  availability_status?: string;
}

export interface ChatwootWebhookPayload {
  event: string;
  id?: number;
  account?: { id: number };
  conversation?: ChatwootConversation;
  message?: ChatwootMessage & {
    message_type: 0 | 1 | 2 | 3;
  };
  contact?: ChatwootContact;
  inbox?: ChatwootInbox;
  sender?: ChatwootAgent | ChatwootContact;
  changed_attributes?: Record<string, { current_value: unknown; previous_value: unknown }>;
}

// Request bodies
export interface CreateContactRequest {
  name: string;
  phone_number?: string;
  identifier?: string;
  avatar_url?: string;
  additional_attributes?: Record<string, unknown>;
}

export interface CreateConversationRequest {
  inbox_id: number;
  contact_id: number;
  source_id?: string;
  additional_attributes?: Record<string, unknown>;
}

export interface CreateMessageRequest {
  content: string;
  message_type?: 'incoming' | 'outgoing';
  private?: boolean;
  attachments?: File[] | string[];
  external_source_ids?: Record<string, string>;
  additional_attributes?: Record<string, unknown>;
  content_attributes?: Record<string, unknown>;
}

export interface CreateInboxRequest {
  name: string;
  channel: {
    type: 'api';
    webhook_url?: string;
  };
}
