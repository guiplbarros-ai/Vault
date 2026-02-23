'use client'

/**
 * Pluggy Sync Service
 *
 * Client-side service that orchestrates syncing data from Pluggy API routes
 * into the Supabase database.
 */

import type {
  Account as PluggyAccount,
  Item as PluggyItem,
  Investment as PluggyInvestment,
  Transaction as PluggyTransaction,
} from 'pluggy-sdk'
import { assertUUID, escapeLikePattern, sanitizeExternalId } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import {
  isCreditCardAccount,
  mapConnectorToInstituicao,
  mapPluggyAccountToCartao,
  mapPluggyAccountToConta,
  mapPluggyInvestmentToInvestimento,
  mapPluggyTransactionToTransacao,
} from '../pluggy/mappers'
import { matchTypeReclassRule } from '../pluggy/transaction-type-rules'

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export interface FullSyncResult {
  institutions: SyncResult
  accounts: SyncResult
  transactions: SyncResult
  creditCards: SyncResult
  investments: SyncResult
  duration_ms: number
  synced_at: Date
}

export interface SyncStatus {
  lastSync: Date | null
  itemId: string | null
  isConfigured: boolean
  lastError: string | null
}

interface SyncProgress {
  phase: string
  current: number
  total: number
}

// ============================================================================
// Service
// ============================================================================

const SYNC_META_KEY = 'cortex-cash-pluggy-sync'
const ITEM_ID_KEY = 'cortex-cash-pluggy-item-id'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  assertUUID(user.id, 'userId')
  return user.id
}

export class PluggySyncService {
  private onProgress?: (progress: SyncProgress) => void

  setProgressCallback(callback: (progress: SyncProgress) => void) {
    this.onProgress = callback
  }

  /**
   * Execute full sync: fetch all data from Pluggy and persist locally
   */
  async fullSync(itemId: string): Promise<FullSyncResult> {
    const startTime = Date.now()

    this.reportProgress('Buscando dados do Pluggy...', 0, 5)

    // 1. Call the server-side sync route that fetches everything
    const response = await fetch('/api/pluggy/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.message || `HTTP ${response.status}`
      this.saveSyncMeta({ lastError: errorMsg })

      if (errorData.error === 'PLUGGY_AUTH_ERROR') {
        throw new Error('PLUGGY_TRIAL_EXPIRED')
      }
      throw new Error(`Sync failed: ${errorMsg}`)
    }

    const data = await response.json()
    const usuarioId = await getUserId()

    // 2. Sync institutions
    this.reportProgress('Sincronizando instituicoes...', 1, 5)
    const institutionsResult = await this.syncInstitutions(data.item, data.accounts)

    // 3. Sync accounts (skips credit cards — they become virtual accounts below)
    this.reportProgress('Sincronizando contas...', 2, 8)
    const accountsResult = await this.syncAccounts(data.accounts, data.item, usuarioId)

    // 4. Sync credit cards BEFORE transactions so virtual accounts exist for cc tx lookup
    this.reportProgress('Sincronizando cartoes...', 3, 8)
    const creditCardsResult = await this.syncCreditCards(data.accounts, usuarioId)

    // 5. Sync transactions (now credit card virtual accounts are available)
    this.reportProgress('Sincronizando transacoes...', 4, 8)
    const transactionsResult = await this.syncTransactions(
      data.accounts,
      data.transactionsByAccount,
      usuarioId
    )

    // 6. Sync investments
    this.reportProgress('Sincronizando investimentos...', 5, 8)
    const investmentsResult = await this.syncInvestments(data.investments, data.item, usuarioId)

    // 7. Reclassify transaction types (transfers misclassified as receita/despesa)
    this.reportProgress('Reclassificando tipos...', 6, 8)
    await this.reclassifyTransactionTypes(usuarioId)

    // 8. Fix CC virtual account balances (saldo should be 0, not available credit)
    this.reportProgress('Corrigindo saldos de cartão...', 7, 9)
    await this.fixCreditCardAccountBalances(usuarioId)

    // 9. Apply classification rules
    this.reportProgress('Aplicando regras de classificação...', 8, 10)
    await this.applyClassificationRules(usuarioId)

    // 10. Auto-tag transactions
    this.reportProgress('Aplicando tags automáticas...', 9, 10)
    try {
      const { tagService } = await import('./tag.service')
      await tagService.autoTagTransacoes()
    } catch (e) {
      console.error('Auto-tag failed (non-fatal):', e)
    }

    const result: FullSyncResult = {
      institutions: institutionsResult,
      accounts: accountsResult,
      transactions: transactionsResult,
      creditCards: creditCardsResult,
      investments: investmentsResult,
      duration_ms: Date.now() - startTime,
      synced_at: new Date(),
    }

    // Save sync metadata
    this.saveSyncMeta({
      lastSync: result.synced_at,
      itemId,
      lastError: null,
    })

    return result
  }

