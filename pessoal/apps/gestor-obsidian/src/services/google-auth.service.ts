import * as fs from 'fs'
import * as http from 'http'
import * as path from 'path'
import { URL } from 'url'
import type { GoogleCredentials, GoogleTokens } from '../types/google.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getGoogleTokensDbService } from './google-tokens-db.service.js'

loadEnv()

type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  scope?: string
  token_type: string
  expires_in?: number
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  // Google Drive (organização de arquivos/pastas)
  // Observação: ao adicionar este escopo, é necessário re-consentir (reconectar Google)
  // para que o token passe a incluir a permissão.
  'https://www.googleapis.com/auth/drive',
  // Google Sheets (leitura) - para sync financeiro
  'https://www.googleapis.com/auth/spreadsheets.readonly',
]

function getTokenDir(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || '.', '.obsidian-manager')
}

function safeClientKey(clientId: string): string {
  // client_id looks like: xxxx.apps.googleusercontent.com
  // We just need a stable file name segment.
  return clientId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function getTokenPathForClient(clientId: string): string {
  const explicit = process.env.GOOGLE_TOKENS_PATH
  if (explicit) return explicit
  const dir = getTokenDir()
  const key = safeClientKey(clientId) || 'unknown-client'
  return path.join(dir, `google-tokens.${key}.json`)
}

class GoogleAuthService {
  private credentials: GoogleCredentials
  private tokens: GoogleTokens | null = null
  private tokenPath: string
  private workspaceId: string
  private accountEmail: string | null
  private loaded = false
  private loadingPromise: Promise<void> | null = null

  constructor(input?: { workspaceId?: string; accountEmail?: string | null }) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'

    if (!clientId || !clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não configurados. ' +
          'Configure no arquivo .env\n' +
          'Obtenha as credenciais em: https://console.cloud.google.com/apis/credentials'
      )
    }

    this.credentials = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }

    this.workspaceId = (
      input?.workspaceId ||
      process.env.CORTEX_DEFAULT_WORKSPACE ||
      'pessoal'
    ).trim()
    this.accountEmail = input?.accountEmail || null

    this.tokenPath = getTokenPathForClient(this.credentials.client_id)
    // Load tokens from Supabase (cloud) if possible, otherwise from local file (dev).
    // NOTE: For multi-account, you MUST pass accountEmail (or set chat_settings.google_account_email).
    this.loadingPromise = this.loadTokens().finally(() => {
      this.loaded = true
      this.loadingPromise = null
    })
  }

  getTokenPath(): string {
    return this.tokenPath
  }

  /**
   * Carrega tokens salvos do arquivo
   */
  private async loadTokens(): Promise<void> {
    const db = getGoogleTokensDbService()
    if (db.enabled() && this.accountEmail) {
      const row = await db.get(this.workspaceId, this.accountEmail)
      if (row?.tokens) {
        this.tokens = row.tokens as unknown as GoogleTokens
        logger.info(
          `Google Auth: Tokens carregados do Supabase (${this.workspaceId}/${this.accountEmail})`
        )
        return
      }
      this.tokens = null
      return
    }

    // Local fallback (dev)
    try {
      if (fs.existsSync(this.tokenPath)) {
        const tokenData = fs.readFileSync(this.tokenPath, 'utf-8')
        this.tokens = JSON.parse(tokenData)
        logger.info('Google Auth: Tokens carregados do arquivo')
      }
    } catch {
      logger.error('Erro ao carregar tokens do Google')
      this.tokens = null
    }
  }

  /**
   * Salva tokens no arquivo
   */
  private async saveTokens(tokens: GoogleTokens): Promise<void> {
    const db = getGoogleTokensDbService()
    if (db.enabled() && this.accountEmail) {
      await db.upsert({
        workspaceId: this.workspaceId,
        accountEmail: this.accountEmail,
        tokens: tokens as unknown as Record<string, unknown>,
        scopes: tokens.scope || SCOPES.join(' '),
      })
      this.tokens = tokens
      logger.info(
        `Google Auth: Tokens salvos no Supabase (${this.workspaceId}/${this.accountEmail})`
      )
      return
    }

    // Local fallback (dev)
    const dir = path.dirname(this.tokenPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2))
    this.tokens = tokens
    logger.info('Google Auth: Tokens salvos')
  }

  /**
   * Gera URL de autorização
   */
  getAuthUrl(opts?: { state?: string; loginHint?: string }): string {
    const params = new URLSearchParams({
      client_id: this.credentials.client_id,
      redirect_uri: this.credentials.redirect_uri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      // força escolher conta + reconsentimento (bom para múltiplas contas)
      prompt: 'consent select_account',
    })
    if (opts?.state) params.set('state', opts.state)
    if (opts?.loginHint) params.set('login_hint', opts.loginHint)

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Troca o código de autorização por tokens
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise
      return
    }
    if (!this.loaded) {
      await this.loadTokens()
      this.loaded = true
    }
  }

  async exchangeCode(code: string): Promise<GoogleTokens> {
    await this.ensureLoaded()
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        redirect_uri: this.credentials.redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao trocar código: ${error}`)
    }

    const raw = (await response.json()) as GoogleTokenResponse
    const expiresIn = Number(raw.expires_in ?? 3600)
    const tokens: GoogleTokens = {
      access_token: raw.access_token,
      // Em alguns casos o Google NÃO retorna refresh_token (ex.: re-consentimento).
      // Mantemos o refresh_token anterior para não "deslogar" o usuário.
      refresh_token: raw.refresh_token ?? this.tokens?.refresh_token,
      scope: raw.scope ?? SCOPES.join(' '),
      token_type: raw.token_type,
      expiry_date: Date.now() + expiresIn * 1000,
    }

    await this.saveTokens(tokens)
    return tokens
  }

  /**
   * Renova o access token usando o refresh token
   */
  async refreshAccessToken(): Promise<GoogleTokens> {
    await this.ensureLoaded()
    if (!this.tokens?.refresh_token) {
      throw new Error('Sem refresh token. Execute: obsidian-manager google auth')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: this.tokens.refresh_token,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao renovar token: ${error}`)
    }

    const raw = (await response.json()) as Partial<GoogleTokenResponse>
    const expiresIn = Number(raw.expires_in ?? 3600)

    const tokens: GoogleTokens = {
      ...this.tokens,
      access_token: raw.access_token!,
      expiry_date: Date.now() + expiresIn * 1000,
    }

    await this.saveTokens(tokens)
    logger.info('Google Auth: Token renovado')
    return tokens
  }

  /**
   * Obtém um access token válido (renova se necessário)
   */
  async getValidAccessToken(): Promise<string> {
    await this.ensureLoaded()
    if (!this.tokens) {
      throw new Error('Não autenticado com Google. Execute: obsidian-manager google auth')
    }

    // Renova se o token expira em menos de 5 minutos
    if (this.tokens.expiry_date - Date.now() < 5 * 60 * 1000) {
      await this.refreshAccessToken()
    }

    return this.tokens.access_token
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && !!this.tokens.access_token
  }

  /**
   * Verifica se o token atual contém TODOS os escopos exigidos pelo app.
   * (Útil quando adicionamos novos escopos, ex: Sheets.)
   */
  hasAllRequiredScopes(): boolean {
    const granted = new Set((this.tokens?.scope ?? '').split(/\s+/).filter(Boolean))
    return SCOPES.every((s) => granted.has(s))
  }

  /**
   * Inicia servidor local para receber callback OAuth
   */
  async startAuthServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://localhost:3000`)

          if (url.pathname === '/oauth2callback') {
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Erro na Autenticação</h1>
                  <p>${error}</p>
                  <p>Você pode fechar esta janela.</p>
                </body></html>
              `)
              server.close()
              reject(new Error(error))
              return
            }

            if (code) {
              await this.exchangeCode(code)

              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>✅ Autenticação Concluída!</h1>
                  <p>Você pode fechar esta janela e voltar ao terminal.</p>
                </body></html>
              `)

              server.close()
              resolve('Autenticação concluída com sucesso!')
            }
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>❌ Erro</h1>
              <p>${err instanceof Error ? err.message : 'Erro desconhecido'}</p>
            </body></html>
          `)
          server.close()
          reject(err)
        }
      })

      server.listen(3000, () => {
        logger.info('Google Auth: Servidor de callback iniciado na porta 3000')
      })

      // Timeout após 5 minutos
      setTimeout(
        () => {
          server.close()
          reject(new Error('Timeout: autenticação não concluída em 5 minutos'))
        },
        5 * 60 * 1000
      )
    })
  }

  /**
   * Remove tokens salvos (logout)
   */
  logout(): void {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath)
    }
    this.tokens = null
    logger.info('Google Auth: Logout realizado')
  }

  /**
   * Retorna informações sobre o status de autenticação
   */
  getAuthStatus(): { authenticated: boolean; expiresAt?: Date } {
    if (!this.tokens) {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      expiresAt: new Date(this.tokens.expiry_date),
    }
  }
}

// Singleton
const instances = new Map<string, GoogleAuthService>()

export function getGoogleAuthService(
  workspaceId?: string,
  accountEmail?: string | null
): GoogleAuthService {
  const wid = (workspaceId || process.env.CORTEX_DEFAULT_WORKSPACE || 'pessoal').trim()
  const acc = (accountEmail || '').trim().toLowerCase()
  const key = `${wid}::${acc || 'default'}`
  if (!instances.has(key)) {
    instances.set(key, new GoogleAuthService({ workspaceId: wid, accountEmail: acc || null }))
  }
  return instances.get(key)!
}

export { GoogleAuthService }
