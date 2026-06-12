// ============================================================
// MEDIA SERVICE — Download e proxy de mídia
// ============================================================

import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

class MediaService {
  /**
   * Baixa mídia da Evolution Go e retorna como Buffer
   */
  async downloadFromEvoGo(
    instanceName: string,
    messageId: string,
    mediaUrl?: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
    try {
      // Se já temos a URL diretamente (WEBHOOKFILES=true)
      if (mediaUrl && mediaUrl.startsWith('http')) {
        return this.downloadFromUrl(mediaUrl);
      }

      // Caso contrário, tenta baixar via API da Evolution Go
      const apiUrl = `${config.evolution.apiUrl}/chat/getBase64FromMediaMessage`;
      const res = await axios.post(
        apiUrl,
        {
          message: { key: { id: messageId } },
          convertToMp4: false,
        },
        {
          headers: {
            'apikey': config.evolution.apiKey,
            'Content-Type': 'application/json',
          },
          params: { instanceName },
          timeout: 30000,
        }
      );

      if (res.data?.base64) {
        const buffer = Buffer.from(res.data.base64, 'base64');
        return {
          buffer,
          mimeType: res.data.mimetype || 'application/octet-stream',
          fileName: res.data.fileName || `file_${messageId}`,
        };
      }

      return null;
    } catch (err) {
      logger.warn(`[Media] Erro ao baixar mídia ${messageId}:`, err);
      return null;
    }
  }

  /**
   * Baixa mídia de uma URL pública
   */
  async downloadFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'EvoGo-Connector/1.0',
        },
      });

      const rawMime = res.headers['content-type'];
      const mimeType = typeof rawMime === 'string' ? rawMime : 'application/octet-stream';
      const fileName = this.fileNameFromUrl(url, mimeType);
      const buffer = Buffer.from(res.data);

      return { buffer, mimeType, fileName };
    } catch (err) {
      logger.warn(`[Media] Erro ao baixar URL ${url}:`, err);
      return null;
    }
  }

  /**
   * Baixa mídia do Chatwoot
   */
  async downloadFromChatwoot(url: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
    return this.downloadFromUrl(url);
  }

  /**
   * Determina extensão baseada no MIME type
   */
  private extensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/webm': 'webm',
      'application/pdf': 'pdf',
      'application/octet-stream': 'bin',
    };
    const base = mime.split(';')[0].trim();
    return map[base] || 'bin';
  }

  /**
   * Extrai nome do arquivo da URL
   */
  private fileNameFromUrl(url: string, mimeType: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last.includes('.')) return last;
    } catch {
      // ignora
    }
    return `attachment.${this.extensionFromMime(mimeType)}`;
  }

  /**
   * Determina o tipo de mídia Chatwoot baseado no MIME
   */
  chatwootFileType(mimeType: string): 'image' | 'audio' | 'video' | 'file' {
    const base = mimeType.split(';')[0].trim();
    if (base.startsWith('image/')) return 'image';
    if (base.startsWith('audio/') || base.includes('ogg')) return 'audio';
    if (base.startsWith('video/')) return 'video';
    return 'file';
  }

  /**
   * Determina tipo Evolution Go baseado no MIME
   */
  evoGoMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    const base = mimeType.split(';')[0].trim();
    if (base.startsWith('image/')) return 'image';
    if (base.startsWith('video/')) return 'video';
    if (base.startsWith('audio/')) return 'audio';
    return 'document';
  }
}

export const mediaService = new MediaService();
