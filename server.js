const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3737;

// Mensagens em memória (ring buffer de 500)
let messages     = [];
let lastId       = 0;
// Set de messageIds já vistos — evita duplicatas da Z-API
const seenMsgIds = new Set();

// ── helpers ──────────────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end',  ()    => resolve(body));
    req.on('error', reject);
  });
}

// ── roteador ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    cors(res); res.writeHead(204); res.end(); return;
  }

  // ── POST /webhook  ← Z-API chama aqui ──────────────────────────
  if (req.method === 'POST' && pathname === '/webhook') {
    const body = await readBody(req).catch(() => '{}');
    try {
      const payload = JSON.parse(body);
      const msgId   = payload.messageId || payload.zaapId;

      // ── Deduplicação no servidor ──────────────────────────────
      // A Z-API pode disparar o mesmo evento múltiplas vezes.
      // Para mensagens recebidas (fromMe=false) deduplicamos por messageId.
      // Para callbacks de status (fromMe=true) deixamos passar todos
      // pois cada um pode ter um status diferente (SENT→RECEIVED→READ).
      if (!payload.fromMe && msgId) {
        if (seenMsgIds.has(msgId)) {
          console.log(`[webhook] duplicata ignorada: ${msgId}`);
          json(res, { ok: true, duplicate: true });
          return;
        }
        seenMsgIds.add(msgId);
        // Mantém o set em no máximo 2000 entradas
        if (seenMsgIds.size > 2000) {
          const first = seenMsgIds.values().next().value;
          seenMsgIds.delete(first);
        }
      }

      lastId++;
      messages.push({ id: lastId, ts: Date.now(), payload });
      if (messages.length > 500) messages = messages.slice(-500);

      const label = payload.fromMe
        ? `status:${payload.status} msgId:${msgId}`
        : `msg de +${payload.phone} | "${String(payload.text?.message || '').slice(0, 30)}"`;
      console.log(`[webhook #${lastId}] ${label}`);

    } catch (e) {
      console.warn('[webhook] body inválido:', body.slice(0, 80));
    }
    json(res, { ok: true });
    return;
  }

  // ── GET /messages?since=N  ← frontend busca novidades ──────────
  if (req.method === 'GET' && pathname === '/messages') {
    const since = parseInt(parsed.query.since || '0', 10);
    json(res, {
      messages: messages.filter(m => m.id > since),
      lastId
    });
    return;
  }

  // ── GET /status  ← health check ────────────────────────────────
  if (req.method === 'GET' && pathname === '/status') {
    json(res, { ok: true, uptime: process.uptime(), messages: messages.length });
    return;
  }

  // ── GET /  ← serve o index.html ────────────────────────────────
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const file = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(file));
    } else {
      res.writeHead(404); res.end('index.html não encontrado em /public');
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│         Z-API Chat — Servidor Web        │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  Porta:   ${PORT}                            │`);
  console.log('│  Chat:    https://SEU-DOMINIO.railway.app│');
  console.log('│  Webhook: https://SEU-DOMINIO/webhook    │');
  console.log('└─────────────────────────────────────────┘');
});
