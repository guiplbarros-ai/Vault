import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { URL } from 'url';
import type { GoogleTokens, GoogleCredentials } from '../types/google.js';
import { logger } from '../utils/logger.js';

config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

const TOKEN_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.obsidian-manager',
  'google-tokens.json'
);

class GoogleAuthService {
  private credentials: GoogleCredentials;
  private tokens: GoogleTokens | null = null;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não configurados. ' +
        'Configure no arquivo .env\n' +
        'Obtenha as credenciais em: https://console.cloud.google.com/apis/credentials'
      );
    }

    this.credentials = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };

    this.loadTokens();
  }

  /**
   * Carrega tokens salvos do arquivo
   */
  private loadTokens(): void {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const tokenData = fs.readFileSync(TOKEN_PATH, 'utf-8');
        this.tokens = JSON.parse(tokenData);
        logger.info('Google Auth: Tokens carregados do arquivo');
      }
    } catch (error) {
      logger.error('Erro ao carregar tokens do Google');
      this.tokens = null;
    }
  }

  /**
   * Salva tokens no arquivo
   */
  private saveTokens(tokens: GoogleTokens): void {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
    logger.info('Google Auth: Tokens salvos');
  }

  /**
   * Gera URL de autorização
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.credentials.client_id,
      redirect_uri: this.credentials.redirect_uri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Troca o código de autorização por tokens
   */
  async exchangeCode(code: string): Promise<GoogleTokens> {
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
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao trocar código: ${error}`);
    }

    const tokens = await response.json() as GoogleTokens;
    tokens.expiry_date = Date.now() + (tokens.expiry_date || 3600) * 1000;
    
    this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Renova o access token usando o refresh token
   */
  async refreshAccessToken(): Promise<GoogleTokens> {
    if (!this.tokens?.refresh_token) {
      throw new Error('Sem refresh token. Execute: obsidian-manager google auth');
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
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao renovar token: ${error}`);
    }

    const newTokens = await response.json() as Partial<GoogleTokens>;
    
    const tokens: GoogleTokens = {
      ...this.tokens,
      access_token: newTokens.access_token!,
      expiry_date: Date.now() + (newTokens.expiry_date || 3600) * 1000,
    };
    
    this.saveTokens(tokens);
    logger.info('Google Auth: Token renovado');
    return tokens;
  }

  /**
   * Obtém um access token válido (renova se necessário)
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error(
        'Não autenticado com Google. Execute: obsidian-manager google auth'
      );
    }

    // Renova se o token expira em menos de 5 minutos
    if (this.tokens.expiry_date - Date.now() < 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }

    return this.tokens.access_token;
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && !!this.tokens.access_token;
  }

  /**
   * Inicia servidor local para receber callback OAuth
   */
  async startAuthServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://localhost:3000`);
          
          if (url.pathname === '/oauth2callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Erro na Autenticação</h1>
                  <p>${error}</p>
                  <p>Você pode fechar esta janela.</p>
                </body></html>
              `);
              server.close();
              reject(new Error(error));
              return;
            }

            if (code) {
              await this.exchangeCode(code);
              
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1>✅ Autenticação Concluída!</h1>
                  <p>Você pode fechar esta janela e voltar ao terminal.</p>
                </body></html>
              `);
              
              server.close();
              resolve('Autenticação concluída com sucesso!');
            }
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>❌ Erro</h1>
              <p>${err instanceof Error ? err.message : 'Erro desconhecido'}</p>
            </body></html>
          `);
          server.close();
          reject(err);
        }
      });

      server.listen(3000, () => {
        logger.info('Google Auth: Servidor de callback iniciado na porta 3000');
      });

      // Timeout após 5 minutos
      setTimeout(() => {
        server.close();
        reject(new Error('Timeout: autenticação não concluída em 5 minutos'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Remove tokens salvos (logout)
   */
  logout(): void {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    this.tokens = null;
    logger.info('Google Auth: Logout realizado');
  }

  /**
   * Retorna informações sobre o status de autenticação
   */
  getAuthStatus(): { authenticated: boolean; expiresAt?: Date } {
    if (!this.tokens) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      expiresAt: new Date(this.tokens.expiry_date),
    };
  }
}

// Singleton
let authInstance: GoogleAuthService | null = null;

export function getGoogleAuthService(): GoogleAuthService {
  if (!authInstance) {
    authInstance = new GoogleAuthService();
  }
  return authInstance;
}

export { GoogleAuthService };
