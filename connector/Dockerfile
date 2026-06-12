# ============================================================
# Dockerfile — Evolution Go ↔ Chatwoot Connector
# Multi-stage build para imagem mínima em produção
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia dependências
COPY package.json package-lock.json* ./
RUN npm ci --only=production && \
    npm ci --include=dev

# Copia código fonte e compila TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ============================================================
# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copia apenas as dependências de produção
COPY package.json package-lock.json* ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copia os arquivos compilados
COPY --from=builder /app/dist ./dist

# Cria diretório de dados persistente
RUN mkdir -p /app/data && \
    chown -R node:node /app

# Roda como usuário não-root
USER node

# Expõe a porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Comando de início
CMD ["node", "dist/index.js"]
