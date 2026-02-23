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
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3)
const RETRY_BASE_DELAY_MS = Number(process.env.RETRY_BASE_DELAY_MS || 60_000) // 60s

const AGENT_CONFIG = {
  'relay/backstage': { model: 'sonnet', cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 25, hasBrowser: true },
  'relay/data':      { model: 'opus',   cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 25, hasBrowser: false },
  'relay/review':    { model: 'sonnet', cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 15, hasBrowser: true },
  'relay/ops':       { model: 'haiku',  cwd: '/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw', maxTurns: 10, hasBrowser: false },
  'relay/pessoal':   { model: 'sonnet', cwd: '/mnt/c/Users/guipl/Documents/Coding/pessoal-repo/pessoal', maxTurns: 25, hasBrowser: true },
}

const MCP_CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'claude-relay', 'mcp-headless-browser.json')

const QUEUE_CONCURRENCY = Number(process.env.QUEUE_CONCURRENCY || 2) // allow 2 parallel CLI processes
const MIN_DELAY_BETWEEN_MS = Number(process.env.MIN_DELAY_BETWEEN_MS || 3_000) // 3s between requests

// ── State ───────────────────────────────────────────────────────────────────

let activeProcesses = 0
const startTime = Date.now()
const STATS_DIR = path.join(os.homedir(), '.openclaw', 'stats')

// ── Request Queue ──────────────────────────────────────────────────────────
// Serializes requests to avoid CLI rate limits. Bots wait in queue instead of
// hitting rate limits and retrying.

const requestQueue = []
let queueRunning = 0
let lastRequestEndMs = 0

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject })
    drainQueue()
  })
}

async function drainQueue() {
  if (queueRunning >= QUEUE_CONCURRENCY || requestQueue.length === 0) return

  const { fn, resolve, reject } = requestQueue.shift()
  queueRunning++

  try {
    // Enforce minimum delay between requests
    const sinceLast = Date.now() - lastRequestEndMs
    if (sinceLast < MIN_DELAY_BETWEEN_MS && lastRequestEndMs > 0) {
      const wait = MIN_DELAY_BETWEEN_MS - sinceLast
      log('info', `[queue] Waiting ${wait}ms before next request (${requestQueue.length} queued)`)
      await new Promise(r => setTimeout(r, wait))
    }

    const result = await fn()
    resolve(result)
  } catch (e) {
    reject(e)
  } finally {
    lastRequestEndMs = Date.now()
    queueRunning--
    drainQueue()
  }
}

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

/** Parse claude --output-format json output → extract result text + metadata.
 *  CLI 2.x returns a single object: { type: "result", result: "...", total_cost_usd, duration_ms, num_turns }
 *  Older versions returned an array: [{ type: "system" }, ..., { type: "result", result: "..." }]
 *  Returns: { text, cost_usd, duration_ms, num_turns, session_id }
 */
