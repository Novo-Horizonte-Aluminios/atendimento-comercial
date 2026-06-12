# 📦 Evolution Go ↔ Chatwoot — Guia de Instalação Completo

## Visão Geral

Este conector faz a ponte entre a **Evolution Go** (nova API WhatsApp em Go) e o **Chatwoot**. Como a Evolution Go não tem integração nativa com o Chatwoot, este microserviço atua como intermediário.

```
WhatsApp ←→ Evolution Go ←→ [Conector] ←→ Chatwoot
```

---

## Pré-requisitos

Antes de instalar o conector, você precisa ter:
- ✅ Portainer instalado e funcionando
- ✅ Traefik configurado (rede `network_public`)
- ✅ Chatwoot instalado e acessível
- ✅ Kanban CW instalado (módulo extra do Chatwoot)
- ✅ Evolution Go instalada (stack `evolution-go.yaml`)

---

## Passo 1 — Instalar a Evolution Go

Use o arquivo [evolution-go.yaml](./evolution-go.yaml).

**Edite antes de fazer o deploy:**

```yaml
# Linha 13 — Mude para uma chave segura
GLOBAL_API_KEY: "evolution-global-apikey-2026"

# Linha 61 — Coloque seu subdomínio
- traefik.http.routers.evolution_go.rule=Host(`api2.emersontorres.com.br`)
```

**Passos no Portainer:**
1. Vá em **Stacks → Add Stack**
2. Nome: `evolution_go`
3. Cole o conteúdo do arquivo
4. Clique em **Deploy the stack**

**Acesse o Manager:** `https://api2.emersontorres.com.br/manager/login`
- No primeiro acesso, registre com seu e-mail para ativar a licença (gratuito)

---

## Passo 2 — Gerar o Token Secreto do Conector

```bash
# Linux/Mac/WSL
openssl rand -hex 32

# Exemplo de resultado:
# a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

Salve este token — você vai precisar dele no próximo passo.

---

## Passo 3 — Obter o Token de Super Admin do Chatwoot

1. Acesse seu Chatwoot
2. Vá em **Super Admin** (menu do topo, ícone de engrenagem)
3. Navegue até **API Access Token**
4. Copie o token

---

## Passo 4 — Criar o Volume do Conector

No servidor, execute:

```bash
docker volume create evo_go_connector_data
```

Ou via Portainer: **Volumes → Add Volume → Nome: `evo_go_connector_data`**

---

## Passo 5 — Deploy do Conector

Use o arquivo [connector-stack.yml](./connector-stack.yml).

**Edite as variáveis antes de fazer o deploy:**

```yaml
# Token secreto (gerado no Passo 2)
CONNECTOR_SECRET: "seu-token-gerado-aqui"

# Token SuperAdmin do Chatwoot (Passo 3)
CHATWOOT_PLATFORM_API_TOKEN: "seu-token-do-chatwoot-aqui"
```

**Passos no Portainer:**
1. Vá em **Stacks → Add Stack**
2. Nome: **`evo_go_connector`** ← EXATAMENTE este nome!
3. Cole o conteúdo do arquivo com suas variáveis editadas
4. Clique em **Deploy the stack**

> ⚠️ **IMPORTANTE:** O conector NÃO tem subdomínio público. Ele só é acessível internamente via Docker.

---

## Passo 6 — Verificar o Conector

Após o deploy, verifique os logs no Portainer:

```
╔══════════════════════════════════════════════╗
║   Evolution Go ↔ Chatwoot Connector v1.0    ║
║   Rodando na porta 3000                      ║
╚══════════════════════════════════════════════╝
```

Para verificar via curl interno (no servidor):
```bash
docker exec -it <container_id> wget -qO- http://localhost:3000/health
```

---

## Passo 7 — Criar uma Conexão no Kanban

1. Acesse seu Kanban: `https://kanban.emersontorres.com.br`
2. Vá em **Conexões** (menu lateral)
3. Clique em **Adicionar nova conexão**
4. Selecione o provedor: **Evolution Go**
5. Preencha:
   - **Nome da conexão**: nome descritivo (ex: "Suporte")
   - **Dias de histórico**: quantos dias de mensagens importar (0 = sem importação)
