#!/usr/bin/env node

import http from 'node:http'
import { URL } from 'node:url'
import { getTelegramService } from './services/telegram.service.js'
import { getDailyDigestService } from './services/daily-digest.service.js'
import { isSupabaseConfigured, testSupabaseConnection } from './services/supabase.service.js'
import { isConfigured as isFlightSearchConfigured } from './services/flight-search.service.js'
import { loadEnv } from './utils/env.js'
import { logger } from './utils/logger.js'

loadEnv()

const port = Number(process.env.PORT || 3000)
const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const method = (req.method || 'GET').toUpperCase()

  // Health check
  if (method === 'GET' && url.pathname === '/health') {
    const supabaseOk = isSupabaseConfigured() ? await testSupabaseConnection() : false

    return sendJson(res, 200, {
      ok: true,
      service: 'atlas',
      ts: new Date().toISOString(),
      supabase: {
        configured: isSupabaseConfigured(),
        connected: supabaseOk,
      },
      flightSearch: {
        configured: isFlightSearchConfigured(),
      },
      telegram: {
        configured: getTelegramService().enabled(),
      },
    })
  }

  // Telegram webhook
  if (method === 'POST' && url.pathname === '/telegram/webhook') {
    try {
      // Valida secret se configurado
      if (webhookSecret) {
        const got = String(req.headers['x-telegram-bot-api-secret-token'] || '')
        if (got !== webhookSecret) {
          logger.warn('Telegram webhook: secret invalido')
          return sendJson(res, 401, { ok: false, error: 'invalid webhook secret' })
        }
      }

      const raw = await readBody(req)
      const update = raw ? (JSON.parse(raw) as any) : {}

      // Log basico
      const msg = update?.message || update?.edited_message || update?.callback_query?.message
      const chatId = msg?.chat?.id
      const text = update?.message?.text || ''
      logger.info(
        `Telegram webhook update_id=${update?.update_id ?? 'n/a'} chat=${chatId ?? 'n/a'} ` +
          `text=${text ? (text.startsWith('/') ? '[command]' : '[text]') : '[no-text]'}`
      )

      getTelegramService().processUpdate(update)
      return sendJson(res, 200, { ok: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.error(`Webhook error: ${msg}`)
      return sendJson(res, 500, { ok: false, error: msg })
    }
  }

  // Trigger manual de busca (para testes)
  if (method === 'POST' && url.pathname === '/search/trigger') {
    try {
      const digest = getDailyDigestService()
      const result = await digest.runManualSearch()
      return sendJson(res, 200, { ok: true, result })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return sendJson(res, 500, { ok: false, error: msg })
    }
  }

  return sendJson(res, 404, { ok: false, error: 'not found' })
})

// Inicia server
server.listen(port, () => {
  logger.info(`HTTP server listening on :${port}`)

  // Inicia crons de monitoramento
  const digest = getDailyDigestService()
  digest.startCrons()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...')
  const digest = getDailyDigestService()
  digest.stopCrons()
  server.close(() => {
    logger.info('Server encerrado')
    process.exit(0)
  })
})
