#!/usr/bin/env node
// Claude Relay Server — bridges OpenClaw (OpenAI-compatible) → Claude Code CLI (subscription)
// Zero dependencies: node:http + node:child_process + node:crypto + node:fs + node:os

const http = require('node:http')
const { spawn } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

// ── Config ──────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT || 18790)
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude'
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 600_000) // 10 min
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT || 3)

const AGENT_CONFIG = {
  'relay/backstage': { model: 'sonnet', cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 25 },
  'relay/data':      { model: 'opus',   cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 25 },
  'relay/review':    { model: 'sonnet', cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 15 },
  'relay/ops':       { model: 'haiku',  cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 10 },
  'relay/pessoal':   { model: 'sonnet', cwd: '/mnt/c/Users/guipl/Documents/Coding/pessoal',         maxTurns: 25 },
}

// ── State ───────────────────────────────────────────────────────────────────

let activeProcesses = 0
const startTime = Date.now()

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(level, msg) {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [${level}] ${msg}`)
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

/** Separate OpenAI messages into system prompt + user prompt */
function convertMessages(messages) {
  const systemParts = []
  const conversationParts = []

  for (const msg of messages) {
    const content = typeof msg.content === 'string'
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.map(c => c.text || '').join('\n')
        : ''

    if (msg.role === 'system') {
      systemParts.push(content)
    } else if (msg.role === 'user') {
      conversationParts.push(content)
    } else if (msg.role === 'assistant') {
      // Include assistant messages as context for multi-turn
      conversationParts.push(`[Previous response]: ${content}`)
    }
  }

  return {
    systemPrompt: systemParts.join('\n\n---\n\n'),
    // Use only the last user message as the main prompt
    // Include recent history as context prefix
    userPrompt: conversationParts.length > 1
      ? conversationParts.slice(0, -1).join('\n\n') + '\n\n---\n\n' + conversationParts.at(-1)
      : conversationParts[0] || 'hello',
  }
}

/** Parse claude --output-format json output → extract result text */
function parseClaudeOutput(stdout) {
  const trimmed = stdout.trim()
  if (!trimmed) throw new Error('Empty output from claude CLI')

  const items = JSON.parse(trimmed)
  if (!Array.isArray(items)) throw new Error('Expected JSON array from claude CLI')

  const result = items.findLast(i => i.type === 'result')
  if (!result) {
    // Fallback: try to find the last assistant message
    const lastAssistant = items.findLast(i => i.type === 'assistant')
    if (lastAssistant?.message?.content) {
      const textBlocks = lastAssistant.message.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
      if (textBlocks.length > 0) return textBlocks.join('\n')
    }
    throw new Error('No result object in claude CLI output')
  }

  if (result.is_error) throw new Error(`Claude error: ${result.result}`)
  return result.result
}

function buildOpenAIResponse(text, model) {
  return {
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleChatCompletion(req, res) {
  // Concurrency check
  if (activeProcesses >= MAX_CONCURRENT) {
    log('warn', `Rate limited: ${activeProcesses}/${MAX_CONCURRENT} active`)
    return sendJson(res, 429, {
      error: { message: 'Too many concurrent requests', type: 'rate_limit_error' },
    })
  }

  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch (e) {
    return sendJson(res, 400, { error: { message: 'Invalid JSON body', type: 'invalid_request' } })
  }

  const modelName = body.model || 'relay/ops'
  const config = AGENT_CONFIG[modelName]
  if (!config) {
    return sendJson(res, 400, {
      error: { message: `Unknown model: ${modelName}. Available: ${Object.keys(AGENT_CONFIG).join(', ')}`, type: 'invalid_request' },
    })
  }

  const { systemPrompt, userPrompt } = convertMessages(body.messages || [])

  log('info', `[${modelName}] Processing (model=${config.model}, cwd=${path.basename(config.cwd)}, active=${activeProcesses + 1}/${MAX_CONCURRENT})`)

  // Write system prompt to temp file if large
  let systemPromptFile = null
  if (systemPrompt.length > 50_000) {
    systemPromptFile = path.join(os.tmpdir(), `claude-relay-sys-${crypto.randomUUID()}.txt`)
    fs.writeFileSync(systemPromptFile, systemPrompt, 'utf-8')
  }

  // Build claude CLI args
  const args = [
    '-p', userPrompt,
    '--model', config.model,
    '--cwd', config.cwd,
    '--output-format', 'json',
    '--max-turns', String(config.maxTurns),
    '--dangerously-skip-permissions',
  ]

  if (systemPrompt) {
    if (systemPromptFile) {
      args.push('--append-system-prompt', fs.readFileSync(systemPromptFile, 'utf-8'))
    } else {
      args.push('--append-system-prompt', systemPrompt)
    }
  }

  activeProcesses++
  const startMs = Date.now()

  try {
    const result = await new Promise((resolve, reject) => {
      const stdoutChunks = []
      const stderrChunks = []

      const proc = spawn(CLAUDE_BIN, args, {
        timeout: TIMEOUT_MS,
        env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      proc.stdout.on('data', (c) => stdoutChunks.push(c))
      proc.stderr.on('data', (c) => stderrChunks.push(c))

      proc.on('close', (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
        const stderr = Buffer.concat(stderrChunks).toString('utf-8')

        if (code !== 0) {
          reject(new Error(`claude exited ${code}: ${stderr || stdout}`.slice(0, 500)))
        } else {
          resolve(stdout)
        }
      })

      proc.on('error', (err) => reject(err))
    })

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
    const text = parseClaudeOutput(result)
    log('info', `[${modelName}] Done in ${elapsed}s (${text.length} chars)`)

    return sendJson(res, 200, buildOpenAIResponse(text, modelName))
  } catch (e) {
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
    log('error', `[${modelName}] Failed after ${elapsed}s: ${e.message}`)
    return sendJson(res, 500, {
      error: { message: e.message, type: 'server_error' },
    })
  } finally {
    activeProcesses--
    if (systemPromptFile) {
      try { fs.unlinkSync(systemPromptFile) } catch {}
    }
  }
}

function handleListModels(_req, res) {
  const models = Object.entries(AGENT_CONFIG).map(([id, cfg]) => ({
    id,
    object: 'model',
    created: Math.floor(startTime / 1000),
    owned_by: 'claude-relay',
    permission: [],
    root: id,
    parent: null,
  }))
  sendJson(res, 200, { object: 'list', data: models })
}

function handleHealth(_req, res) {
  sendJson(res, 200, {
    ok: true,
    service: 'claude-relay',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    active: activeProcesses,
    maxConcurrent: MAX_CONCURRENT,
    agents: Object.keys(AGENT_CONFIG),
  })
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const method = (req.method || 'GET').toUpperCase()

  // CORS (OpenClaw might need it)
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type, authorization')
  if (method === 'OPTIONS') { res.writeHead(204); return res.end() }

  try {
    if (method === 'GET' && url.pathname === '/health') return handleHealth(req, res)
    if (method === 'GET' && url.pathname === '/v1/models') return handleListModels(req, res)
    if (method === 'POST' && url.pathname === '/v1/chat/completions') return await handleChatCompletion(req, res)

    sendJson(res, 404, { error: { message: 'not found', type: 'invalid_request' } })
  } catch (e) {
    log('error', `Unhandled: ${e.message}`)
    sendJson(res, 500, { error: { message: 'internal error', type: 'server_error' } })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  log('info', `Claude Relay listening on 127.0.0.1:${PORT}`)
  log('info', `Claude binary: ${CLAUDE_BIN}`)
  log('info', `Max concurrent: ${MAX_CONCURRENT}`)
  log('info', `Timeout: ${TIMEOUT_MS / 1000}s`)
  log('info', `Agents: ${Object.keys(AGENT_CONFIG).join(', ')}`)
})
