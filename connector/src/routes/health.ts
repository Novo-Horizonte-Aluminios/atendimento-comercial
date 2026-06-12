// ============================================================
// HEALTH ROUTE — Verifica se o conector está funcionando
// ============================================================

import { Router, Request, Response } from 'express';
import { config } from '../config';
import { db } from '../services/database';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const instances = db.findAll();

  res.json({
    status: 'ok',
    service: 'evo-go-chatwoot-connector',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    instances: {
      total: instances.length,
      active: instances.filter((i) => i.status === 'active').length,
      inactive: instances.filter((i) => i.status === 'inactive').length,
      connecting: instances.filter((i) => i.status === 'connecting').length,
    },
    config: {
      evolutionApiUrl: config.evolution.apiUrl,
      chatwootApiUrl: config.chatwoot.apiUrl,
      connectorWebhookUrl: config.connector.webhookUrl,
    },
  });
});
