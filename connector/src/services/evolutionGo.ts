// ============================================================
// EVOLUTION GO SERVICE — Cliente HTTP para a Evolution Go API
// ============================================================

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  EvoGoCreateInstanceRequest,
  EvoGoSendTextRequest,
  EvoGoSendMediaRequest,
  EvoGoDeleteMessageRequest,
  EvoGoEditMessageRequest,
} from '../types/evolutionGo';

class EvolutionGoService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.evolution.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolution.apiKey,
        'globalApikey': config.evolution.apiKey,
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        logger.error('[EvoGo] Erro na requisição:', {
          url: err.config?.url,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );
  }

  // ──────────────────────────────────────
  // INSTÂNCIAS
  // ──────────────────────────────────────

  async createInstance(payload: EvoGoCreateInstanceRequest): Promise<unknown> {
    logger.info(`[EvoGo] Criando instância: ${payload.instanceName}`);
    const res = await this.client.post('/instance/create', payload);
    return res.data;
  }

  async getInstance(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/instance/${instanceName}`);
    return res.data;
  }

  async deleteInstance(instanceName: string): Promise<unknown> {
    logger.info(`[EvoGo] Deletando instância: ${instanceName}`);
    const res = await this.client.delete(`/instance/${instanceName}`);
    return res.data;
  }

  async getInstanceStatus(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/instance/${instanceName}/status`);
    return res.data;
  }

  async getQrCode(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/instance/${instanceName}/qrcode`);
    return res.data;
  }

  async listInstances(): Promise<unknown[]> {
    const res = await this.client.get('/instance/list');
    return res.data;
  }

  async connectInstance(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/instance/${instanceName}/connect`);
    return res.data;
  }

  async disconnectInstance(instanceName: string): Promise<unknown> {
    const res = await this.client.delete(`/instance/${instanceName}/logout`);
    return res.data;
  }

  // ──────────────────────────────────────
  // WEBHOOK
  // ──────────────────────────────────────

  async setWebhook(
    instanceName: string,
    webhookUrl: string,
    events: string[] = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'CONNECTION_UPDATE', 'HISTORY_SET']
  ): Promise<unknown> {
    logger.info(`[EvoGo] Configurando webhook para ${instanceName}: ${webhookUrl}`);
    const res = await this.client.post(`/webhook/set/${instanceName}`, {
      url: webhookUrl,
      enabled: true,
      webhookByEvents: false,
      webhookBase64: false,
      events,
    });
    return res.data;
  }

  async getWebhook(instanceName: string): Promise<unknown> {
    const res = await this.client.get(`/webhook/find/${instanceName}`);
    return res.data;
  }

  // ──────────────────────────────────────
  // MENSAGENS — ENVIO
  // ──────────────────────────────────────

  async sendText(instanceName: string, payload: EvoGoSendTextRequest): Promise<unknown> {
    logger.info(`[EvoGo] Enviando texto para ${payload.number} via ${instanceName}`);
    const res = await this.client.post(`/message/sendText/${instanceName}`, payload);
    return res.data;
  }

  async sendMedia(instanceName: string, payload: EvoGoSendMediaRequest): Promise<unknown> {
    logger.info(`[EvoGo] Enviando mídia (${payload.mediatype}) para ${payload.number} via ${instanceName}`);
    const res = await this.client.post(`/message/sendMedia/${instanceName}`, payload);
    return res.data;
  }

  async sendAudio(instanceName: string, number: string, audioUrl: string): Promise<unknown> {
    logger.info(`[EvoGo] Enviando áudio para ${number} via ${instanceName}`);
    const res = await this.client.post(`/message/sendWhatsAppAudio/${instanceName}`, {
      number,
      audio: audioUrl,
      delay: 1200,
    });
    return res.data;
  }

  async sendMediaFromFormData(
    instanceName: string,
    number: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
    caption?: string
  ): Promise<unknown> {
    const form = new FormData();
    form.append('number', number);
    form.append('caption', caption || '');
    form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });

    logger.info(`[EvoGo] Enviando arquivo ${fileName} para ${number} via ${instanceName}`);
    const res = await this.client.post(`/message/sendMedia/${instanceName}`, form, {
      headers: form.getHeaders(),
    });
    return res.data;
  }

  // ──────────────────────────────────────
  // MENSAGENS — EDITAR / DELETAR
  // ──────────────────────────────────────

  async deleteMessage(instanceName: string, payload: EvoGoDeleteMessageRequest): Promise<unknown> {
    logger.info(`[EvoGo] Deletando mensagem ${payload.id} em ${instanceName}`);
    const res = await this.client.delete(`/chat/deleteMessage/${instanceName}`, {
      data: payload,
    });
    return res.data;
  }

  async editMessage(instanceName: string, payload: EvoGoEditMessageRequest): Promise<unknown> {
    logger.info(`[EvoGo] Editando mensagem ${payload.key.id} em ${instanceName}`);
    const res = await this.client.put(`/message/editMessage/${instanceName}`, payload);
    return res.data;
  }

  // ──────────────────────────────────────
  // HISTÓRICO
  // ──────────────────────────────────────

  async fetchMessages(
    instanceName: string,
    remoteJid: string,
    count = 50
  ): Promise<unknown> {
    const res = await this.client.post(`/chat/findMessages/${instanceName}`, {
      where: { key: { remoteJid } },
      limit: count,
    });
    return res.data;
  }

  // ──────────────────────────────────────
  // CONTATOS / CHATS
  // ──────────────────────────────────────

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
}

export const evolutionGoService = new EvolutionGoService();
