import { Command } from 'commander';
import { getGoogleAuthService } from '../services/google-auth.service.js';
import { logger } from '../utils/logger.js';
import { exec } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getEnvFilePath, loadEnv } from '../utils/env.js';

export function createGoogleCommand(): Command {
  const google = new Command('google')
    .description('Gerencia autenticação com Google (Calendar/Gmail)');

  // Diagnóstico (não abre navegador)
  google
    .command('diag')
    .description('Mostra qual profile/env/client está ativo (sem autenticar)')
    .action(() => {
      try {
        const env = loadEnv();
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const hasSecret = !!process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
        const envPath = getEnvFilePath();

        console.log('\n🧪 Google diag\n');
        console.log(`📄 env file: ${env.exists ? envPath : `(não encontrado: ${envPath})`}`);
        console.log(`🔎 OAuth client: ${clientId ? clientId : '(não configurado)'}`);
        console.log(`🔁 Redirect URI: ${redirectUri}`);
        console.log(`🔑 Client secret: ${hasSecret ? 'ok' : '(não configurado)'}`);

        if (!clientId || !hasSecret) {
          console.log('\nℹ️ Para este profile, configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
          console.log('   Depois rode: obsidian-manager google auth --force\n');
          return;
        }

        const authService = getGoogleAuthService();
        console.log(`🔐 Token file: ${authService.getTokenPath()}`);

        const status = authService.getAuthStatus();
        console.log(`✅ Authenticated: ${status.authenticated ? 'sim' : 'não'}`);
        if (status.expiresAt) console.log(`⏳ Token expira em: ${status.expiresAt.toLocaleString()}`);
        if (status.authenticated) console.log(`🧾 Scopes OK: ${authService.hasAllRequiredScopes() ? 'sim' : 'não'}`);
        console.log('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`\n✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Autenticar
  google
    .command('auth')
    .description('Autentica com sua conta Google')
    .option('-f, --force', 'Força reautenticação (útil quando mudam os escopos)', false)
    .action(async (opts) => {
      try {
        const env = loadEnv();

        // Helpful diagnostics during OAuth setup (do not print secrets)
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const hasSecret = !!process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
        const envPath = getEnvFilePath();
        const envExists = env.exists;
        console.log(`\n🔎 OAuth client: ${clientId ? clientId : '(não configurado)'}`);
        console.log(`🔁 Redirect URI: ${redirectUri}`);
        console.log(`📄 env file: ${envExists ? envPath : `(não encontrado: ${envPath})`}`);
        console.log(`🔑 Client secret: ${hasSecret ? 'ok' : '(não configurado)'}`);

        if (!clientId || !hasSecret) {
          throw new Error(
            'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados neste profile.\n' +
            'Edite o arquivo mostrado em "env file" e adicione as duas variáveis.'
          );
        }

        const authService = getGoogleAuthService();
        console.log(`🔐 Token file: ${authService.getTokenPath()}`);
        
        // Verifica se já está autenticado
        const status = authService.getAuthStatus();
        const needsScopes = status.authenticated && !authService.hasAllRequiredScopes();
        const shouldReauth = Boolean(opts.force) || needsScopes;

        if (status.authenticated && !shouldReauth) {
          console.log('\n✓ Você já está autenticado com o Google!');
          console.log(`  Token expira em: ${status.expiresAt?.toLocaleString()}`);
          console.log('\n  Para reautenticar, execute: obsidian-manager google auth --force');
          return;
        }

        if (needsScopes && !opts.force) {
          console.log('\nℹ️ Detectei que seus tokens atuais não incluem todos os novos escopos (ex: Google Sheets).');
          console.log('   Vou reautenticar para atualizar os escopos.\n');
        }
        
        // Gera URL de autenticação
        const authUrl = authService.getAuthUrl();
        
        console.log('\n🔐 Autenticação Google\n');
        console.log('Abrindo navegador para autorização...');
        console.log('\nSe o navegador não abrir automaticamente, acesse:');
        console.log(authUrl);
        console.log('\n⏳ Aguardando autorização...\n');
        
        // Tenta abrir o navegador automaticamente
        openBrowser(authUrl);
        
        // Inicia servidor para receber callback
        const result = await authService.startAuthServer();
        
        console.log(`\n✅ ${result}`);
        console.log('\nAgora você pode usar os comandos:');
        console.log('  • obsidian-manager calendar today');
        console.log('  • obsidian-manager gmail unread');
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`\n✗ Erro na autenticação: ${message}`);
        process.exit(1);
      }
    });

  // Status da autenticação
  google
    .command('status')
    .description('Verifica status da autenticação')
    .action(async () => {
      try {
        const authService = getGoogleAuthService();
        const status = authService.getAuthStatus();
        
        console.log('\n🔐 Status da Autenticação Google:\n');
        
        if (status.authenticated) {
          console.log('  ✅ Autenticado');
          console.log(`  📅 Token expira em: ${status.expiresAt?.toLocaleString()}`);
          
          const now = new Date();
          const expiresAt = status.expiresAt!;
          const minutesLeft = Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60);
          
          if (minutesLeft < 10) {
            console.log('  ⚠️  Token expirando em breve (será renovado automaticamente)');
          }
        } else {
          console.log('  ❌ Não autenticado');
          console.log('\n  Execute: obsidian-manager google auth');
        }
        
      } catch (error) {
        console.log('\n  ❌ Não autenticado (credenciais não configuradas)');
        console.log('\n  Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env');
      }
    });

  // Logout
  google
    .command('logout')
    .description('Remove a autenticação salva')
    .action(() => {
      try {
        const authService = getGoogleAuthService();
        authService.logout();
        
        console.log('\n✓ Logout realizado com sucesso!');
        console.log('  Para autenticar novamente: obsidian-manager google auth');
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`\n✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Refresh token manualmente
  google
    .command('refresh')
    .description('Renova o token de acesso manualmente')
    .action(async () => {
      try {
        const authService = getGoogleAuthService();
        await authService.refreshAccessToken();
        
        const status = authService.getAuthStatus();
        
        console.log('\n✓ Token renovado com sucesso!');
        console.log(`  Novo token expira em: ${status.expiresAt?.toLocaleString()}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`\n✗ Erro ao renovar token: ${message}`);
        process.exit(1);
      }
    });

  return google;
}

/**
 * Abre URL no navegador padrão do sistema
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;
  
  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }
  
  exec(command, (error) => {
    if (error) {
      logger.error(`Erro ao abrir navegador: ${error.message}`);
    }
  });
}
