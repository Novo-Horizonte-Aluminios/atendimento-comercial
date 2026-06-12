// ============================================================
// CONFIG — Centraliza todas as variáveis de ambiente
// ============================================================

export type Provider = 'evolution_go' | 'evolution_v2';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Connector secret (para autenticar requisições internas do Kanban)
  connectorSecret: process.env.CONNECTOR_SECRET || 'connector-secret-change-me',

  // ─── Evolution Go (whatsmeow/Go) ─────────────────────────
  evolution: {
    apiUrl: (process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''),
    apiKey: process.env.EVOLUTION_API_KEY || '',
  },

  // ─── Evolution API v2 (Baileys) ──────────────────────────
  evolutionV2: {
    apiUrl: (process.env.EVOLUTION_V2_API_URL || '').replace(/\/$/, ''),
    apiKey: process.env.EVOLUTION_V2_API_KEY || '',
  },

  chatwoot: {
    apiUrl: (process.env.CHATWOOT_API_URL || '').replace(/\/$/, ''),
    platformToken: process.env.CHATWOOT_PLATFORM_API_TOKEN || '',
  },

  kanban: {
    apiUrl: (process.env.KANBAN_API_URL || '').replace(/\/$/, ''),
    internalUrl: (process.env.KANBAN_INTERNAL_URL || '').replace(/\/$/, ''),
  },

  connector: {
    // URL interna para os webhooks apontarem para o conector
    webhookUrl: (process.env.CONNECTOR_WEBHOOK_URL || 'http://evo_go_connector:3000').replace(/\/$/, ''),
    // Ignorar grupos ou não (padrão: true)
    ignoreGroups: process.env.IGNORE_GROUPS !== 'false',
  },

  database: {
    chatwootUrl: process.env.CHATWOOT_DATABASE_URL || '',
  },
} as const;

export type Config = typeof config;
