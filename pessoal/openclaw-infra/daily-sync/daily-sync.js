#!/usr/bin/env node
// Daily Sync — queries each OpenClaw agent for a status report, compiles and posts to Discord
// Zero dependencies: node:http + node:https + node:url

const http = require('node:http')
const https = require('node:https')
const { URL } = require('node:url')

// ── Config ──────────────────────────────────────────────────────────────────

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:18790'
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''
const TIMEOUT_PER_AGENT_MS = Number(process.env.TIMEOUT_PER_AGENT_MS || 120_000) // 2 min
const DELAY_BETWEEN_AGENTS_MS = 5_000 // 5s — respects queue serialization

// ── Agent Prompts ───────────────────────────────────────────────────────────

const AGENTS = {
  ops: {
    model: 'relay/ops',
    emoji: '🔧',
    label: 'OPS',
    system: 'Você está gerando um relatório diário de status. Seja conciso, use emoji como indicadores (✅ ❌ ⚠️). Máximo 10 linhas.',
    prompt: [
      'Daily sync: reporte o status operacional.',
      '1. Execute `git -C /mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw status -sb` e reporte branch + status',
      '2. Execute `git -C /mnt/c/Users/guipl/Documents/Coding/cortex-app-main status -sb` e reporte',
      '3. Execute `git -C /mnt/c/Users/guipl/Documents/Coding/pessoal-repo/pessoal/atlas-app status -sb` e reporte',
      'Formato: uma linha por projeto com emoji de status.',
    ].join('\n'),
  },
  data: {
    model: 'relay/data',
    emoji: '🗄️',
    label: 'DATA',
    system: 'Você está gerando um relatório diário de status de dados. Seja conciso. Máximo 10 linhas.',
    prompt: [
      'Daily sync: reporte status de schema e migrations.',
      '1. Execute `git log --oneline -5 -- packages/core/src/schema` para ver mudanças recentes de schema',
      '2. Verifique se há migrations pendentes em `packages/infra/db/src/migrations/`',
      'Formato: lista curta com mudanças recentes ou "sem mudanças".',
    ].join('\n'),
  },
  backstage: {
    model: 'relay/backstage',
    emoji: '🏗️',
    label: 'BACKSTAGE',
    system: 'Você está gerando um relatório diário de status de desenvolvimento. Seja conciso. Máximo 10 linhas.',
    prompt: [
      'Daily sync: reporte status de desenvolvimento do backstage.',
      '1. Execute `git branch --show-current` para ver a branch atual',
      '2. Execute `git log --oneline -5 -- apps/backstage packages/backstage-core packages/payments-core` para ver commits recentes',
      'Formato: branch atual + lista de commits recentes ou "sem mudanças".',
    ].join('\n'),
  },
  review: {
    model: 'relay/review',
    emoji: '🔍',
    label: 'REVIEW',
    system: 'Você está gerando um relatório diário de PRs. Seja conciso. Máximo 10 linhas.',
    prompt: [
      'Daily sync: reporte status de PRs e CI.',
      '1. Execute `gh pr list --repo Freelaw-S-A/freelaw --limit 5 --state open` para PRs abertas',
      '2. Execute `gh pr list --repo Freelaw-S-A/freelaw --limit 3 --state merged` para PRs recentes mergeadas',
      'Formato: lista de PRs com número e título, ou "nenhuma PR aberta".',
    ].join('\n'),
  },
  pessoal: {
    model: 'relay/pessoal',
    emoji: '👤',
    label: 'PESSOAL',
    system: 'Você está gerando um relatório diário de projetos pessoais. Seja conciso. Máximo 10 linhas.',
    prompt: [
      'Daily sync: reporte status dos projetos pessoais.',
      '1. Execute `git -C /mnt/c/Users/guipl/Documents/Coding/cortex-app-main log --oneline -3` para commits recentes',
      '2. Execute `git -C /mnt/c/Users/guipl/Documents/Coding/pessoal-repo/pessoal/apps/cortex-cash log --oneline -3` para commits recentes do cortex-cash',
      'Formato: lista curta de commits recentes por projeto ou "sem mudanças".',
    ].join('\n'),
  },
  arch: {
    model: 'relay/ops',
    emoji: '🗺️',
    label: 'ARQUITETURA',
    system: 'Você está gerando um mapa de arquitetura dos projetos. Seja conciso, use tree view. Máximo 25 linhas.',
    prompt: [
      'Daily sync: gere um mapa de arquitetura dos projetos.',
      'Execute os comandos abaixo e compile um resumo:',
      '1. `find /mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw/apps -maxdepth 1 -type d | sort` — apps do monorepo Freelaw',
      '2. `find /mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw/packages -maxdepth 1 -type d | sort` — packages do monorepo Freelaw',
      '3. `find /mnt/c/Users/guipl/Documents/Coding/pessoal-repo/pessoal/apps -maxdepth 1 -type d | sort` — apps pessoais',
      '4. `ls /mnt/c/Users/guipl/Documents/Coding/cortex-app-main/src/ 2>/dev/null | head -15` — estrutura cortex-app',
      'Formato: tree view com apps/, packages/ e contagem de itens. Destacar mudanças desde ontem com ⚡.',
    ].join('\n'),
  },
}

// ── HTTP Helpers ─────────────────────────────────────────────────────────────

function httpRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const mod = url.protocol === 'https:' ? https : http
    const req = mod.request(url, options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8')
        resolve({ status: res.statusCode, body: text })
      })
    })
    req.on('error', reject)
    req.setTimeout(options.timeout || 30_000, () => {
      req.destroy(new Error('Request timeout'))
    })
    if (body) req.write(body)
    req.end()
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Core ────────────────────────────────────────────────────────────────────

