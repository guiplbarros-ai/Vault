import * as fs from 'node:fs'
import * as path from 'node:path'
import { config as dotenvConfig } from 'dotenv'

let loaded = false
let loadedPath: string | null = null

function resolveEnvFile(input: string): string {
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input)
}

export function getEnvFilePath(): string {
  return resolveEnvFile('.env')
}

export function loadEnv(): { path: string; exists: boolean } {
  if (loaded) {
    return {
      path: loadedPath || getEnvFilePath(),
      exists: loadedPath ? fs.existsSync(loadedPath) : false,
    }
  }

  const envPath = getEnvFilePath()
  const exists = fs.existsSync(envPath)

  dotenvConfig({ path: envPath, override: true })

  loaded = true
  loadedPath = envPath
  return { path: envPath, exists }
}

export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria nao definida: ${key}`)
  }
  return value
}

export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}
