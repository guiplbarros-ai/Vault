#!/usr/bin/env node

/**
 * Script para aplicar migrations via Supabase Management API
 * Uso: node scripts/apply-migration-api.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Carregar variáveis de ambiente
dotenv.config({ path: join(rootDir, '.env') });

const PROJECT_REF = 'xborrshstfcvzrxyqyor';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurado no .env');
  process.exit(1);
}

async function executeSQLViaAPI(sql, description) {
  console.log(`\n📝 ${description}...`);

  const url = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro HTTP ${response.status}: ${errorText}`);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ SQL executado com sucesso!');
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function executeSQLDirectQuery(sql, description) {
  console.log(`\n📝 ${description}...`);

  // Tentar usar a API REST do PostgREST
  // Nota: A API REST não suporta DDL statements diretamente
  // Precisamos usar a connection string com um client PostgreSQL

  console.log('⚠️  A Supabase REST API não suporta DDL statements (CREATE TABLE, etc)');
  console.log('   Abordagens alternativas:');
  console.log('   1. Executar via Supabase SQL Editor (recomendado)');
  console.log('   2. Executar via psql com connection string');
  console.log('   3. Usar Supabase CLI com autenticação (supabase db push)');

  return { success: false, needsManual: true };
}

async function main() {
  console.log('🚀 Cortex Ledger - Apply Migrations via API');
  console.log('============================================\n');

  // Paths dos arquivos SQL
  const migrationFile = join(rootDir, 'supabase/migrations/20251026T000000_init.sql');
  const seedFile = join(rootDir, 'supabase/seed.sql');

  console.log('📋 Arquivos SQL:');
  console.log(`   Migration: ${migrationFile}`);
  console.log(`   Seed: ${seedFile}`);

  // Ler SQL
  const migrationSQL = readFileSync(migrationFile, 'utf-8');
  const seedSQL = readFileSync(seedFile, 'utf-8');

  console.log(`\n   Migration: ${migrationSQL.split('\n').length} linhas`);
  console.log(`   Seed: ${seedSQL.split('\n').length} linhas`);

  // Tentar executar
  const result = await executeSQLDirectQuery(migrationSQL, 'Aplicando migration');

  if (result.needsManual) {
    console.log('\n\n📋 SOLUÇÃO: Copiar para área de transferência');
    console.log('='.repeat(50));
    console.log('\n✂️  Execute estes comandos no terminal:\n');

    console.log('# 1. Copiar MIGRATION SQL:');
    console.log(`cat "${migrationFile}" | pbcopy\n`);

    console.log('# 2. Abrir Supabase SQL Editor:');
    console.log(`open "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"\n`);

    console.log('# 3. Colar (Cmd+V) e executar (Cmd+Enter)\n');

    console.log('# 4. Depois, copiar SEED SQL:');
    console.log(`cat "${seedFile}" | pbcopy\n`);

    console.log('# 5. Executar no mesmo SQL Editor\n');

    console.log('='.repeat(50));
    console.log('\n💡 OU execute via psql:');
    console.log('='.repeat(50));
    console.log('\n# 1. Obter password no dashboard:');
    console.log(`open "https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"`);
    console.log('\n# 2. Executar com psql:');
    console.log(`export PGPASSWORD="sua_senha_aqui"`);
    console.log(`psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 -U postgres.${PROJECT_REF} -d postgres -f "${migrationFile}"`);
    console.log(`psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 -U postgres.${PROJECT_REF} -d postgres -f "${seedFile}"`);
    console.log('\n' + '='.repeat(50));
  }

  console.log('\n✅ Instruções geradas.');
  console.log('   Por favor, siga as etapas acima para aplicar as migrations.\n');
}

main().catch(console.error);
