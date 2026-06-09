
https://chatv2-claude-production.up.railway.app/

# Z-API Chat v2 — Chatbot WhatsApp completo

Interface profissional de chatbot integrada à [Z-API](https://z-api.io).

## Funcionalidades

- ✅ Envio e recebimento de **texto**
- ✅ Envio e recebimento de **imagens** (com preview e lightbox)
- ✅ Envio e recebimento de **áudio**
- ✅ Envio e recebimento de **vídeo**
- ✅ Envio e recebimento de **documentos** (PDF, Word, Excel...)
- ✅ Envio e recebimento de **stickers/figurinhas**
- ✅ Recebimento de **localização, contatos e reações**
- ✅ **Status de entrega**: 🕐 pendente · ✓ enviado · ✓✓ entregue · ✓✓ azul lido
- ✅ **Nome e foto** do contato buscados automaticamente via Z-API
- ✅ **Deduplicação** robusta no servidor e no cliente
- ✅ Múltiplas conversas simultâneas em abas separadas

## Deploy

### Railway (recomendado)
1. Suba este repo no GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Selecione o repo → Deploy automático

### Render
1. [render.com](https://render.com) → New Web Service → conecte o repo
2. Start Command: `node server.js`

## Configuração pós-deploy

1. Acesse a URL gerada (ex: `https://zapi-chat.up.railway.app`)
2. Aba **Configuração** → cole ID e Token → **Salvar e verificar**
3. Clique **Registrar na Z-API** — o webhook é registrado automaticamente

## Arquitetura

```
WhatsApp → Z-API → POST /webhook (Railway/Render)
                          ↓
                   GET /events?since=N  ← poll 2s
                          ↓
                    Interface Chat
```

## Endpoints do servidor

| Método | Path | Função |
|--------|------|--------|
| GET | `/` | Serve o chat |
| POST | `/webhook` | Recebe callbacks da Z-API |
| GET | `/events?since=N` | Retorna eventos novos |
| GET | `/status` | Health check |