6. Clique em **Criar instância**
7. Aguarde o QR Code aparecer
8. Escaneie com seu WhatsApp
9. Pronto! ✅

---

## Passo 8 — Testar a Integração

1. Envie uma mensagem para o número conectado
2. Verifique se aparece no Chatwoot (seção **Conversas**)
3. Responda pelo Chatwoot
4. Verifique se a resposta chegou no WhatsApp

### Funcionalidades disponíveis:
- ✅ Receber mensagens de texto
- ✅ Receber imagens, vídeos, áudios, documentos
- ✅ Enviar mensagens de texto
- ✅ Enviar mídias
- ✅ Editar mensagens
- ✅ Excluir mensagens
- ✅ Encaminhar mensagens
- ✅ Importar histórico de conversas

---

## Arquitetura dos Arquivos

```
Evolution-Go-no-Chawoot/
├── 1 - redis.yaml              # Stack Redis compartilhado
├── 2 - evolution.yaml          # Evolution API v2 (Baileys - legado)
├── 3 - chatwoot_mega.yaml      # Stack do Chatwoot
├── evolution-go.yaml           # Stack da Evolution Go (nova versão)
├── kanbanscript - 0.0.6.yml    # Stack do Kanban CW
├── connector-stack.yml         # ← Stack do Conector (novo!)
└── connector/                  # ← Código fonte do Conector (novo!)
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── src/
        ├── index.ts            # Entry point
        ├── config.ts           # Configurações
        ├── routes/
        │   ├── webhookEvolution.ts   # Recebe da Evolution Go
        │   ├── webhookChatwoot.ts    # Recebe do Chatwoot
        │   ├── instance.ts           # API de instâncias
        │   └── health.ts             # Health check
        ├── services/
        │   ├── evolutionGo.ts        # Cliente Evolution Go
        │   ├── chatwoot.ts           # Cliente Chatwoot
        │   ├── database.ts           # Persistência local
        │   └── media.ts              # Download de mídia
        ├── types/
        │   ├── evolutionGo.ts        # Tipos da Evolution Go
        │   └── chatwoot.ts           # Tipos do Chatwoot
        ├── utils/
        │   ├── logger.ts             # Logger
        │   └── mapper.ts             # Conversor de formatos
        └── middleware/
            └── errorHandler.ts       # Tratamento de erros
```

---

## Build Local (Desenvolvimento)

```bash
cd connector
npm install
cp .env.example .env
# Edite o .env com suas configurações
npm run dev
```

---

## Build Docker Local

```bash
cd Evolution-Go-no-Chawoot/connector
docker build -t evo-go-connector:local .
docker run --rm -p 3000:3000 --env-file .env evo-go-connector:local
```

---

## Troubleshooting

### O QR Code não aparece
- Verifique os logs do container da Evolution Go
- Confirme que a licença foi ativada em `/manager/login`

### Mensagens não chegam no Chatwoot
- Verifique os logs do conector
- Confirme que o CHATWOOT_PLATFORM_API_TOKEN está correto
- Teste: `GET http://localhost:3000/health` (internamente)

### Erro 401 no conector
- O token CONNECTOR_SECRET está incorreto
- Verifique a configuração no Kanban

### Mídia não está sendo recebida
- Verifique se `WEBHOOKFILES: "true"` está na stack da Evolution Go
- Confirme que o container tem acesso à internet para baixar mídias

---

## Fluxo de Dados

### Mensagem Recebida (WhatsApp → Chatwoot)
```
1. WhatsApp → Evolution Go (recebe mensagem)
2. Evolution Go → Conector (webhook POST /webhooks/evolution/{instance})
3. Conector → Chatwoot (cria contato + conversa + mensagem)
```

### Mensagem Enviada (Chatwoot → WhatsApp)
```
1. Agente responde no Chatwoot
2. Chatwoot → Conector (webhook POST /webhooks/chatwoot)
3. Conector → Evolution Go (envia via API)
4. Evolution Go → WhatsApp (entrega)
```

### Criar Nova Conexão
```
1. Admin acessa Kanban > Conexões > Nova
2. Kanban → Conector (POST /api/instances/create)
3. Conector → Evolution Go (cria instância)
4. Conector → Chatwoot (cria inbox)
5. Conector ← Evolution Go (retorna QR Code)
6. QR Code → Usuário
```
