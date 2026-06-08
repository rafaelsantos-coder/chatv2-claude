# Z-API Chat v1 — Web

Interface de chat WhatsApp integrada com a [Z-API](https://z-api.io).

## Deploy em 1 clique

### Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Faça fork deste repositório
2. Acesse [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Selecione o repositório → Deploy

### Render
1. Acesse [render.com](https://render.com) → New Web Service
2. Conecte o repositório
3. Start Command: `node server.js`
4. Deploy

## Após o deploy

1. Acesse a URL gerada pela plataforma
2. Cole **ID da instância** e **Token** da Z-API
3. Clique **Salvar e verificar**
4. Clique **Registrar automaticamente** — registra o webhook na Z-API

## Como funciona

```
WhatsApp → Z-API → POST https://seu-app.railway.app/webhook
                           ↓
                    GET /messages?since=N (poll 2s)
                           ↓
                       Interface Chat
```

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/` | Interface do chat |
| POST | `/webhook` | Recebe callbacks da Z-API |
| GET | `/messages?since=N` | Retorna mensagens novas |
| GET | `/status` | Health check |

## Licença
MIT
