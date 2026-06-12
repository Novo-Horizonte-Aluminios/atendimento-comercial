// ============================================================
// INSTANCE ROUTER — API de gestão de instâncias
// Chamada pelo Kanban para criar/deletar/listar conexões
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { evolutionGoService } from '../services/evolutionGo';
import { chatwootService } from '../services/chatwoot';
import { db, InstanceRecord } from '../services/database';
import { config } from '../config';
import { logger } from '../utils/logger';

export const instanceRouter = Router();

// Middleware de autenticação por token do conector
instanceRouter.use((req: Request, res: Response, next) => {
  const token =
    req.headers['x-connector-token'] ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (token !== config.connectorSecret) {
    logger.warn(`[Instance] Token inválido: ${token?.toString().slice(0, 10)}...`);
    return res.status(401).json({ error: 'Token inválido' });
  }
  next();
});

// ──────────────────────────────────────────────
// POST /api/instances/create
// Cria uma nova instância e configura tudo automaticamente
// ──────────────────────────────────────────────
instanceRouter.post('/create', async (req: Request, res: Response) => {
  const {
    instanceName,
    accountId,
    accountToken,
    historyDays = 0,
  } = req.body as {
    instanceName: string;
    accountId: number;
    accountToken?: string;
    historyDays?: number;
  };

  if (!instanceName || !accountId) {
    return res.status(400).json({ error: 'instanceName e accountId são obrigatórios' });
  }

  logger.info(`[Instance] Criando nova instância: ${instanceName}`);

  try {
    // 1. Define URL do webhook para esta instância
    const webhookUrl = `${config.connector.webhookUrl}/webhooks/evolution/${instanceName}`;

    // 2. Cria a instância na Evolution Go
    await evolutionGoService.createInstance({
      instanceName,
      webhook: {
        url: webhookUrl,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'CONNECTION_UPDATE',
          'HISTORY_SET',
        ],
        webhookByEvents: false,
      },
      settings: {
        syncFullHistory: historyDays > 0,
        syncHistoryDays: historyDays > 0 ? historyDays : undefined,
      },
    });

    // 3. Cria inbox no Chatwoot vinculada ao conector
    const chatwootWebhookUrl = `${config.connector.webhookUrl}/webhooks/chatwoot`;

    const inbox = await chatwootService.createInbox(
      accountId,
      {
        name: instanceName,
        channel: {
          type: 'api',
          webhook_url: chatwootWebhookUrl,
        },
      },
      accountToken
    );

    // 4. Salva o registro no banco local
    const record: InstanceRecord = {
      id: uuidv4(),
      instanceName,
      provider: 'evolution_go',
      inboxId: inbox.id,
      accountId,
      accountToken,
      connectorToken: config.connectorSecret,
      chatwootWebhookUrl,
      historyDays,
      status: 'connecting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.upsert(record);

    // 5. Retorna o QR code para o usuário conectar
    const qrData = await evolutionGoService.getQrCode(instanceName);

    logger.info(`[Instance] Instância ${instanceName} criada com sucesso. Inbox: ${inbox.id}`);

    return res.status(201).json({
      success: true,
      instanceName,
      inboxId: inbox.id,
      accountId,
      webhookUrl,
      qrCode: qrData,
    });
  } catch (err: unknown) {
    logger.error(`[Instance] Erro ao criar instância ${instanceName}:`, err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// ──────────────────────────────────────────────
// GET /api/instances/:instanceName/qrcode
// ──────────────────────────────────────────────
instanceRouter.get('/:instanceName/qrcode', async (req: Request, res: Response) => {
  const { instanceName } = req.params;
  try {
    const qrData = await evolutionGoService.getQrCode(instanceName);
    return res.json(qrData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// ──────────────────────────────────────────────
// GET /api/instances/:instanceName/status
// ──────────────────────────────────────────────
instanceRouter.get('/:instanceName/status', async (req: Request, res: Response) => {
  const { instanceName } = req.params;
  const local = db.findByInstanceName(instanceName);

  try {
    const evoStatus = await evolutionGoService.getInstanceStatus(instanceName);
    return res.json({
      instanceName,
      localStatus: local?.status,
      evoGoStatus: evoStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar status';
    return res.status(500).json({ error: message });
  }
});

// ──────────────────────────────────────────────
// GET /api/instances
// Lista todas as instâncias registradas
// ──────────────────────────────────────────────
instanceRouter.get('/', async (_req: Request, res: Response) => {
  const instances = db.findAll();
  return res.json({
    count: instances.length,
    instances: instances.map((r) => ({
      instanceName: r.instanceName,
      inboxId: r.inboxId,
      accountId: r.accountId,
      status: r.status,
      phone: r.phone,
      createdAt: r.createdAt,
    })),
  });
});

// ──────────────────────────────────────────────
// DELETE /api/instances/:instanceName
// Remove a instância da Evolution Go e do Chatwoot
// ──────────────────────────────────────────────
instanceRouter.delete('/:instanceName', async (req: Request, res: Response) => {
  const { instanceName } = req.params;
  const record = db.findByInstanceName(instanceName);

  try {
    // Desconecta da Evolution Go
    await evolutionGoService.deleteInstance(instanceName).catch(() => null);

    // Remove do banco local
    db.delete(instanceName);

    logger.info(`[Instance] Instância ${instanceName} removida`);
    return res.json({ success: true, instanceName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// ──────────────────────────────────────────────
// POST /api/instances/:instanceName/disconnect
// Desconecta o WhatsApp sem deletar a instância
// ──────────────────────────────────────────────
instanceRouter.post('/:instanceName/disconnect', async (req: Request, res: Response) => {
  const { instanceName } = req.params;
  try {
    await evolutionGoService.disconnectInstance(instanceName);
    db.updateStatus(instanceName, 'inactive');
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});

// ──────────────────────────────────────────────
// POST /api/instances/:instanceName/reconnect
// Reconecta e retorna novo QR code
// ──────────────────────────────────────────────
instanceRouter.post('/:instanceName/reconnect', async (req: Request, res: Response) => {
  const { instanceName } = req.params;
  try {
    const qrData = await evolutionGoService.connectInstance(instanceName);
    db.updateStatus(instanceName, 'connecting');
    return res.json({ success: true, qrCode: qrData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return res.status(500).json({ error: message });
  }
});
