-- Script de criação para a tabela no PostgreSQL (Supabase)

CREATE TABLE public.clientes_atendimento (
  telefone VARCHAR(20) PRIMARY KEY,
  cliente_id VARCHAR(100),
  vendedor_id INTEGER,
  vendedor_nome VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criação de um índice no telefone, no caso do banco fazer scanning.
-- (Como o telefone é a Primary Key, ele já é indexado e único por padrão)
CREATE INDEX IF NOT EXISTS idx_clientes_atendimento_telefone 
ON public.clientes_atendimento(telefone);

-- Função para atualizar o updated_at automaticamente no momento do Upsert
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_clientes_atendimento_modtime
BEFORE UPDATE ON public.clientes_atendimento
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
