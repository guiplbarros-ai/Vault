'use client'

/**
 * Pluggy Sync Service
 *
 * Client-side service that orchestrates syncing data from Pluggy API routes
 * into the local Dexie/IndexedDB database.
 */

import { getDB } from '../db/client'
import { getCurrentUserId } from '../db/seed-usuarios'
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
    const usuarioId = getCurrentUserId()

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
    await this.reclassifyTransactionTypes()

    // 8. Fix CC virtual account balances (saldo should be 0, not available credit)
    this.reportProgress('Corrigindo saldos de cartão...', 7, 9)
    await this.fixCreditCardAccountBalances()

    // 9. Apply classification rules
    this.reportProgress('Aplicando regras de classificação...', 8, 10)
    await this.applyClassificationRules()

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

  private async syncInstitutions(item: any, accounts: any[]): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const db = getDB()

    try {
      const connector = item.connector
      const connectorName = connector?.name || 'Instituicao'

      // Check if institution already exists by name
      const existing = await db.instituicoes
        .filter((i) => i.nome.toLowerCase() === connectorName.toLowerCase())
        .first()

      if (existing) {
        result.skipped++
      } else {
        const mapped = mapConnectorToInstituicao(
          connectorName,
          connector?.imageUrl,
          connector?.primaryColor
        )
        await db.instituicoes.add({
          ...mapped,
          id: `inst_pluggy_${Date.now()}`,
          created_at: new Date(),
          updated_at: new Date(),
        })
        result.created++
      }
    } catch (err) {
      result.errors.push(`Institution sync error: ${err instanceof Error ? err.message : String(err)}`)
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Accounts
  // --------------------------------------------------------------------------

  private async syncAccounts(accounts: any[], item: any, usuarioId: string): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const db = getDB()

    const connectorName = item.connector?.name || 'Instituicao'
    const instituicao = await db.instituicoes
      .filter((i) => i.nome.toLowerCase() === connectorName.toLowerCase())
      .first()

    if (!instituicao) {
      result.errors.push('Institution not found — sync institutions first')
      return result
    }

    for (const pluggyAccount of accounts) {
      // Skip credit card accounts (handled separately)
      if (pluggyAccount.type === 'CREDIT') continue

      try {
        // Check if already synced by pluggy_id
        const existing = await db.contas
          .filter((c) => c.pluggy_id === pluggyAccount.id)
          .first()

        if (existing) {
          // Update balance
          await db.contas.update(existing.id, {
            saldo_referencia: pluggyAccount.balance,
            saldo_atual: pluggyAccount.balance,
            data_referencia: new Date(),
            updated_at: new Date(),
          })
          result.updated++
        } else {
          const mapped = mapPluggyAccountToConta(pluggyAccount, instituicao.id, usuarioId)
          await db.contas.add({
            ...mapped,
            id: `conta_pluggy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date(),
            updated_at: new Date(),
          })
          result.created++
        }
      } catch (err) {
        result.errors.push(`Account ${pluggyAccount.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Transactions
  // --------------------------------------------------------------------------

  private async syncTransactions(
    accounts: any[],
    transactionsByAccount: Record<string, any[]>,
    usuarioId: string
  ): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const db = getDB()

    for (const pluggyAccount of accounts) {
      const transactions = transactionsByAccount[pluggyAccount.id] || []
      if (transactions.length === 0) continue

      // Find the local account by pluggy_id
      const localAccount = await db.contas
        .filter((c) => c.pluggy_id === pluggyAccount.id)
        .first()

      // For credit cards, find virtual account or create one
      let contaId: string | undefined = localAccount?.id

      if (!contaId && pluggyAccount.type === 'CREDIT') {
        // Check if virtual cc account already exists
        const ccAccount = await db.contas
          .filter((c) => c.pluggy_id === `cc_${pluggyAccount.id}`)
          .first()

        if (ccAccount) {
          contaId = ccAccount.id
        } else {
          // Find institution from cartoes_config or fallback to first institution
          const cartao = await db.cartoes_config
            .filter((c) => c.pluggy_id === pluggyAccount.id)
            .first()

          const instituicaoId = cartao?.instituicao_id
            || (await db.instituicoes.toCollection().first())?.id

          if (instituicaoId) {
            contaId = await this.getOrCreateCreditCardAccount(pluggyAccount, instituicaoId, usuarioId)
          }
        }
      }

      if (!contaId) {
        result.errors.push(`No local account found for Pluggy account ${pluggyAccount.id}`)
        continue
      }

      // Batch insert transactions using bulkPut (upserts by hash)
      const mappedTransactions = transactions.map((tx: any) => {
        const mapped = mapPluggyTransactionToTransacao(tx, contaId!, usuarioId)
        return {
          ...mapped,
          id: `tx_pluggy_${tx.id}`,
          created_at: new Date(tx.createdAt || Date.now()),
          updated_at: new Date(tx.updatedAt || Date.now()),
        }
      })

      try {
        // Use bulkPut for upsert behavior — hash uniqueness handles dedup
        await db.transacoes.bulkPut(mappedTransactions)
        result.created += mappedTransactions.length
      } catch (err) {
        // If bulkPut fails (e.g., constraint violation), try one by one
        for (const tx of mappedTransactions) {
          try {
            await db.transacoes.put(tx)
            result.created++
          } catch (innerErr) {
            result.skipped++
          }
        }
      }
    }

    return result
  }

  private async getOrCreateCreditCardAccount(
    pluggyAccount: any,
    instituicaoId: string,
    usuarioId: string
  ): Promise<string> {
    const db = getDB()

    // Check if we already have a virtual conta for this credit card
    const existing = await db.contas
      .filter((c) => c.pluggy_id === `cc_${pluggyAccount.id}`)
      .first()

    if (existing) return existing.id

    const id = `conta_cc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    await db.contas.add({
      id,
      instituicao_id: instituicaoId,
      nome: `Fatura ${pluggyAccount.name || 'Cartao'}`,
      tipo: 'corrente',
      saldo_referencia: 0,
      data_referencia: new Date(),
      saldo_atual: 0,
      ativa: true,
      pluggy_id: `cc_${pluggyAccount.id}`,
      usuario_id: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return id
  }

  /**
   * Recalculate CC virtual account balances from their transactions.
   * Fatura saldo = sum of despesas - sum of receitas (payments).
   * Stored as negative value (debt) so it doesn't inflate patrimônio.
   */
  private async fixCreditCardAccountBalances(): Promise<number> {
    const db = getDB()
    const ccContas = await db.contas
      .filter((c) => c.pluggy_id?.startsWith('cc_') === true)
      .toArray()

    let fixed = 0
    for (const conta of ccContas) {
      const transactions = await db.transacoes
        .where('conta_id')
        .equals(conta.id)
        .toArray()

      // Current month transactions only
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const monthTx = transactions.filter((t) => {
        const d = t.data instanceof Date ? t.data : new Date(t.data)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })

      const despesas = monthTx
        .filter((t) => t.tipo === 'despesa')
        .reduce((sum, t) => sum + (Number(t.valor) || 0), 0)

      const receitas = monthTx
        .filter((t) => t.tipo === 'receita')
        .reduce((sum, t) => sum + (Number(t.valor) || 0), 0)

      // Fatura value as negative (debt owed)
      const faturaValue = -(despesas - receitas)

      await db.contas.update(conta.id, {
        saldo_atual: faturaValue,
        saldo_referencia: faturaValue,
        updated_at: new Date(),
      })
      fixed++
    }
    return fixed
  }

  // --------------------------------------------------------------------------
  // Credit Cards
  // --------------------------------------------------------------------------

  private async syncCreditCards(accounts: any[], usuarioId: string): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const db = getDB()

    for (const pluggyAccount of accounts) {
      if (!isCreditCardAccount(pluggyAccount)) continue

      try {
        // Find institution
        const conta = await db.contas
          .filter((c) => c.pluggy_id === pluggyAccount.id || c.pluggy_id === `cc_${pluggyAccount.id}`)
          .first()

        const instituicao = conta
          ? await db.instituicoes.get(conta.instituicao_id)
          : await db.instituicoes.toCollection().first()

        if (!instituicao) {
          result.errors.push(`No institution found for credit card ${pluggyAccount.name}`)
          continue
        }

        // Check if card already exists by pluggy_id
        const existingCard = await db.cartoes_config
          .filter((c) => c.pluggy_id === pluggyAccount.id)
          .first()

        const mapped = mapPluggyAccountToCartao(pluggyAccount, instituicao.id, usuarioId)
        if (!mapped) continue

        if (existingCard) {
          await db.cartoes_config.update(existingCard.id, {
            ...mapped,
            updated_at: new Date(),
          })
          result.updated++
        } else {
          await db.cartoes_config.add({
            ...mapped,
            id: `cartao_pluggy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date(),
            updated_at: new Date(),
          })
          result.created++
        }
      } catch (err) {
        result.errors.push(`Credit card ${pluggyAccount.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Investments
  // --------------------------------------------------------------------------

  private async syncInvestments(investments: any[], item: any, usuarioId: string): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
    const db = getDB()

    if (!investments || investments.length === 0) return result

    const connectorName = item.connector?.name || 'Instituicao'
    const instituicao = await db.instituicoes
      .filter((i) => i.nome.toLowerCase() === connectorName.toLowerCase())
      .first()

    if (!instituicao) {
      result.errors.push('Institution not found for investments')
      return result
    }

    for (const pluggyInv of investments) {
      try {
        const existing = await db.investimentos
          .filter((i) => i.pluggy_id === pluggyInv.id)
          .first()

        const mapped = mapPluggyInvestmentToInvestimento(pluggyInv, instituicao.id, usuarioId)

        if (existing) {
          await db.investimentos.update(existing.id, {
            ...mapped,
            updated_at: new Date(),
          })
          result.updated++
        } else {
          await db.investimentos.add({
            ...mapped,
            id: `inv_pluggy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date(),
            updated_at: new Date(),
          })
          result.created++
        }
      } catch (err) {
        result.errors.push(`Investment ${pluggyInv.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return result
  }

  // --------------------------------------------------------------------------
  // Post-Sync: Type Reclassification
  // --------------------------------------------------------------------------

  private async reclassifyTransactionTypes(): Promise<number> {
    const db = getDB()
    let count = 0

    const pluggyTransactions = await db.transacoes
      .filter((t) => t.origem_arquivo === 'pluggy' && t.tipo !== 'transferencia')
      .toArray()

    for (const tx of pluggyTransactions) {
      const newType = matchTypeReclassRule(tx.descricao)
      if (newType && newType !== tx.tipo) {
        await db.transacoes.update(tx.id, {
          tipo: newType,
          updated_at: new Date(),
        })
        count++
      }
    }

    return count
  }

  // --------------------------------------------------------------------------
  // Post-Sync: Classification Rules
  // --------------------------------------------------------------------------

  private async applyClassificationRules(): Promise<number> {
    const db = getDB()
    let count = 0

    const uncategorized = await db.transacoes
      .filter((t) => !t.categoria_id && t.tipo !== 'transferencia')
      .toArray()

    if (uncategorized.length === 0) return 0

    const regras = await db.regras_classificacao
      .filter((r) => r.ativa)
      .toArray()

    if (regras.length === 0) return 0

    regras.sort((a, b) => a.prioridade - b.prioridade)

    for (const tx of uncategorized) {
      const descUpper = tx.descricao.toUpperCase()

      for (const regra of regras) {
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
            try { isMatch = new RegExp(regra.padrao, 'i').test(tx.descricao) }
            catch { isMatch = false }
            break
        }

        if (isMatch) {
          await db.transacoes.update(tx.id, {
            categoria_id: regra.categoria_id,
            classificacao_origem: 'regra',
            classificacao_confirmada: false,
            updated_at: new Date(),
          })
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

  private saveSyncMeta(meta: Partial<{ lastSync: Date; itemId: string; lastError: string | null }>) {
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
