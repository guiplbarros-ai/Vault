#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';
import { loadEnv } from './utils/env.js';
import { logger } from './utils/logger.js';
import { getTelegramWebhookBot } from './services/telegram.service.js';
import { verifyOAuthState } from './utils/oauth-state.js';
import { getGoogleAuthService } from './services/google-auth.service.js';
import { getGmailService } from './services/gmail.service.js';
import { getGoogleTokensDbService } from './services/google-tokens-db.service.js';
import { getChatSettingsDbService } from './services/chat-settings-db.service.js';

loadEnv();

const port = Number(process.env.PORT || 3000);
const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
const oauthStateSecret = (process.env.CORTEX_OAUTH_STATE_SECRET || webhookSecret || '').trim();

function formatNetworkError(e: unknown): string {
  const err = e as any;
  const base = err instanceof Error ? err.message : String(e);
  const cause = err?.cause;
  if (cause && typeof cause === 'object') {
    const code = (cause as any).code ? String((cause as any).code) : '';
    const hostname = (cause as any).hostname ? String((cause as any).hostname) : '';
    const port = (cause as any).port ? String((cause as any).port) : '';
    const msg = (cause as any).message ? String((cause as any).message) : '';
    const bits = [code && `code=${code}`, hostname && `host=${hostname}`, port && `port=${port}`, msg && `cause=${msg}`]
      .filter(Boolean)
      .join(' ');
    if (bits) return `${base} (${bits})`;
  }
  return base;
}

async function supabasePing(): Promise<{ configured: boolean; ok?: boolean; status?: number; error?: string }> {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return { configured: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
    });

    const status = res.status;
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      return { configured: true, ok: false, status, error: text || res.statusText };
    }
    return { configured: true, ok: true, status };
  } catch (e) {
    return { configured: true, ok: false, error: formatNetworkError(e) };
  } finally {
    clearTimeout(timeout);
  }
}

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
    const supabase = await supabasePing();
    return sendJson(res, 200, { ok: true, service: 'cortex', ts: new Date().toISOString(), supabase });
  }

  if (method === 'GET' && url.pathname === '/oauth2callback') {
    try {
      const code = url.searchParams.get('code') || '';
      const state = url.searchParams.get('state') || '';
      const error = url.searchParams.get('error') || '';

      if (error) {
        return sendJson(res, 400, { ok: false, error });
      }
      if (!code || !state) {
        return sendJson(res, 400, { ok: false, error: 'missing code/state' });
      }

      if (!oauthStateSecret) throw new Error('CORTEX_OAUTH_STATE_SECRET não configurado');
      const st = verifyOAuthState(state, oauthStateSecret);

      // Exchange code for tokens; temporarily create auth service without accountEmail.
      // We'll discover account email via Gmail profile using the returned access token.
      const auth = getGoogleAuthService(st.workspaceId, null);
      const tokens = await auth.exchangeCode(code);

      // Discover email via Gmail profile (scopes include gmail.readonly)
      const gmail = getGmailService(st.workspaceId, null, tokens.access_token);
      const profile = await gmail.getProfile();
      const accountEmail = profile.emailAddress.toLowerCase().trim();

      // Persist tokens under workspace+email
      const db = getGoogleTokensDbService();
      if (!db.enabled()) throw new Error('Supabase não configurado para google_tokens');
      await db.upsert({
        workspaceId: st.workspaceId,
        accountEmail,
        tokens: tokens as unknown as Record<string, unknown>,
        scopes: tokens.scope || '',
      });

      // Set selected account for this chat (so future Gmail/Calendar use the right account)
      const chatDb = getChatSettingsDbService();
      if (chatDb.enabled()) {
        await chatDb.setGoogleAccountEmail(st.chatId, accountEmail);
      }

      // Notify user in Telegram
      await getTelegramWebhookBot().sendSystemMessage(
        st.chatId,
        `✅ Google conectado no contexto *${st.workspaceId}*.\nConta: ${accountEmail}\n\nAgora você pode pedir agenda/emails normalmente.`,
      );

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        `<html><body style="font-family:sans-serif;padding:32px;">` +
          `<h2>✅ Google conectado!</h2>` +
          `<p>Você pode fechar esta janela e voltar ao Telegram.</p>` +
        `</body></html>`
      );
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(`OAuth callback error: ${msg}`);
      return sendJson(res, 500, { ok: false, error: msg });
    }
  }

  if (method === 'POST' && url.pathname === '/telegram/webhook') {
    try {
      if (webhookSecret) {
        const got = String(req.headers['x-telegram-bot-api-secret-token'] || '');
        if (got !== webhookSecret) {
          logger.warn(
            `Telegram webhook: secret inválido (${got ? 'presente' : 'ausente'}). ` +
              `Dica: reconfigure setWebhook com secret_token igual ao TELEGRAM_WEBHOOK_SECRET do Fly.`,
          );
          return sendJson(res, 401, { ok: false, error: 'invalid webhook secret' });
        }
      }

      const raw = await readBody(req);
      const update = raw ? (JSON.parse(raw) as any) : {};

      // Log leve para diagnosticar “bot não responde”
      const msg = update?.message || update?.edited_message || update?.callback_query?.message;
      const chatId = msg?.chat?.id;
      const fromId = msg?.from?.id || update?.message?.from?.id;
      const text = update?.message?.text || update?.edited_message?.text || '';
      logger.info(
        `Telegram webhook update_id=${update?.update_id ?? 'n/a'} chat=${chatId ?? 'n/a'} from=${fromId ?? 'n/a'} ` +
          `text=${typeof text === 'string' && text ? (text.startsWith('/') ? '[command]' : '[text]') : '[no-text]'}`,
      );
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

