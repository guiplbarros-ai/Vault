#!/usr/bin/env node
// Transaction Monitor — polls Cortex Cash API for new transactions, posts to Discord
// Zero dependencies: node:http + node:https + node:fs + node:path

const https = require('node:https')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { URL } = require('node:url')

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.CORTEX_CASH_URL || 'https://cortex-cash.fly.dev'
const API_KEY = process.env.CORTEX_CASH_API_KEY || ''
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_CORTEX_CASH || ''
const STATS_DIR = path.join(os.homedir(), '.openclaw', 'stats')
const STATE_FILE = path.join(STATS_DIR, 'tx-monitor-state.json')

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(level, msg) {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [${level}] ${msg}`)
}

function httpRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const mod = url.protocol === 'https:' ? https : http
    const req = mod.request(url, options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }))
    })
    req.on('error', reject)
    req.setTimeout(options.timeout || 15_000, () => req.destroy(new Error('Request timeout')))
    if (body) req.write(body)
    req.end()
  })
}

// ── State ───────────────────────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// ── API ─────────────────────────────────────────────────────────────────────

async function fetchNewTransactions(since) {
  const url = `${API_BASE}/api/financeiro/transacoes/recent?since=${encodeURIComponent(since)}&limit=50`
  const res = await httpRequest(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    timeout: 20_000,
  })
  if (res.status !== 200) throw new Error(`API returned ${res.status}: ${res.body.slice(0, 200)}`)
  return JSON.parse(res.body)
}

// ── Discord ─────────────────────────────────────────────────────────────────

function fmt(valor) {
  return Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function buildTransactionEmbed(tx) {
  const isExpense = tx.tipo === 'despesa'
  const emoji = isExpense ? '🔴' : tx.tipo === 'receita' ? '🟢' : '🔄'
  const sign = isExpense ? '-' : '+'
  const color = isExpense ? 15158332 : tx.tipo === 'receita' ? 5025616 : 5865522

  return {
    title: `${emoji} ${tx.descricao}`,
    description: `**${sign}${fmt(tx.valor)}**`,
    color,
    fields: [
      { name: 'Conta', value: tx.conta_nome, inline: true },
      { name: 'Tipo', value: tx.tipo, inline: true },
      { name: 'Data', value: new Date(tx.data).toLocaleDateString('pt-BR'), inline: true },
    ],
    timestamp: tx.created_at,
    footer: { text: 'Cortex Cash' },
  }
}

function buildBatchSummary(transactions) {
  const receitas = transactions.filter(t => t.tipo === 'receita')
  const despesas = transactions.filter(t => t.tipo === 'despesa')
  const totalReceitas = receitas.reduce((s, t) => s + Math.abs(t.valor), 0)
  const totalDespesas = despesas.reduce((s, t) => s + Math.abs(t.valor), 0)

  const lines = transactions.slice(0, 20).map(t => {
    const emoji = t.tipo === 'despesa' ? '🔴' : t.tipo === 'receita' ? '🟢' : '🔄'
    const sign = t.tipo === 'despesa' ? '-' : '+'
    const amount = Math.abs(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    return `${emoji} ${sign}R$ ${amount} — ${t.descricao} (${t.conta_nome})`
  })

  if (transactions.length > 20) lines.push(`... e mais ${transactions.length - 20}`)

  return {
    title: `📊 ${transactions.length} novas transações`,
    description: lines.join('\n'),
    color: 5865522,
    fields: [
      { name: 'Receitas', value: fmt(totalReceitas), inline: true },
      { name: 'Despesas', value: fmt(totalDespesas), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Cortex Cash' },
  }
}

async function postToDiscord(embeds) {
  if (!DISCORD_WEBHOOK) {
    log('warn', 'DISCORD_WEBHOOK_CORTEX_CASH not set — skipping notification')
    embeds.forEach(e => log('info', `[dry-run] ${e.title}: ${e.description}`))
    return
  }
  const payload = JSON.stringify({ username: 'Cortex Cash', embeds })
  await httpRequest(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 10_000,
  }, payload)
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) { log('error', 'CORTEX_CASH_API_KEY not set'); process.exit(1) }

  let state = loadState()

  // First run: set baseline, don't notify
  if (!state) {
    state = { last_check: new Date().toISOString(), last_tx_ids: [] }
    saveState(state)
    log('info', 'First run — baseline set, no notifications')
    return
  }

  const result = await fetchNewTransactions(state.last_check)

  // Filter already-seen IDs
  const newTxs = result.transacoes.filter(t => !state.last_tx_ids.includes(t.id))

  if (newTxs.length === 0) {
    state.last_check = new Date().toISOString()
    saveState(state)
    log('info', `No new transactions since ${state.last_check}`)
    return
  }

  log('info', `Found ${newTxs.length} new transaction(s)`)

  // Build embeds: individual for <=5, batch for >5
  const embeds = newTxs.length <= 5
    ? newTxs.map(buildTransactionEmbed)
    : [buildBatchSummary(newTxs)]

  await postToDiscord(embeds)

  // Update state
  state.last_check = new Date().toISOString()
  state.last_tx_ids = newTxs.map(t => t.id)
  saveState(state)

  log('info', `Notified ${newTxs.length} transaction(s)`)
}

main().catch(e => {
  log('error', `tx-monitor failed: ${e.message}`)
  process.exit(1)
})
