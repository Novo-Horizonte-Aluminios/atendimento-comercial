// ============================================================
// DATABASE SERVICE — Persistência do mapeamento de instâncias
// ============================================================
//
// Guarda a relação:
import { Provider } from '../config';
//   evo_instance_name ↔ chatwoot_inbox_id ↔ chatwoot_account_id
//
// Usa SQLite (via arquivo JSON simples) para não precisar de banco externo.
// Em produção, pode migrar para Postgres.
// ============================================================

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'instances.json');

export interface InstanceRecord {
  id: string;
  instanceName: string;          // Nome na Evolution Go ou Evolution V2
  provider: Provider;            // 'evolution_go' | 'evolution_v2'
  inboxId: number;               // ID da inbox no Chatwoot
  accountId: number;             // ID da conta no Chatwoot
  accountToken?: string;         // Token de agente/conta no Chatwoot
  connectorToken: string;        // Token do conector (para autenticar webhooks)
  chatwootWebhookUrl?: string;   // URL do webhook do Chatwoot
  historyDays?: number;          // Dias de histórico para importar
  status: 'active' | 'inactive' | 'connecting';
  phone?: string;                // Número de telefone conectado
  createdAt: string;
  updatedAt: string;
}

class DatabaseService {
  private instances: Map<string, InstanceRecord> = new Map();

  constructor() {
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      logger.info(`[DB] Diretório de dados criado: ${DATA_DIR}`);
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw) as InstanceRecord[];
        data.forEach((record) => {
          this.instances.set(record.instanceName, record);
        });
        logger.info(`[DB] ${this.instances.size} instância(s) carregada(s)`);
      }
    } catch (err) {
      logger.error('[DB] Erro ao carregar dados:', err);
    }
  }

  private save(): void {
    try {
      const data = Array.from(this.instances.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[DB] Erro ao salvar dados:', err);
    }
  }

  // ──────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────

  findByInstanceName(instanceName: string): InstanceRecord | undefined {
    return this.instances.get(instanceName);
  }

  findByInboxId(inboxId: number): InstanceRecord | undefined {
    return Array.from(this.instances.values()).find((r) => r.inboxId === inboxId);
  }

  findAll(): InstanceRecord[] {
    return Array.from(this.instances.values());
  }

  upsert(record: InstanceRecord): void {
    record.updatedAt = new Date().toISOString();
    this.instances.set(record.instanceName, record);
    this.save();
    logger.info(`[DB] Instância salva: ${record.instanceName}`);
  }

  delete(instanceName: string): boolean {
    const deleted = this.instances.delete(instanceName);
    if (deleted) this.save();
    return deleted;
  }

  updateStatus(instanceName: string, status: InstanceRecord['status']): void {
    const record = this.instances.get(instanceName);
    if (record) {
      record.status = status;
      record.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  updatePhone(instanceName: string, phone: string): void {
    const record = this.instances.get(instanceName);
    if (record) {
      record.phone = phone;
      record.updatedAt = new Date().toISOString();
      this.save();
    }
  }
}

export const db = new DatabaseService();
