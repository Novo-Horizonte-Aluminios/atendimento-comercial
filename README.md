# Atendimento Comercial - Integração Oracle, Chatwoot e Supabase

Sistema atuando como Middleware (Express/Node.js) responsável por gerir integrações de banco de dados e Webhooks de sistema Ominichannel para Roteamento de Atendimento a Vendedores Específicos.

## Setup Inicial (Desenvolvimento Local)

1. Preencha as variáveis de ambiente copiando o arquivo `.env.example` para `.env` com suas próprias credenciais:
   ```bash
   cp .env.example .env
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Rode o serviço:
   ```bash
   npm run dev
   ```

A aplicação provê um Webhook que deverá ser configurado no painel do Chatwoot no Endpoint: `http://SEU_IP_OU_DOMINIO:3000/webhook/chatwoot`

## Sincronização Local (Oracle -> Supabase)

O serviço tem um Worker na camada interna agendando (por padrão a cada 1 hora no minuto zero) a busca de todos os telefones de clientes no Banco de Dados Oracle (A query pode ser configurada no arquivo: `src/config/oracle.js`) para inserção no banco de Alta Disponibilidade (Ex: Supabase Postgres). 

### Setup da Tabela no PostgreSQL Server / Supabase
O Script está em `src/database.sql`. Rodar lá no banco de dados desejado:
```sql
CREATE TABLE public.clientes_atendimento (
  telefone VARCHAR(20) PRIMARY KEY,
  cliente_id VARCHAR(100),
  vendedor_id INTEGER,
  vendedor_nome VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Para triggers de update rodar o resíduo do arquivo `src/database.sql`.
```

## Como Citar no Chatwoot (Instruções Webhook)

Quando estiver configurando a Caixa de Entrada no Chatwoot para Webhook, ative a Opção "Message Created".
A API responderá rapidamente com as seguintes assinaturas:

- `status: processando_roteamento` 
- E se o telefone não conter o vendedor ideal cadastrado no DB Oracle, fará fallback (Atribuirá o chamado a fila ou vendedor definido em `.env` `ID_FILA_PADRAO_VENDEDOR`)

Exemplo Payload Chatwoot (Emitido ao sistema):
```json
{
  "event": "message_created",
  "message_type": "incoming",
  "conversation": {
    "id": 1234
  },
  "sender": {
    "phone_number": "+5511999999999"
  }
}
```

## Instruções de Deploy (Servidor na Nuvem)

### cPanel (Via Node.js Application)
No painel do cPanel com suporte a *Setup Node.js App*:
1. Escolha versão de `Node.js >= 16`.
2. Em App Directory, inclua os arquivos dessa pasta (ignorar `node_modules`).
3. App Start File preencha como `src/app.js`.
4. Defina as Environment Variables pela aba do software no cPanel.
5. Inicie a Web App. 

### Railway / Render
1. Crie um repositório no Github com este código fonte.
2. Crie um `New Service` > `Web Service` conectando a este repositório no Github.
3. Coloque de Build Command: `npm install` e Start Command: `npm start`.
4. Transfira as ENV Variables de seu arquivo `.env` para a aba `Variables`/`Environment`.
5. Deploy inicializará a Aplicação Automaticamente. Não se esqueça de usar o Domínio emitido por eles na sua configuração de Webhook do Chatwoot.

## Disparo Manual da Sync
Se precisar disparar sem aguardar 1 hora, você pode enviar um `POST` para o ambiente via curl ou Postman para repovoar os clientes:
```bash
curl -X POST http://localhost:3000/api/sync-manual
```