async function queryAgent(name, config) {
  const payload = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: config.system },
      { role: 'user', content: config.prompt },
    ],
  })

  const startMs = Date.now()
  console.log(`[${name}] Querying...`)

  try {
    const res = await httpRequest(`${RELAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      timeout: TIMEOUT_PER_AGENT_MS,
    }, payload)

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)

    if (res.status === 429) {
      console.log(`[${name}] Rate limited, waiting 30s and retrying...`)
      await sleep(30_000)
      return queryAgent(name, { ...config, _retried: true })
    }

    if (res.status !== 200) {
      console.log(`[${name}] Error ${res.status} after ${elapsed}s`)
      return `⚠️ Erro ao consultar agent (HTTP ${res.status})`
    }

    const data = JSON.parse(res.body)
    const text = data.choices?.[0]?.message?.content || '(sem resposta)'
    console.log(`[${name}] Done in ${elapsed}s (${text.length} chars)`)
    return text
  } catch (e) {
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
    console.log(`[${name}] Failed after ${elapsed}s: ${e.message}`)
    return `❌ Falha: ${e.message}`
  }
}

async function fetchStats() {
  try {
    const res = await httpRequest(`${RELAY_URL}/v1/stats`, { method: 'GET', timeout: 5_000 })
    if (res.status === 200) return JSON.parse(res.body)
  } catch {}
  return null
}

function formatStatsSection(stats) {
  if (!stats || !stats.agents || Object.keys(stats.agents).length === 0) return ''

  const lines = ['', '**📊 Uso do dia**', '```']
  let totalReqs = 0
  let totalChars = 0
  let totalDuration = 0

  for (const [agent, data] of Object.entries(stats.agents)) {
    const name = agent.replace('relay/', '').padEnd(10)
    const reqs = String(data.requests).padStart(3)
    const chars = String(data.response_chars).padStart(7)
    const dur = `${(data.duration_ms / 1000).toFixed(0)}s`.padStart(5)
    lines.push(`${name} ${reqs} reqs  ${chars} chars  ${dur}`)
    totalReqs += data.requests
    totalChars += data.response_chars
    totalDuration += data.duration_ms
  }

  lines.push(`${'─'.repeat(38)}`)
  lines.push(`${'total'.padEnd(10)} ${String(totalReqs).padStart(3)} reqs  ${String(totalChars).padStart(7)} chars  ${`${(totalDuration / 1000).toFixed(0)}s`.padStart(5)}`)
  lines.push('```')
  return lines.join('\n')
}

function buildDiscordEmbeds(results, stats) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const embeds = []

  // Main embed with all agent reports
  const sections = Object.entries(AGENTS).map(([name, config]) => {
    const report = results[name] || '(não consultado)'
    // Truncate individual reports to ~700 chars to stay within embed limit
    const truncated = report.length > 700 ? report.slice(0, 697) + '...' : report
    return `${config.emoji} **${config.label}**\n${truncated}`
  })

  const statsSection = formatStatsSection(stats)
  const description = sections.join('\n\n') + statsSection

  // Discord embed description limit is 4096 chars
  if (description.length <= 4096) {
    embeds.push({
      title: `🔄 Daily Sync — ${date}`,
      description,
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
      footer: { text: 'OpenClaw HQ' },
    })
  } else {
    // Split into multiple embeds (one per agent)
    embeds.push({
      title: `🔄 Daily Sync — ${date}`,
      description: `Relatório completo dos ${Object.keys(AGENTS).length} agentes.${statsSection}`,
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
      footer: { text: 'OpenClaw HQ' },
    })
    for (const [name, config] of Object.entries(AGENTS)) {
      const report = results[name] || '(não consultado)'
      embeds.push({
        title: `${config.emoji} ${config.label}`,
        description: report.slice(0, 4096),
        color: 0x2F3136,
      })
    }
  }

  return embeds.slice(0, 10) // Discord max 10 embeds
}

async function postToDiscord(embeds) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('\n⚠️  DISCORD_WEBHOOK_URL not set. Printing to stdout instead:\n')
    for (const embed of embeds) {
      console.log(`── ${embed.title || ''} ──`)
      console.log(embed.description || '')
      console.log()
    }
    return
  }

  const payload = JSON.stringify({
    username: 'OpenClaw Daily Sync',
    embeds,
  })

  const res = await httpRequest(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
    timeout: 10_000,
  }, payload)

  if (res.status >= 200 && res.status < 300) {
    console.log('✅ Posted to Discord')
  } else {
    console.error(`❌ Discord webhook failed (${res.status}): ${res.body.slice(0, 200)}`)
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now()
  console.log(`🔄 Daily Sync started at ${new Date().toISOString()}`)
  console.log(`   Relay: ${RELAY_URL}`)
  console.log(`   Webhook: ${DISCORD_WEBHOOK_URL ? 'configured' : 'NOT SET (stdout mode)'}`)
  console.log()

  const results = {}

  for (const [name, config] of Object.entries(AGENTS)) {
    results[name] = await queryAgent(name, config)
    // Delay between agents to respect queue serialization
    await sleep(DELAY_BETWEEN_AGENTS_MS)
  }

  const stats = await fetchStats()
  const embeds = buildDiscordEmbeds(results, stats)
  await postToDiscord(embeds)

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
  console.log(`\n✅ Daily Sync completed in ${elapsed}s`)
}

main().catch((e) => {
  console.error(`❌ Daily Sync failed: ${e.message}`)
  process.exit(1)
})
