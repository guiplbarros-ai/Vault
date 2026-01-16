import * as fs from 'node:fs'
import * as path from 'node:path'
import { config as dotenvConfig } from 'dotenv'

let loaded = false
let loadedPath: string | null = null

function resolveEnvFile(input: string): string {
  // allow relative like ".env.pessoal"
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input)
}

/**
 * Decide qual arquivo de env carregar.
 *
 * A partir de agora, este projeto usa **apenas um** arquivo central:
 * - `.env` no diretório atual
 *
 * Motivo: reduzir inconsistências e erros operacionais com múltiplos `.env.*`.
 */
export function getEnvFilePath(): string {
  // Intencionalmente ignoramos OBSIDIAN_MANAGER_ENV_FILE/ENV_FILE.
  // Mantemos resolveEnvFile por compatibilidade de path absoluto/relativo.
  return resolveEnvFile('.env')
}

/**
 * Carrega variáveis de ambiente a partir do arquivo selecionado.
 * - override=true para impedir "vazamento" de variáveis exportadas no shell
 * - idempotente: seguro chamar em qualquer módulo
 */
export function loadEnv(): { path: string; exists: boolean } {
  if (loaded) {
    return {
      path: loadedPath || getEnvFilePath(),
      exists: loadedPath ? fs.existsSync(loadedPath) : false,
    }
  }

  // Warn if user is trying to use multiple env files (no longer supported).
  const overrideRequested = (
    process.env.OBSIDIAN_MANAGER_ENV_FILE ||
    process.env.ENV_FILE ||
    ''
  ).trim()
  if (overrideRequested) {
    // eslint-disable-next-line no-console
    console.warn(
      `[env] OBSIDIAN_MANAGER_ENV_FILE/ENV_FILE foi definido, mas o projeto agora carrega apenas .env. ` +
        `Ignorando override="${overrideRequested}".`
    )
  }

  const envPath = getEnvFilePath()
  const exists = fs.existsSync(envPath)

  // Mesmo se não existir, chamamos para permitir erro/diagnóstico consistente
  dotenvConfig({ path: envPath, override: true })

  loaded = true
  loadedPath = envPath
  return { path: envPath, exists }
}
