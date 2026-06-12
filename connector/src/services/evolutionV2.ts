// ============================================================
// EVOLUTION V2 SERVICE — Cliente HTTP para Evolution API v2 (Baileys)
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

class EvolutionV2Service {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.evolutionV2.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolutionV2.apiKey,
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error('[EvoV2] Erro na requisição:', {
          url: err.config?.url,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );
  }

  async createInstance(instanceName: string, webhookUrl: string, historyDays?: number): Promise<unknown> {
    logger.info(`[EvoV2] Criando instância: ${instanceName}`);
    const payload: Record<string, unknown> = {
      instanceName,
      integration: 'CHATWOOT',
      webhook: {
        url: webhookUrl,
        enabled: true,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'CONNECTION_UPDATE', 'HISTORY_SET'],
        webhookByEvents: false,
      },
    };

    if (historyDays && historyDays > 0) {
      payload.chatwoot = {
        syncFullHistory: true,
        daysLimitImportMessages: historyDays,
      };
    }

    const res = await this.client.post('/instance/create', payload);
    return res.data;
  }

  async getQrCode(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/instance/connect/${instanceName}`);
    return res.data;
  }

  async getInstanceStatus(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/instance/connectionState/${instanceName}`);
    return res.data;
  }

  async deleteInstance(instanceName: string): Promise<unknown> {
    const res = await this.client.delete(`/instance/delete/${instanceName}`);
    return res.data;
  }

  async sendText(instanceName: string, number: string, text: string, quotedId?: string): Promise<unknown> {
    const payload: Record<string, unknown> = { number, text };
    if (quotedId) payload.quoted = { key: { id: quotedId } };
    const res = await this.client.post(`/message/sendText/${instanceName}`, payload);
    return res.data;
  }

  async sendMedia(
    instanceName: string,
    number: string,
    mediatype: string,
    media: string,
    caption?: string,
    fileName?: string,
    mimetype?: string
  ): Promise<unknown> {
    const res = await this.client.post(`/message/sendMedia/${instanceName}`, {
      number,
      mediatype,
      media,
      caption,
      fileName,
      mimetype,
    });
    return res.data;
  }

  async sendAudio(instanceName: string, number: string, audio: string): Promise<unknown> {
    const res = await this.client.post(`/message/sendWhatsAppAudio/${instanceName}`, {
      number,
      audio,
    });
    return res.data;
  }

  async deleteMessage(instanceName: string, remoteJid: string, messageId: string, fromMe: boolean): Promise<unknown> {
    const res = await this.client.delete(`/chat/deleteMessage/${instanceName}`, {
      data: {
        id: messageId,
        fromMe,
        remoteJid,
        participant: undefined,
      },
    });
    return res.data;
  }

  async editMessage(instanceName: string, number: string, messageId: string, text: string, remoteJid: string): Promise<unknown> {
    const res = await this.client.put(`/message/updateMessage/${instanceName}`, {
      number,
      key: { id: messageId, remoteJid, fromMe: true },
      text,
    });
    return res.data;
  }

  async getProfilePicture(instanceName: string, number: string): Promise<string | null> {
    try {
      const res = await this.client.get(`/chat/fetchProfilePictureUrl/${instanceName}`, {
        params: { number },
      });
      return res.data?.profilePictureUrl || null;
    } catch {
      return null;
    }
  }

  async setWebhook(instanceName: string, webhookUrl: string): Promise<unknown> {
    const res = await this.client.post(`/webhook/set/${instanceName}`, {
      url: webhookUrl,
      enabled: true,
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'CONNECTION_UPDATE'],
    });
    return res.data;
  }
}

export const evolutionV2Service = new EvolutionV2Service();