  // --------------------------------------------------------------------------
  // Institutions
  // --------------------------------------------------------------------------

  private async syncInstitutions(item: PluggyItem, accounts: PluggyAccount[]): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const supabase = getSupabase()

    try {
      const connector = item.connector
      const connectorName = connector?.name || 'Instituicao'

      // Check if institution already exists by name (case-insensitive)
      const { data: existing } = await supabase
        .from('instituicoes')
        .select('id')
        .ilike('nome', escapeLikePattern(connectorName))
        .maybeSingle()

      if (existing) {
        result.skipped++
      } else {
        const mapped = mapConnectorToInstituicao(
          connectorName,
          connector?.imageUrl,
          connector?.primaryColor
        )
        const { error } = await supabase.from('instituicoes').insert({
          ...mapped,
          id: `inst_pluggy_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        if (error) {
          result.errors.push(`Institution insert error: ${error.message}`)
        } else {
          result.created++
        }
      }
    } catch (err) {
      result.errors.push(
        `Institution sync error: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Accounts
  // --------------------------------------------------------------------------

  private async syncAccounts(accounts: PluggyAccount[], item: PluggyItem, usuarioId: string): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const supabase = getSupabase()

    const connectorName = item.connector?.name || 'Instituicao'
    const { data: instituicao } = await supabase
      .from('instituicoes')
      .select('id')
      .ilike('nome', escapeLikePattern(connectorName))
      .maybeSingle()

    if (!instituicao) {
      result.errors.push('Institution not found — sync institutions first')
      return result
    }

    for (const pluggyAccount of accounts) {
      // Skip credit card accounts (handled separately)
      if (pluggyAccount.type === 'CREDIT') continue

      try {
        // Check if already synced by pluggy_id
        const { data: existing } = await supabase
          .from('contas')
          .select('id')
          .eq('pluggy_id', pluggyAccount.id)
          .maybeSingle()

        if (existing) {
          // Update balance
          const { error } = await supabase
            .from('contas')
            .update({
              saldo_referencia: pluggyAccount.balance,
              saldo_atual: pluggyAccount.balance,
              data_referencia: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          if (error) {
            result.errors.push(`Account update ${pluggyAccount.name}: ${error.message}`)
          } else {
            result.updated++
          }
        } else {
          const mapped = mapPluggyAccountToConta(pluggyAccount, instituicao.id, usuarioId)
          const { error } = await supabase.from('contas').insert({
            ...mapped,
            id: `conta_pluggy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          if (error) {
            result.errors.push(`Account insert ${pluggyAccount.name}: ${error.message}`)
          } else {
            result.created++
          }
        }
      } catch (err) {
        result.errors.push(
          `Account ${pluggyAccount.name}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Transactions
  // --------------------------------------------------------------------------

  private async syncTransactions(
    accounts: PluggyAccount[],
    transactionsByAccount: Record<string, PluggyTransaction[]>,
    usuarioId: string
  ): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const supabase = getSupabase()

    for (const pluggyAccount of accounts) {
      const transactions = transactionsByAccount[pluggyAccount.id] || []
      if (transactions.length === 0) continue

      // Find the local account by pluggy_id
      const { data: localAccount } = await supabase
        .from('contas')
        .select('id')
        .eq('pluggy_id', pluggyAccount.id)
        .maybeSingle()

      // For credit cards, find virtual account or create one
      let contaId: string | undefined = localAccount?.id

      if (!contaId && pluggyAccount.type === 'CREDIT') {
        // Check if virtual cc account already exists
        const { data: ccAccount } = await supabase
          .from('contas')
          .select('id')
          .eq('pluggy_id', `cc_${pluggyAccount.id}`)
          .maybeSingle()

        if (ccAccount) {
          contaId = ccAccount.id
        } else {
          // Find institution from cartoes_config or fallback to first institution
          const { data: cartao } = await supabase
            .from('cartoes_config')
            .select('instituicao_id')
            .eq('pluggy_id', pluggyAccount.id)
            .maybeSingle()

          let instituicaoId: string | undefined = cartao?.instituicao_id

          if (!instituicaoId) {
            const { data: firstInst } = await supabase
              .from('instituicoes')
              .select('id')
              .limit(1)
              .maybeSingle()
            instituicaoId = firstInst?.id
          }

          if (instituicaoId) {
            contaId = await this.getOrCreateCreditCardAccount(
              pluggyAccount,
              instituicaoId,
              usuarioId
            )
          }
        }
      }

      if (!contaId) {
        result.errors.push(`No local account found for Pluggy account ${pluggyAccount.id}`)
        continue
      }

      // Map transactions for upsert
      const mappedTransactions = transactions.map((tx: PluggyTransaction) => {
        const mapped = mapPluggyTransactionToTransacao(tx, contaId!, usuarioId)
        return {
          ...mapped,
          id: `tx_pluggy_${tx.id}`,
          created_at: new Date(tx.createdAt || Date.now()).toISOString(),
          updated_at: new Date(tx.updatedAt || Date.now()).toISOString(),
        }
      })

      try {
        // Use upsert for upsert behavior — hash uniqueness handles dedup
        const { error } = await supabase
          .from('transacoes')
          .upsert(mappedTransactions, { onConflict: 'id' })

        if (error) {
          // If batch upsert fails, try one by one
          for (const tx of mappedTransactions) {
            try {
              const { error: singleError } = await supabase
                .from('transacoes')
                .upsert(tx, { onConflict: 'id' })
              if (singleError) {
                result.skipped++
              } else {
                result.created++
              }
            } catch {
              result.skipped++
            }
          }
        } else {
          result.created += mappedTransactions.length
        }
      } catch (err) {
        result.errors.push(
          `Transactions sync error for account ${pluggyAccount.id}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return result
  }

  private async getOrCreateCreditCardAccount(
    pluggyAccount: PluggyAccount,
    instituicaoId: string,
    usuarioId: string
  ): Promise<string> {
    const supabase = getSupabase()
    const pluggyId = `cc_${pluggyAccount.id}`

    // Check if we already have a virtual conta for this credit card
    const { data: existing } = await supabase
      .from('contas')
      .select('id')
      .eq('pluggy_id', pluggyId)
      .maybeSingle()

    if (existing) return existing.id

    const id = `conta_cc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    await supabase.from('contas').insert({
      id,
      instituicao_id: instituicaoId,
      nome: `Fatura ${pluggyAccount.name || 'Cartao'}`,
      tipo: 'corrente',
      saldo_referencia: 0,
      data_referencia: new Date().toISOString(),
      saldo_atual: 0,
      ativa: true,
      pluggy_id: pluggyId,
      usuario_id: usuarioId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return id
  }

  /**
   * Recalculate CC virtual account balances from their transactions.
   * Fatura saldo = sum of despesas - sum of receitas (payments).
   * Stored as negative value (debt) so it doesn't inflate patrimônio.
   */
  private async fixCreditCardAccountBalances(usuarioId: string): Promise<number> {
    const supabase = getSupabase()

    const { data: ccContas } = await supabase
      .from('contas')
      .select('id, pluggy_id')
      .eq('usuario_id', usuarioId)
      .like('pluggy_id', 'cc_%')

    if (!ccContas || ccContas.length === 0) return 0

    let fixed = 0

    for (const conta of ccContas as { id: string; pluggy_id: string }[]) {
      // Current month transactions only
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const { data: transactions } = await supabase
        .from('transacoes')
        .select('tipo, valor')
        .eq('conta_id', conta.id)
        .gte('data', monthStart.toISOString())
        .lte('data', monthEnd.toISOString())

      if (!transactions) continue

      const despesas = transactions
        .filter((t: { tipo: string; valor: number }) => t.tipo === 'despesa')
        .reduce((sum: number, t: { valor: number }) => sum + (Number(t.valor) || 0), 0)

      const receitas = transactions
        .filter((t: { tipo: string; valor: number }) => t.tipo === 'receita')
        .reduce((sum: number, t: { valor: number }) => sum + (Number(t.valor) || 0), 0)

      // Fatura value as negative (debt owed)
      const faturaValue = -(despesas - receitas)

      await supabase
        .from('contas')
        .update({
          saldo_atual: faturaValue,
          saldo_referencia: faturaValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conta.id)

      fixed++
    }

    return fixed
  }

  // --------------------------------------------------------------------------
  // Credit Cards
  // --------------------------------------------------------------------------

  private async syncCreditCards(accounts: PluggyAccount[], usuarioId: string): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const supabase = getSupabase()

    for (const pluggyAccount of accounts) {
      if (!isCreditCardAccount(pluggyAccount)) continue

      try {
        // Find institution via linked conta
        const safePluggyId = sanitizeExternalId(pluggyAccount.id)
        const { data: conta } = await supabase
          .from('contas')
          .select('instituicao_id')
          .or(`pluggy_id.eq.${safePluggyId},pluggy_id.eq.cc_${safePluggyId}`)
          .maybeSingle()

        let instituicaoId: string | undefined = conta?.instituicao_id

        if (!instituicaoId) {
          const { data: firstInst } = await supabase
            .from('instituicoes')
            .select('id')
            .limit(1)
            .maybeSingle()
          instituicaoId = firstInst?.id
        }

        if (!instituicaoId) {
          result.errors.push(`No institution found for credit card ${pluggyAccount.name}`)
          continue
        }

        // Check if card already exists by pluggy_id
        const { data: existingCard } = await supabase
          .from('cartoes_config')
          .select('id')
          .eq('pluggy_id', pluggyAccount.id)
          .maybeSingle()

        const mapped = mapPluggyAccountToCartao(pluggyAccount, instituicaoId, usuarioId)
        if (!mapped) continue

        if (existingCard) {
          const { error } = await supabase
            .from('cartoes_config')
            .update({
              ...mapped,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCard.id)
          if (error) {
            result.errors.push(`Credit card update ${pluggyAccount.name}: ${error.message}`)
          } else {
            result.updated++
          }
        } else {
          const { error } = await supabase.from('cartoes_config').insert({
            ...mapped,
            id: `cartao_pluggy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          if (error) {
            result.errors.push(`Credit card insert ${pluggyAccount.name}: ${error.message}`)
          } else {
            result.created++
          }
        }
      } catch (err) {
        result.errors.push(
          `Credit card ${pluggyAccount.name}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Investments
  // --------------------------------------------------------------------------

  private async syncInvestments(
    investments: PluggyInvestment[],
    item: PluggyItem,
    usuarioId: string
  ): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const supabase = getSupabase()

    if (!investments || investments.length === 0) return result

    const connectorName = item.connector?.name || 'Instituicao'
    const { data: instituicao } = await supabase
      .from('instituicoes')
      .select('id')
      .ilike('nome', escapeLikePattern(connectorName))
      .maybeSingle()

    if (!instituicao) {
      result.errors.push('Institution not found for investments')
      return result
    }

    for (const pluggyInv of investments) {
      try {
        const { data: existing } = await supabase
          .from('investimentos')
          .select('id')
          .eq('pluggy_id', pluggyInv.id)
          .maybeSingle()

        const mapped = mapPluggyInvestmentToInvestimento(pluggyInv, instituicao.id, usuarioId)

        if (existing) {
          const { error } = await supabase
            .from('investimentos')
            .update({
              ...mapped,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          if (error) {
            result.errors.push(`Investment update ${pluggyInv.name}: ${error.message}`)
          } else {
            result.updated++
          }
        } else {
          const { error } = await supabase.from('investimentos').insert({
            ...mapped,
            id: `inv_pluggy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          if (error) {
            result.errors.push(`Investment insert ${pluggyInv.name}: ${error.message}`)
          } else {
            result.created++
          }
        }
      } catch (err) {
        result.errors.push(
          `Investment ${pluggyInv.name}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Post-Sync: Type Reclassification
  // --------------------------------------------------------------------------

  private async reclassifyTransactionTypes(usuarioId: string): Promise<number> {
    const supabase = getSupabase()
    let count = 0

    const { data: pluggyTransactions } = await supabase
      .from('transacoes')
      .select('id, descricao, tipo')
      .eq('usuario_id', usuarioId)
      .eq('origem_arquivo', 'pluggy')
      .neq('tipo', 'transferencia')

    if (!pluggyTransactions) return 0

    for (const tx of pluggyTransactions as { id: string; descricao: string; tipo: string }[]) {
      const newType = matchTypeReclassRule(tx.descricao)
      if (newType && newType !== tx.tipo) {
        await supabase
          .from('transacoes')
          .update({
            tipo: newType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tx.id)
        count++
      }
    }

    return count
  }

  // --------------------------------------------------------------------------
  // Post-Sync: Classification Rules
  // --------------------------------------------------------------------------

  private async applyClassificationRules(usuarioId: string): Promise<number> {
    const supabase = getSupabase()
    let count = 0

    // Fetch uncategorized non-transfer transactions
    const { data: uncategorized } = await supabase
      .from('transacoes')
      .select('id, descricao')
      .eq('usuario_id', usuarioId)
      .is('categoria_id', null)
      .neq('tipo', 'transferencia')

    if (!uncategorized || uncategorized.length === 0) return 0

    // Fetch active rules
    const { data: regras } = await supabase
      .from('regras_classificacao')
      .select('padrao, tipo_regra, categoria_id, prioridade')
      .eq('usuario_id', usuarioId)
      .eq('ativa', true)
      .order('prioridade', { ascending: true })

    if (!regras || regras.length === 0) return 0

    for (const tx of uncategorized as { id: string; descricao: string }[]) {
      const descUpper = tx.descricao.toUpperCase()

      for (const regra of regras as {
        padrao: string
        tipo_regra: string
        categoria_id: string
        prioridade: number
      }[]) {
        const padraoUpper = regra.padrao.toUpperCase()
        let isMatch = false

        switch (regra.tipo_regra) {
          case 'contains':
            isMatch = descUpper.includes(padraoUpper)
            break
          case 'starts_with':
            isMatch = descUpper.startsWith(padraoUpper)
            break
          case 'ends_with':
            isMatch = descUpper.endsWith(padraoUpper)
            break
          case 'regex':
            try {
              isMatch = new RegExp(regra.padrao, 'i').test(tx.descricao)
            } catch {
              isMatch = false
            }
            break
        }

        if (isMatch) {
          await supabase
            .from('transacoes')
            .update({
              categoria_id: regra.categoria_id,
              classificacao_origem: 'regra',
              classificacao_confirmada: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tx.id)
          count++
          break
        }
      }
    }

    return count
  }

  // --------------------------------------------------------------------------
  // Sync Status
  // --------------------------------------------------------------------------

  getSyncStatus(): SyncStatus {
    if (typeof window === 'undefined') {
      return { lastSync: null, itemId: null, isConfigured: false, lastError: null }
    }

    try {
      const raw = localStorage.getItem(SYNC_META_KEY)
      if (!raw) {
        return {
          lastSync: null,
          itemId: this.getItemId(),
          isConfigured: !!this.getItemId(),
          lastError: null,
        }
      }
      const meta = JSON.parse(raw)
      return {
        lastSync: meta.lastSync ? new Date(meta.lastSync) : null,
        itemId: meta.itemId || this.getItemId(),
        isConfigured: !!(meta.itemId || this.getItemId()),
        lastError: meta.lastError || null,
      }
    } catch {
      return { lastSync: null, itemId: null, isConfigured: false, lastError: null }
    }
  }

  getItemId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ITEM_ID_KEY)
  }

  setItemId(itemId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ITEM_ID_KEY, itemId)
    }
  }

  private saveSyncMeta(
    meta: Partial<{ lastSync: Date; itemId: string; lastError: string | null }>
  ) {
    if (typeof window === 'undefined') return
    try {
      const existing = JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}')
      const updated = { ...existing, ...meta }
      if (updated.lastSync instanceof Date) {
        updated.lastSync = updated.lastSync.toISOString()
      }
      localStorage.setItem(SYNC_META_KEY, JSON.stringify(updated))
    } catch {
      // Silently fail
    }
  }

  private reportProgress(phase: string, current: number, total: number) {
    this.onProgress?.({ phase, current, total })
  }
}

export const pluggySyncService = new PluggySyncService()