function parseClaudeOutput(stdout) {
  const trimmed = stdout.trim()
  if (!trimmed) throw new Error('Empty output from claude CLI')

  // Debug: log raw output size for troubleshooting
  log('debug', `[parseClaudeOutput] ${trimmed.length} chars, starts: ${trimmed.slice(0, 100).replace(/\n/g, '\\n')}`)

  const parsed = JSON.parse(trimmed)
  const emptyMeta = { cost_usd: 0, duration_ms: 0, num_turns: 0, session_id: null }

  // CLI 2.x: single object with type "result"
  if (!Array.isArray(parsed)) {
    if (parsed.type === 'result') {
      if (parsed.is_error) throw new Error(`Claude error: ${parsed.result}`)
      const isMaxTurns = parsed.subtype === 'error_max_turns'
      const fallback = isMaxTurns
        ? `⚠️ Atingi o limite de ${parsed.num_turns || '?'} turnos sem conseguir completar. Tente uma pergunta mais simples.`
        : '(sem resposta)'
      return {
        text: parsed.result || fallback,
        cost_usd: parsed.total_cost_usd || 0,
        duration_ms: parsed.duration_ms || 0,
        num_turns: parsed.num_turns || 0,
        session_id: parsed.session_id || null,
      }
    }
    // Single object but not a result — try to extract text
    if (parsed.message?.content) {
      const textBlocks = parsed.message.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
      if (textBlocks.length > 0) return { text: textBlocks.join('\n'), ...emptyMeta }
    }
    throw new Error(`Unexpected CLI output format: ${JSON.stringify(parsed).slice(0, 200)}`)
  }

  // Legacy: array format
  const result = parsed.findLast(i => i.type === 'result')
  if (!result) {
    const lastAssistant = parsed.findLast(i => i.type === 'assistant')
    if (lastAssistant?.message?.content) {
      const textBlocks = lastAssistant.message.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
      if (textBlocks.length > 0) return { text: textBlocks.join('\n'), ...emptyMeta }
    }
    throw new Error('No result object in claude CLI output')
  }

  if (result.is_error) throw new Error(`Claude error: ${result.result}`)
  return {
    text: result.result,
    cost_usd: result.total_cost_usd || 0,
    duration_ms: result.duration_ms || 0,
    num_turns: result.num_turns || 0,
    session_id: result.session_id || null,
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────

function getTodayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadTodayStats() {
  const p = path.join(STATS_DIR, `${getTodayDateStr()}.json`)
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {
    return { date: getTodayDateStr(), agents: {}, totals: { requests: 0, cost_usd: 0, duration_ms: 0 } }
  }
}

function saveTodayStats(stats) {
  fs.mkdirSync(STATS_DIR, { recursive: true })
  fs.writeFileSync(path.join(STATS_DIR, `${stats.date}.json`), JSON.stringify(stats, null, 2))
}

function recordUsage(agentName, { cost_usd, duration_ms, num_turns, response_chars, model }) {
  try {
    const stats = loadTodayStats()
    if (!stats.agents[agentName]) {
      stats.agents[agentName] = { requests: 0, cost_usd: 0, duration_ms: 0, num_turns: 0, response_chars: 0, model }
    }
    const a = stats.agents[agentName]
    a.requests++
    a.cost_usd += cost_usd
    a.duration_ms += duration_ms
    a.num_turns += num_turns
    a.response_chars += response_chars

    stats.totals.requests++
    stats.totals.cost_usd += cost_usd
    stats.totals.duration_ms += duration_ms

    saveTodayStats(stats)
  } catch (e) {
    log('warn', `Failed to record stats: ${e.message}`)
  }
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

function buildStreamChunk(text, model, id, finishReason) {
  return {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      delta: text !== null ? { role: 'assistant', content: text } : {},
      finish_reason: finishReason || null,
    }],
  }
}

function sendSSEResponse(res, text, model) {
  const id = `chatcmpl-${crypto.randomUUID()}`
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
    'access-control-allow-origin': '*',
  })
  res.write(`data: ${JSON.stringify(buildStreamChunk(text, model, id, null))}\n\n`)
  res.write(`data: ${JSON.stringify(buildStreamChunk(null, model, id, 'stop'))}\n\n`)
  res.write('data: [DONE]\n\n')
  res.end()
}

// ── Error Classification ────────────────────────────────────────────────────

function classifyError(stderr, stdout) {
  const output = ((stderr || '') + (stdout || '')).toLowerCase()
  if (/rate.?limit|429|quota|too many request/i.test(output)) return 'rate_limit'
  if (/not logged in|please run.*login|unauthorized|authentication/i.test(output)) return 'auth'
  return 'unknown'
}

