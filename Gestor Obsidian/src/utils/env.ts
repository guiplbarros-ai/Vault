import { config as dotenvConfig } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

let loaded = false;
let loadedPath: string | null = null;

function resolveEnvFile(input: string): string {
  // allow relative like ".env.pessoal"
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

/**
 * Decide qual arquivo de env carregar.
 *
 * Ordem:
 * 1) OBSIDIAN_MANAGER_ENV_FILE (recomendado)
 * 2) ENV_FILE (compat)
 * 3) .env no diretório atual
 */
export function getEnvFilePath(): string {
  const raw = (process.env.OBSIDIAN_MANAGER_ENV_FILE || process.env.ENV_FILE || '.env').trim();
  return resolveEnvFile(raw);
}

/**
 * Carrega variáveis de ambiente a partir do arquivo selecionado.
 * - override=true para impedir "vazamento" de variáveis exportadas no shell
 * - idempotente: seguro chamar em qualquer módulo
 */
export function loadEnv(): { path: string; exists: boolean } {
  if (loaded) {
    return { path: loadedPath || getEnvFilePath(), exists: loadedPath ? fs.existsSync(loadedPath) : false };
  }

  const envPath = getEnvFilePath();
  const exists = fs.existsSync(envPath);

  // Mesmo se não existir, chamamos para permitir erro/diagnóstico consistente
  dotenvConfig({ path: envPath, override: true });

  loaded = true;
  loadedPath = envPath;
  return { path: envPath, exists };
}

