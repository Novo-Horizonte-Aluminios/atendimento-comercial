# 📦 API-NH ORACLE (Engine de Sincronização)

Esta é a API que deve ficar rodando no servidor local da Novo Horizonte para manter os dados do Oracle sincronizados com a nuvem a cada **5 minutos**.

## 🛠️ Como instalar no Servidor

1. Instale o **Node.js** (versão LTS).
2. Copie esta pasta (`extrator-comercial-local`) para o servidor.
3. Renomeie `.env.example` para `.env` e preencha com os dados do Oracle e Supabase.
4. Abra o terminal na pasta e execute:
   ```bash
   npm install
   ```

## 🚀 Como rodar (Modo Automático/Zelador)

Para que o sistema rode sozinho 24h e reinicie se o computador desligar:

1. Instale o **PM2** globalmente:
   ```bash
   npm install pm2 -g
   ```
2. Inicie o serviço usando o arquivo de configuração que criei:
   ```bash
   pm2 start ecosystem.config.js
   ```
3. Salve a lista para iniciar com o Windows:
   ```bash
   pm2 save
   ```

---

**Dica:** Se preferir testar rapidamente, basta dar um duplo clique no arquivo `iniciar_extrator.bat`.
