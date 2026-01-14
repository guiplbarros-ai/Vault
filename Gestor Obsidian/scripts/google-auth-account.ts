import { loadEnv } from '../src/utils/env.js';
import { getGoogleAuthService } from '../src/services/google-auth.service.js';

loadEnv();

const workspaceId = String(process.argv[2] || '').trim();
const accountEmail = String(process.argv[3] || '').trim().toLowerCase();

if (!workspaceId || !accountEmail) {
  console.error('Uso: node --import tsx scripts/google-auth-account.ts <workspaceId> <accountEmail>');
  console.error('Ex.: node --import tsx scripts/google-auth-account.ts pessoal guiplbarros@gmail.com');
  process.exit(1);
}

const auth = getGoogleAuthService(workspaceId as any, accountEmail);
const url = auth.getAuthUrl({ loginHint: accountEmail });

console.log('\n🔐 Google OAuth (por conta)\n');
console.log(`Workspace: ${workspaceId}`);
console.log(`Conta: ${accountEmail}`);
console.log('\nAbra este link e autorize:');
console.log(url);
console.log('\n⏳ Aguardando callback em http://localhost:3000/oauth2callback ...\n');

await auth.startAuthServer();
console.log('✅ Tokens salvos (Supabase/local, conforme config).');

