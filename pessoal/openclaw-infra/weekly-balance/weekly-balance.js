#!/usr/bin/env node
// Weekly Balance Summary — posts account balances to Discord every Sunday
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
const STATE_FILE = path.join(STATS_DIR, 'weekly-balance-state.json')

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

function fmt(valor) {
  return Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

async function fetchApi(endpoint) {
  const url = `${API_BASE}/api/financeiro/${endpoint}`
  const res = await httpRequest(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    timeout: 20_000,
  })
  if (res.status !== 200) throw new Error(`${endpoint}: HTTP ${res.status}`)
  return JSON.parse(res.body)
}

// ── Discord ─────────────────────────────────────────────────────────────────

function arrow(current, prev) {
  if (prev == null) return ''
  const diff = current - prev
  if (Math.abs(diff) < 0.01) return ' (➡️ sem variacao)'
  return diff > 0 ? ` (📈 +${fmt(diff)})` : ` (📉 -${fmt(Math.abs(diff))})`
}

function buildWeeklyEmbed(resumo, contas, prevState) {
  const prevSaldo = prevState?.saldo_total
  const accountLines = (contas.contas || []).map(c => {
    const prevAccount = prevState?.contas?.find(p => p.nome === c.nome)
    const diff = prevAccount ? arrow(c.saldo, prevAccount.saldo) : ''
    return `• **${c.nome}**: ${fmt(c.saldo)}${diff}`
  }).join('\n')

  const description = [
    `**Saldo total**: ${fmt(resumo.saldo_total || 0)}${arrow(resumo.saldo_total || 0, prevSaldo)}`,
    '',
    `**Receitas do mes**: ${fmt(resumo.receitas_mes || 0)}`,
    `**Despesas do mes**: ${fmt(resumo.despesas_mes || 0)}`,
    `**Saldo do mes**: ${fmt(resumo.saldo_mes || 0)}`,
    '',
    '**Contas**',
    accountLines || '(nenhuma conta)',
  ].join('\n')

  return {
    title: `💰 Resumo Semanal — ${new Date().toLocaleDateString('pt-BR')}`,
    description,
    color: 5865522,
    timestamp: new Date().toISOString(),
    footer: { text: 'Cortex Cash — Resumo Semanal' },
  }
}

async function postToDiscord(embeds) {
  if (!DISCORD_WEBHOOK) {
    log('warn', 'DISCORD_WEBHOOK_CORTEX_CASH not set — skipping')
    embeds.forEach(e => log('info', `[dry-run] ${e.title}\n${e.description}`))
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

  const [resumo, contas] = await Promise.all([fetchApi('resumo'), fetchApi('contas')])
  const prevState = loadState()

  const embed = buildWeeklyEmbed(resumo, contas, prevState)
  await postToDiscord([embed])

  // Save current state for next week's comparison
  saveState({
    date: new Date().toISOString(),
    saldo_total: resumo.saldo_total || 0,
    contas: (contas.contas || []).map(c => ({ nome: c.nome, saldo: c.saldo })),
  })

  log('info', 'Weekly balance posted to Discord')
}

main().catch(e => {
  log('error', `weekly-balance failed: ${e.message}`)
  process.exit(1)
})
