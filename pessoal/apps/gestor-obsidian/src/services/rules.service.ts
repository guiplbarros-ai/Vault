import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getVaultService } from './vault.service.js'

loadEnv()

/**
 * Carrega regras/preferências do "segundo cérebro" a partir do vault.
 *
 * - CORTEX_RULES_NOTE: path relativo dentro do vault (ex: "00-INBOX/CORTEX_RULES.md")
 */
class RulesService {
  private cached: { at: number; rules: string | null } | null = null
  private ttlMs: number

  constructor() {
    this.ttlMs = Number.isFinite(Number(process.env.CORTEX_RULES_CACHE_MS))
      ? Math.max(0, Number(process.env.CORTEX_RULES_CACHE_MS))
      : 10_000
  }

  getRulesPath(): string {
    const p = (process.env.CORTEX_RULES_NOTE || '00-INBOX/CORTEX_RULES.md').trim()
    return p
  }

  getRules(): string | null {
    const now = Date.now()
    if (this.cached && now - this.cached.at <= this.ttlMs) {
      return this.cached.rules
    }

    try {
      const vault = getVaultService()
      const path = this.getRulesPath()
      const raw = vault.readFile(path)
      const rules = raw && raw.trim().length > 0 ? raw.trim() : null
      this.cached = { at: now, rules }
      return rules
    } catch (e) {
      // Vault pode não estar configurado em algumas execuções (ex: bot só comandos).
      const msg = e instanceof Error ? e.message : String(e)
      logger.debug(`RulesService: não foi possível carregar regras (${msg})`)
      this.cached = { at: now, rules: null }
      return null
    }
  }
}

let rulesInstance: RulesService | null = null

export function getRulesService(): RulesService {
  if (!rulesInstance) rulesInstance = new RulesService()
  return rulesInstance
}

export { RulesService }
