const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3737;

// ── Armazenamento em memória ──────────────────────────────────────────
let events       = [];   // todos os webhooks recebidos
let eventId      = 0;
const seenMsgIds = new Set(); // deduplicação por messageId

// ── Helpers ───────────────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

// ── Roteador ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';

  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  // POST /webhook ← Z-API envia aqui todos os callbacks
  if (req.method === 'POST' && pathname === '/webhook') {
    const raw = await readBody(req).catch(() => '{}');
    try {
      const payload = JSON.parse(raw);
      const mid     = payload.messageId || payload.zaapId;

      // Deduplicação: mensagens recebidas (fromMe=false) só uma vez por messageId
      if (!payload.fromMe && mid) {
        if (seenMsgIds.has(mid)) {
          console.log(`[dup] ${mid}`);
          json(res, { ok: true, dup: true }); return;
        }
        seenMsgIds.add(mid);
        if (seenMsgIds.size > 3000) seenMsgIds.delete(seenMsgIds.values().next().value);
      }

      eventId++;
      events.push({ id: eventId, ts: Date.now(), payload });
      if (events.length > 1000) events = events.slice(-1000);

      const lbl = payload.fromMe
        ? `[status] ${payload.status} → ${payload.phone}`
        : `[recv] ${payload.phone} | ${JSON.stringify(payload.text?.message || payload.image ? '📷' : payload.audio ? '🎵' : payload.document ? '📄' : payload.sticker ? '🎭' : '?').slice(0, 40)}`;
      console.log(`#${eventId} ${lbl}`);
    } catch (e) { console.warn('[webhook] JSON inválido'); }
    json(res, { ok: true });
    return;
  }

  // GET /events?since=N ← frontend busca novidades
  if (req.method === 'GET' && pathname === '/events') {
    const since = parseInt(parsed.query.since || '0', 10);
    json(res, { events: events.filter(e => e.id > since), lastId: eventId });
    return;
  }

  // GET /status
  if (req.method === 'GET' && pathname === '/status') {
    json(res, { ok: true, uptime: Math.floor(process.uptime()), events: events.length });
    return;
  }

  // GET / → index.html
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const f = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(f)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(f));
    } else { res.writeHead(404); res.end('index.html não encontrado'); }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Z-API Chat rodando em http://0.0.0.0:${PORT}`);
  console.log(`   Webhook: POST https://SEU-DOMINIO/webhook\n`);
});
