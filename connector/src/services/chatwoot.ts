// ============================================================
// CHATWOOT SERVICE — Cliente HTTP para a Chatwoot API
// ============================================================

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  ChatwootContact,
  ChatwootConversation,
  ChatwootMessage,
  ChatwootInbox,
  CreateContactRequest,
  CreateConversationRequest,
  CreateMessageRequest,
  CreateInboxRequest,
} from '../types/chatwoot';

class ChatwootService {
  private platformClient: AxiosInstance;

  constructor() {
    // Client para Platform API (SuperAdmin) — usado para criar inboxes, etc.
    this.platformClient = axios.create({
      baseURL: `${config.chatwoot.apiUrl}/auth`,
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': config.chatwoot.platformToken,
      },
      timeout: 30000,
    });

    this.platformClient.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error('[Chatwoot] Erro na requisição:', {
          url: err.config?.url,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );
  }

  /**
   * Retorna cliente autenticado para uma conta específica
   */
  private getAccountClient(accountToken?: string): AxiosInstance {
    return axios.create({
      baseURL: `${config.chatwoot.apiUrl}`,
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': accountToken || config.chatwoot.platformToken,
      },
      timeout: 30000,
    });
  }

  // ──────────────────────────────────────
  // INBOXES
  // ──────────────────────────────────────

  async createInbox(
    accountId: number,
    payload: CreateInboxRequest,
    accountToken?: string
  ): Promise<ChatwootInbox> {
    logger.info(`[Chatwoot] Criando inbox: ${payload.name} na conta ${accountId}`);
    const client = this.getAccountClient(accountToken);
    const res = await client.post(`/api/v1/accounts/${accountId}/inboxes`, payload);
    return res.data;
  }

  async getInbox(accountId: number, inboxId: number, accountToken?: string): Promise<ChatwootInbox> {
    const client = this.getAccountClient(accountToken);
    const res = await client.get(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`);
    return res.data;
  }

  async listInboxes(accountId: number, accountToken?: string): Promise<ChatwootInbox[]> {
    const client = this.getAccountClient(accountToken);
    const res = await client.get(`/api/v1/accounts/${accountId}/inboxes`);
    return res.data?.payload || [];
  }

  async updateInbox(
    accountId: number,
    inboxId: number,
    payload: Partial<CreateInboxRequest> & { webhook_url?: string },
    accountToken?: string
  ): Promise<ChatwootInbox> {
    const client = this.getAccountClient(accountToken);
    const res = await client.patch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, payload);
    return res.data;
  }

  async deleteInbox(accountId: number, inboxId: number, accountToken?: string): Promise<void> {
    const client = this.getAccountClient(accountToken);
    await client.delete(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`);
  }

  // ──────────────────────────────────────
  // CONTATOS
  // ──────────────────────────────────────

  async searchContacts(
    accountId: number,
    query: string,
    accountToken?: string
  ): Promise<ChatwootContact[]> {
    const client = this.getAccountClient(accountToken);
    const res = await client.get(`/api/v1/accounts/${accountId}/contacts/search`, {
      params: { q: query, include_contacts: true },
    });
    return res.data?.payload || [];
  }

  async getOrCreateContact(
    accountId: number,
    phone: string,
    name: string,
    avatarUrl?: string | null,
    accountToken?: string
  ): Promise<ChatwootContact> {
    // Tenta buscar por phone ou identifier
    const results = await this.searchContacts(accountId, phone, accountToken);

    const existing = results.find(
      (c) =>
        c.phone_number?.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, '') ||
        c.identifier === phone
    );

    if (existing) {
      logger.debug(`[Chatwoot] Contato encontrado: ${existing.id}`);
      return existing;
    }

    const isGroup = phone.includes('@g.us');

    return this.createContact(
      accountId,
      {
        name,
        // Se for grupo, não envia phone_number (apenas o identifier) para evitar erro de validação do Chatwoot
        phone_number: isGroup ? undefined : `+${phone.replace(/[^0-9]/g, '')}`,
        identifier: phone,
        avatar_url: avatarUrl || undefined,
      },
      accountToken
    );
  }

  async createContact(
    accountId: number,
    payload: CreateContactRequest,
    accountToken?: string
  ): Promise<ChatwootContact> {
    logger.info(`[Chatwoot] Criando contato: ${payload.name} (${payload.phone_number})`);
    const client = this.getAccountClient(accountToken);
    const res = await client.post(`/api/v1/accounts/${accountId}/contacts`, payload);
    return res.data;
  }

  async updateContact(
    accountId: number,
    contactId: number,
    payload: Partial<CreateContactRequest>,
    accountToken?: string
  ): Promise<ChatwootContact> {
    const client = this.getAccountClient(accountToken);
    const res = await client.put(`/api/v1/accounts/${accountId}/contacts/${contactId}`, payload);
    return res.data;
  }

  // ──────────────────────────────────────
  // CONVERSAS
  // ──────────────────────────────────────

  async getOrCreateConversation(
    accountId: number,
    contactId: number,
    inboxId: number,
    sourceId: string,
    accountToken?: string
  ): Promise<ChatwootConversation> {
    // Busca conversas abertas deste contato neste inbox
    const client = this.getAccountClient(accountToken);

    try {
      const res = await client.get(`/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`);
      const convList: ChatwootConversation[] = res.data?.payload || [];

      const existing = convList.find(
        (c) => c.inbox_id === inboxId && c.status !== 'resolved'
      );

      if (existing) {
        logger.debug(`[Chatwoot] Conversa existente: ${existing.id}`);
        return existing;
      }
    } catch (err) {
      logger.warn('[Chatwoot] Erro ao buscar conversas do contato:', err);
    }

    return this.createConversation(accountId, { inbox_id: inboxId, contact_id: contactId, source_id: sourceId }, accountToken);
  }

  async createConversation(
    accountId: number,
    payload: CreateConversationRequest,
    accountToken?: string
  ): Promise<ChatwootConversation> {
    logger.info(`[Chatwoot] Criando conversa no inbox ${payload.inbox_id}`);
    const client = this.getAccountClient(accountToken);
    const res = await client.post(`/api/v1/accounts/${accountId}/conversations`, payload);
    return res.data;
  }

  async updateConversationStatus(
    accountId: number,
    conversationId: number,
    status: 'open' | 'resolved' | 'pending',
    accountToken?: string
  ): Promise<ChatwootConversation> {
    const client = this.getAccountClient(accountToken);
    const res = await client.patch(`/api/v1/accounts/${accountId}/conversations/${conversationId}`, { status });
    return res?.data;
  }

  // ──────────────────────────────────────
  // MENSAGENS
  // ──────────────────────────────────────

  async createMessage(
    accountId: number,
    conversationId: number,
    payload: CreateMessageRequest,
    accountToken?: string
  ): Promise<ChatwootMessage> {
    const client = this.getAccountClient(accountToken);
    const res = await client.post(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      payload
    );
    return res.data;
  }

  async createMessageWithAttachment(
    accountId: number,
    conversationId: number,
    content: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    messageType: 'incoming' | 'outgoing' = 'incoming',
    accountToken?: string,
    externalSourceId?: string
  ): Promise<ChatwootMessage> {
    const client = this.getAccountClient(accountToken);
    const form = new FormData();

    form.append('content', content);
    form.append('message_type', messageType);
    form.append('attachments[]', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    if (externalSourceId) {
      form.append('external_source_ids[evo_go]', externalSourceId);
    }

    const res = await client.post(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      form,
      { headers: form.getHeaders() }
    );
    return res.data;
  }

  async deleteMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
    accountToken?: string
  ): Promise<void> {
    const client = this.getAccountClient(accountToken);
    await client.delete(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`
    );
  }

  async updateMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
    content: string,
    accountToken?: string
  ): Promise<ChatwootMessage> {
    const client = this.getAccountClient(accountToken);
    const res = await client.patch(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`,
      { content }
    );
    return res.data;
  }

  async listMessages(
    accountId: number,
    conversationId: number,
    accountToken?: string
  ): Promise<ChatwootMessage[]> {
    const client = this.getAccountClient(accountToken);
    const res = await client.get(
      `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`
    );
    return res.data?.payload || [];
  }

  // ──────────────────────────────────────
  // CONTAS
  // ──────────────────────────────────────

  async getAccount(accountId: number, accountToken?: string): Promise<unknown> {
    const client = this.getAccountClient(accountToken);
    const res = await client.get(`/api/v1/accounts/${accountId}`);
    return res.data;
  }

  async listAccounts(): Promise<unknown[]> {
    const res = await this.platformClient.get('/api/v1/auth/sign_in');
    return res.data?.data?.account_details || [];
  }

  // ──────────────────────────────────────
  // UTILS
  // ──────────────────────────────────────

  /**
   * Busca a mensagem do Chatwoot por ID externo da Evolution Go
   */
  async findMessageByExternalId(
    accountId: number,
    conversationId: number,
    evoGoMessageId: string,
    accountToken?: string
  ): Promise<ChatwootMessage | null> {
    try {
      const messages = await this.listMessages(accountId, conversationId, accountToken);
      return messages.find(
        (m) => m.additional_attributes?.evoGoMessageId === evoGoMessageId ||
          m.external_source_ids?.evo_go === evoGoMessageId
      ) || null;
    } catch {
      return null;
    }
  }
}

export const chatwootService = new ChatwootService();
