#!/usr/bin/env node
// OpenClaw Daily Sync — collects system health and posts summary
// Zero dependencies: node:http + node:https + node:child_process + node:fs

const http = require('node:http')
const https = require('node:https')
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// ── Config ──────────────────────────────────────────────────────────────────

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null
const RELAY_URL = process.env.RELAY_URL || 'http://127.0.0.1:18790'
const GATEWAY_PORT = process.env.GATEWAY_PORT || '18789'
const LOG_DIR = path.join(process.env.HOME || '/home/guipl', '.openclaw', 'logs')

// ── Helpers ─────────────────────────────────────────────────────────────────

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 10_000 }).trim()
  } catch {
    return null
  }
}

function httpGet(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { timeout: 5000 }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

function postWebhook(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const payload = JSON.stringify(body)
    const mod = parsed.protocol === 'https:' ? https : http
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      timeout: 10_000,
    }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(payload)
    req.end()
  })
}

function fmtUptime(seconds) {
  if (!seconds) return 'n/a'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Checks ──────────────────────────────────────────────────────────────────

function checkSystemd(unit) {
  const state = run(`systemctl --user is-active ${unit} 2>/dev/null`)
  const pid = run(`systemctl --user show ${unit} --property=MainPID --value 2>/dev/null`)
  const mem = run(`systemctl --user show ${unit} --property=MemoryCurrent --value 2>/dev/null`)
  const memMB = mem && mem !== '[not set]' ? (parseInt(mem) / 1024 / 1024).toFixed(0) : null
  return { active: state === 'active', pid, memMB }
}

async function checkRelay() {
  const health = await httpGet(`${RELAY_URL}/health`)
  if (!health?.ok) return { ok: false }
  return {
    ok: true,
    uptime: fmtUptime(health.uptime),
    active: health.active,
    maxConcurrent: health.maxConcurrent,
    agents: health.agents?.length || 0,
  }
}

async function checkGateway() {
  // Gateway is WebSocket, just check if the port is listening
  const listening = run(`ss -tlnp 2>/dev/null | grep :${GATEWAY_PORT}`) !== null
  const svc = checkSystemd('openclaw-gateway')
  return { ...svc, listening }
}

function checkDisk() {
  const df = run("df -h / 2>/dev/null | tail -1 | awk '{print $5}'")
  return df || 'n/a'
}

function checkWSLUptime() {
  const raw = run("cat /proc/uptime 2>/dev/null | awk '{print $1}'")
  return raw ? fmtUptime(Math.floor(parseFloat(raw))) : 'n/a'
}

function getLogSize() {
  const logPath = '/tmp/openclaw'
  const size = run(`du -sh ${logPath} 2>/dev/null | cut -f1`)
  return size || 'n/a'
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

  // Collect checks
  const relay = await checkRelay()
  const gateway = await checkGateway()
  const relaySvc = checkSystemd('claude-relay')
  const disk = checkDisk()
  const uptime = checkWSLUptime()
  const logSize = getLogSize()

  const ok = (v) => v ? '`UP`' : '`DOWN`'
  const checks = [
    { name: 'Gateway', status: gateway.active && gateway.listening, detail: `PID ${gateway.pid || '?'} · ${gateway.memMB || '?'}MB` },
    { name: 'Relay', status: relay.ok && relaySvc.active, detail: relay.ok ? `up ${relay.uptime} · ${relay.active}/${relay.maxConcurrent} active · ${relay.agents} agents` : 'unreachable' },
    { name: 'WSL', status: true, detail: `uptime ${uptime} · disk ${disk} · logs ${logSize}` },
  ]

  const allOk = checks.every(c => c.status)
  const emoji = allOk ? ':white_check_mark:' : ':warning:'
  const title = `${emoji} OpenClaw Daily Health — ${dateStr}`

  // Build message
  const lines = [title, '']
  for (const c of checks) {
    lines.push(`**${c.name}:** ${ok(c.status)} ${c.detail}`)
  }
  lines.push('')
  lines.push(`_Ran at ${now.toLocaleTimeString('pt-BR')}_`)

  const message = lines.join('\n')

  // Output
  if (WEBHOOK_URL) {
    try {
      const status = await postWebhook(WEBHOOK_URL, { content: message })
      console.log(`[daily-sync] Sent to Discord (HTTP ${status})`)
    } catch (e) {
      console.error(`[daily-sync] Discord webhook failed: ${e.message}`)
      console.log(message)
      process.exit(1)
    }
  } else {
    console.log(message)
    console.log('\n---\nTip: set DISCORD_WEBHOOK_URL to post to Discord.')
  }

  // Append to local log
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    fs.appendFileSync(
      path.join(LOG_DIR, 'daily-sync.log'),
      `[${now.toISOString()}] all_ok=${allOk} gateway=${gateway.active} relay=${relay.ok}\n`
    )
  } catch {}
}

main().catch((e) => {
  console.error(`[daily-sync] Fatal: ${e.message}`)
  process.exit(1)
})
