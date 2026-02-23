/**
 * Cortex Cash: Dexie.js → Supabase Migration Script
 *
 * Usage:
 *   1. Export data from Dexie using the app's export function (Settings > Export)
 *   2. Save the JSON to scripts/data/export.json
 *   3. Run: npx tsx scripts/migrate-dexie-to-supabase.ts
 *
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - A user created in Supabase Auth (userId to map to)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'cortex_cash' },
})

// ── Helpers ─────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[migrate] ${new Date().toISOString().slice(11, 19)} ${msg}`)
}

async function bulkInsert(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    log(`  ${table}: 0 rows (skip)`)
    return
  }

  // Insert in batches of 500
  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)

    if (error) {
      console.error(`  ERROR inserting into ${table} (batch ${i / batchSize + 1}):`, error.message)
      // Try one by one to identify problem rows
      for (const row of batch) {
        const { error: rowError } = await supabase.from(table).insert(row)
        if (rowError) {
          console.error(`    Row failed:`, JSON.stringify(row).slice(0, 200), rowError.message)
        } else {
          inserted++
        }
      }
    } else {
      inserted += batch.length
    }
  }

  log(`  ${table}: ${inserted}/${rows.length} rows inserted`)
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const exportPath = join(__dirname, 'data', 'export.json')

  if (!existsSync(exportPath)) {
    console.error(`Export file not found: ${exportPath}`)
    console.error('Export data from Cortex Cash app first (Settings > Export Database)')
    process.exit(1)
  }

  const raw = JSON.parse(readFileSync(exportPath, 'utf-8'))
  log('Loaded export data')

  // Get or create the target user ID
  const targetUserId = process.env.MIGRATE_USER_ID

  if (!targetUserId) {
    console.error('Set MIGRATE_USER_ID env var to the Supabase Auth user UUID')
    console.error('Create a user first: supabase auth admin create-user --email you@email.com --password xxx')
    process.exit(1)
  }

  log(`Target user: ${targetUserId}`)

  // ID mapping: old Dexie IDs (string) → new UUIDs
  // For simplicity, if Dexie IDs are already UUIDs we reuse them
  // Otherwise we generate new ones and maintain a map
  const idMap = new Map<string, string>()

  function mapId(oldId: string | undefined | null): string | null {
    if (!oldId) return null
    if (idMap.has(oldId)) return idMap.get(oldId)!
    // If it looks like a UUID, keep it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(oldId)) {
      idMap.set(oldId, oldId)
      return oldId
    }
    // Generate a new UUID
    const newId = crypto.randomUUID()
    idMap.set(oldId, newId)
    return newId
  }

  // ── Migration order (respecting FK dependencies) ─────────

  // 1. Instituicoes (no FK deps)
  if (raw.instituicoes) {
    const rows = raw.instituicoes.map((r: Record<string, unknown>) => ({
      id: mapId(r.id as string),
      nome: r.nome,
      codigo: r.codigo || null,
      logo_url: r.logo_url || null,
      cor: r.cor || null,
    }))
    await bulkInsert('instituicoes', rows)
  }

  // 2. Categorias (self-referencing FK)
  if (raw.categorias) {
    // First pass: insert root categories (no pai_id)
    const roots = raw.categorias.filter((r: Record<string, unknown>) => !r.pai_id)
    const children = raw.categorias.filter((r: Record<string, unknown>) => r.pai_id)

    const mapCategoria = (r: Record<string, unknown>) => ({
      id: mapId(r.id as string),
      usuario_id: r.is_sistema ? null : targetUserId,
      nome: r.nome,
      tipo: r.tipo,
      grupo: r.grupo || null,
      pai_id: r.pai_id ? mapId(r.pai_id as string) : null,
      icone: r.icone || null,
      cor: r.cor || null,
      ordem: r.ordem || 0,
      ativa: r.ativa !== false,
      is_sistema: r.is_sistema || false,
    })

    await bulkInsert('categorias', roots.map(mapCategoria))
    await bulkInsert('categorias', children.map(mapCategoria))
  }

  // 3. Tags
  if (raw.tags) {
    const rows = raw.tags.map((r: Record<string, unknown>) => ({
      id: mapId(r.id as string),
      usuario_id: r.is_sistema ? null : targetUserId,
      nome: r.nome,
      cor: r.cor || null,
      tipo: r.tipo || 'customizada',
      is_sistema: r.is_sistema || false,
    }))
    await bulkInsert('tags', rows)
  }

  // 4. Centros de Custo
  if (raw.centros_custo) {
    const rows = raw.centros_custo.map((r: Record<string, unknown>) => ({
      id: mapId(r.id as string),
      usuario_id: targetUserId,
      nome: r.nome,
      descricao: r.descricao || null,
      cor: r.cor || null,
      icone: r.icone || null,
      ativo: r.ativo !== false,
    }))
    await bulkInsert('centros_custo', rows)
  }

  // 5. Contas
  if (raw.contas) {
    const rows = raw.contas.map((r: Record<string, unknown>) => ({
      id: mapId(r.id as string),
      usuario_id: targetUserId,
      instituicao_id: mapId(r.instituicao_id as string),
      nome: r.nome,
      tipo: r.tipo,
      agencia: r.agencia || null,
      numero: r.numero || null,
      saldo_referencia: r.saldo_referencia || 0,
      data_referencia: r.data_referencia || new Date().toISOString(),
      saldo_atual: r.saldo_atual || 0,
      ativa: r.ativa !== false,
      cor: r.cor || null,
      icone: r.icone || null,
      observacoes: r.observacoes || null,
      conta_pai_id: r.conta_pai_id ? mapId(r.conta_pai_id as string) : null,
      pluggy_id: r.pluggy_id || null,
    }))
    await bulkInsert('contas', rows)
  }

  // 6. Transacoes
  if (raw.transacoes) {
    const rows = raw.transacoes.map((r: Record<string, unknown>) => ({
      id: mapId(r.id as string),
      usuario_id: targetUserId,
      conta_id: mapId(r.conta_id as string),
      categoria_id: r.categoria_id ? mapId(r.categoria_id as string) : null,
      centro_custo_id: r.centro_custo_id ? mapId(r.centro_custo_id as string) : null,
      data: r.data,
      descricao: r.descricao,
      valor: r.valor,
      tipo: r.tipo,
      observacoes: r.observacoes || null,
      tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags as string) : r.tags) : null,
      transferencia_id: r.transferencia_id ? mapId(r.transferencia_id as string) : null,
      conta_destino_id: r.conta_destino_id ? mapId(r.conta_destino_id as string) : null,
      parcelado: r.parcelado || false,
      parcela_numero: r.parcela_numero || null,
      parcela_total: r.parcela_total || null,
      grupo_parcelamento_id: r.grupo_parcelamento_id ? mapId(r.grupo_parcelamento_id as string) : null,
      classificacao_confirmada: r.classificacao_confirmada || false,
      classificacao_origem: r.classificacao_origem || null,
      classificacao_confianca: r.classificacao_confianca || null,
      hash: r.hash || null,
      origem_arquivo: r.origem_arquivo || null,
      origem_linha: r.origem_linha || null,
    }))
    await bulkInsert('transacoes', rows)
  }

  // 7. Remaining tables (quick bulk)
  const simpleTables = [
    { key: 'templates_importacao', userIdField: 'usuario_id' },
    { key: 'regras_classificacao', userIdField: 'usuario_id' },
    { key: 'orcamentos', userIdField: 'usuario_id' },
    { key: 'cartoes_config', userIdField: 'usuario_id' },
    { key: 'investimentos', userIdField: 'usuario_id' },
    { key: 'cenarios', userIdField: 'usuario_id' },
    { key: 'declaracoes_ir', userIdField: 'usuario_id' },
  ]

  for (const { key, userIdField } of simpleTables) {
    if (raw[key]) {
      const rows = raw[key].map((r: Record<string, unknown>) => {
        const mapped: Record<string, unknown> = { ...r }
        mapped.id = mapId(r.id as string)
        mapped[userIdField] = targetUserId

        // Map foreign keys
        for (const [k, v] of Object.entries(mapped)) {
          if (k.endsWith('_id') && k !== 'id' && k !== userIdField && typeof v === 'string') {
            mapped[k] = mapId(v)
          }
        }

        return mapped
      })
      await bulkInsert(key, rows)
    }
  }

  // 8. Child tables (FK to parent)
  const childTables = ['faturas', 'faturas_lancamentos', 'historico_investimentos',
    'patrimonio_snapshots', 'rendimentos_tributaveis', 'rendimentos_isentos',
    'despesas_dedutiveis', 'bens_direitos', 'dividas_onus',
    'configuracoes_comportamento', 'objetivos_financeiros', 'logs_ia']

  for (const key of childTables) {
    if (raw[key]) {
      const rows = raw[key].map((r: Record<string, unknown>) => {
        const mapped: Record<string, unknown> = { ...r }
        mapped.id = mapId(r.id as string)
        if ('usuario_id' in mapped) mapped.usuario_id = targetUserId

        for (const [k, v] of Object.entries(mapped)) {
          if (k.endsWith('_id') && k !== 'id' && k !== 'usuario_id' && typeof v === 'string') {
            mapped[k] = mapId(v)
          }
        }

        return mapped
      })
      await bulkInsert(key, rows)
    }
  }

  log('Migration complete!')

  // Summary
  log('── Summary ──')
  const { data: tables } = await supabase.rpc('', {}).select('*') // won't work, but count below
  for (const table of ['instituicoes', 'contas', 'categorias', 'tags', 'transacoes',
    'orcamentos', 'cartoes_config', 'faturas', 'investimentos', 'patrimonio_snapshots']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    log(`  ${table}: ${count} rows`)
  }
}

main().catch(console.error)
