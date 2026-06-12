import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import { webhookEvolutionRouter } from './routes/webhookEvolution';
import { webhookChatwootRouter } from './routes/webhookChatwoot';
import { instanceRouter } from './routes/instance';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Trust proxy (for Traefik)
app.set('trust proxy', 1);

// ============================================
// ROTAS
// ============================================

// Health check
app.use('/health', healthRouter);

// Webhooks da Evolution Go → recebe eventos WhatsApp
app.use('/webhooks/evolution', webhookEvolutionRouter);

// Webhooks do Chatwoot → recebe mensagens dos agentes
app.use('/webhooks/chatwoot', webhookChatwootRouter);

// API de gestão de instâncias (chamada pelo Kanban)
app.use('/api/instances', instanceRouter);

// Error handler
app.use(errorHandler);

// ============================================
// START
// ============================================
const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`╔══════════════════════════════════════════════╗`);
  logger.info(`║   Evolution Go ↔ Chatwoot Connector v1.0    ║`);
  logger.info(`║   Rodando na porta ${PORT}                      ║`);
  logger.info(`╚══════════════════════════════════════════════╝`);
  logger.info(`Evolution Go URL: ${process.env.EVOLUTION_API_URL}`);
  logger.info(`Chatwoot URL:     ${process.env.CHATWOOT_API_URL}`);
});

export default app;
