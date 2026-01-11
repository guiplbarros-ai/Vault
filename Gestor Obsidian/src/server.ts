#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';
import { loadEnv } from './utils/env.js';
import { logger } from './utils/logger.js';
import { getTelegramWebhookBot } from './services/telegram.service.js';

loadEnv();

const port = Number(process.env.PORT || 3000);
const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'GET' && url.pathname === '/health') {
    // Minimal health check; detailed status will come later.
    return sendJson(res, 200, { ok: true, service: 'cortex', ts: new Date().toISOString() });
  }

  if (method === 'POST' && url.pathname === '/telegram/webhook') {
    try {
      if (webhookSecret) {
        const got = String(req.headers['x-telegram-bot-api-secret-token'] || '');
        if (got !== webhookSecret) {
          return sendJson(res, 401, { ok: false, error: 'invalid webhook secret' });
        }
      }

      const raw = await readBody(req);
      const update = raw ? JSON.parse(raw) : {};
      getTelegramWebhookBot().processUpdate(update);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(`Webhook error: ${msg}`);
      return sendJson(res, 500, { ok: false, error: msg });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'not found' });
});

server.listen(port, () => {
  logger.info(`HTTP server listening on :${port}`);
});