/** Spawn claude CLI once. Returns stdout on success, throws with { message, stderr, stdout } on failure. */
function spawnClaude(args, config) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = []
    const stderrChunks = []

    const proc = spawn(CLAUDE_BIN, args, {
      cwd: config.cwd,
      timeout: TIMEOUT_MS,
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.bun/bin:${process.env.HOME}/.openclaw/tools:/usr/local/bin:/usr/bin:/bin`,
        BROWSER: 'echo',           // prevent CLI from opening browser windows
        DISPLAY: '',               // no X11 display
        WSL_INTEROP: '',           // block WSL→Windows interop (prevents launching .exe)
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.stdout.on('data', (c) => stdoutChunks.push(c))
    proc.stderr.on('data', (c) => stderrChunks.push(c))

    proc.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
      const stderr = Buffer.concat(stderrChunks).toString('utf-8')

      if (code !== 0) {
        const err = new Error(`claude exited ${code}: ${(stderr || stdout).slice(0, 500)}`)
        err.stderr = stderr
        err.stdout = stdout
        reject(err)
      } else {
        resolve(stdout)
      }
    })

    proc.on('error', (err) => reject(err))
  })
}

/** Spawn claude CLI with retry on rate limit errors. */
async function spawnClaudeWithRetry(args, config, modelName) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await spawnClaude(args, config)
    } catch (e) {
      const errorType = classifyError(e.stderr, e.stdout || e.message)

      // Auth errors: no retry, fail immediately
      if (errorType === 'auth') {
        throw new Error('AUTH: Claude CLI não está logado. Verificar `claude /login` no WSL2.')
      }

      // Rate limit: retry with backoff
      if (errorType === 'rate_limit' && attempt < MAX_RETRIES) {
        const delayMs = RETRY_BASE_DELAY_MS * (attempt + 1)
        const delaySec = Math.round(delayMs / 1000)
        log('warn', `[${modelName}] Rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delaySec}s...`)
        await new Promise(r => setTimeout(r, delayMs))
        continue
      }

      // Unknown error or last retry: throw
      throw e
    }
  }
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleChatCompletion(req, res) {
  // Hard limit to prevent unbounded queue growth
  if (requestQueue.length >= MAX_CONCURRENT * 3) {
    log('warn', `Queue full: ${requestQueue.length} pending`)
    return sendJson(res, 429, {
      error: { message: 'Too many queued requests, try again later', type: 'rate_limit_error' },
    })
  }

  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch (e) {
    return sendJson(res, 400, { error: { message: 'Invalid JSON body', type: 'invalid_request' } })
  }

  log("debug", `[REQUEST] model=${body.model} stream=${body.stream} messages=${(body.messages||[]).length} keys=${Object.keys(body).join(",")}`)
  const modelName = body.model || 'relay/ops'
  const config = AGENT_CONFIG[modelName]
  if (!config) {
    return sendJson(res, 400, {
      error: { message: `Unknown model: ${modelName}. Available: ${Object.keys(AGENT_CONFIG).join(', ')}`, type: 'invalid_request' },
    })
  }

  const { systemPrompt, userPrompt } = convertMessages(body.messages || [])

  const queuePos = requestQueue.length + queueRunning
  if (queuePos > 0) {
    log('info', `[${modelName}] Queued at position ${queuePos} (${queueRunning} running, ${requestQueue.length} waiting)`)
  }

  // Enqueue the actual work — only one CLI process runs at a time
  try {
    const result = await enqueue(async () => {
      log('info', `[${modelName}] Processing (model=${config.model}, cwd=${path.basename(config.cwd)})`)

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
        '--output-format', 'json',
        '--max-turns', String(config.maxTurns),
        '--dangerously-skip-permissions',
      ]

      // Add headless browser MCP config for agents that need browsing
      if (config.hasBrowser && fs.existsSync(MCP_CONFIG_PATH)) {
        args.push('--mcp-config', MCP_CONFIG_PATH)
        // Block built-in web tools so agents use MCP playwright (headless) instead
        args.push('--disallowedTools', 'WebFetch', 'WebSearch')
      }

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
        const stdout = await spawnClaudeWithRetry(args, config, modelName)

        const elapsedMs = Date.now() - startMs
        const elapsed = (elapsedMs / 1000).toFixed(1)
        const { text, cost_usd, duration_ms: cliDuration, num_turns } = parseClaudeOutput(stdout)
        log('info', `[${modelName}] Done in ${elapsed}s (${(text || '').length} chars, ${num_turns} turns, $${cost_usd.toFixed(4)})`)

        recordUsage(modelName, {
          cost_usd,
          duration_ms: elapsedMs,
          num_turns,
          response_chars: (text || '').length,
          model: config.model,
        })

        return { ok: true, data: buildOpenAIResponse(text, modelName) }
      } catch (e) {
        const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
        log('error', `[${modelName}] Failed after ${elapsed}s: ${e.message}`)

        // Return friendly error as success so bot posts it in Discord
        if (e.message.startsWith('AUTH:')) {
          return { ok: true, data: buildOpenAIResponse(`⚠️ ${e.message}`, modelName) }
        }

        const errorType = classifyError(e.stderr || '', e.stdout || e.message)
        if (errorType === 'rate_limit') {
          return { ok: true, data: buildOpenAIResponse(
            `⏳ Rate limit atingido. Tentei ${MAX_RETRIES}x sem sucesso. Tente novamente em ~2 minutos.`,
            modelName
          )}
        }

        return { ok: false, error: e }
      } finally {
        activeProcesses--
        if (systemPromptFile) {
          try { fs.unlinkSync(systemPromptFile) } catch {}
        }
      }
    })

    if (result.ok) {
      if (body.stream) {
        return sendSSEResponse(res, result.data.choices[0].message.content, result.data.model)
      }
      return sendJson(res, 200, result.data)
    } else {
      return sendJson(res, 500, {
        error: { message: result.error.message, type: 'server_error' },
      })
    }
  } catch (e) {
    log('error', `[${modelName}] Queue error: ${e.message}`)
    return sendJson(res, 500, {
      error: { message: e.message, type: 'server_error' },
    })
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
    queued: requestQueue.length,
    queueConcurrency: QUEUE_CONCURRENCY,
    agents: Object.keys(AGENT_CONFIG),
  })
}

function handleStats(_req, res) {
  const stats = loadTodayStats()
  stats.relay = {
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    active_processes: activeProcesses,
    max_concurrent: MAX_CONCURRENT,
  }
  sendJson(res, 200, stats)
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
    if (method === 'GET' && url.pathname === '/v1/stats') return handleStats(req, res)
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
  log('info', `Queue: concurrency=${QUEUE_CONCURRENCY}, min delay=${MIN_DELAY_BETWEEN_MS}ms, max queued=${MAX_CONCURRENT * 3}`)
  log('info', `Timeout: ${TIMEOUT_MS / 1000}s`)
  log('info', `Retry: ${MAX_RETRIES}x with ${RETRY_BASE_DELAY_MS / 1000}s base delay`)
  log('info', `Agents: ${Object.keys(AGENT_CONFIG).join(', ')}`)
})
