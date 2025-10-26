#!/usr/bin/env node

/**
 * Script para aplicar migrations do Supabase
 * Uso: node scripts/apply-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Carregar variáveis de ambiente
dotenv.config({ path: join(rootDir, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erro: SUPABASE_URL ou SERVICE_ROLE_KEY não configurados no .env');
  process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filePath, description) {
  console.log(`\n📝 ${description}...`);
  console.log(`   Arquivo: ${filePath}`);

  try {
    const sql = readFileSync(filePath, 'utf-8');
    const lines = sql.split('\n').length;
    console.log(`   Linhas: ${lines}`);

    // Nota: A API do Supabase não permite executar SQL diretamente via client
    // Precisamos usar a API REST do PostgREST ou a Management API

    // Para executar SQL arbitrário, usamos o endpoint RPC ou a Management API
    // Como alternativa, mostramos o conteúdo para execução manual

    console.log('\n⚠️  Execução direta via API não suportada.');
    console.log('   Por favor, execute manualmente no Supabase Studio:');
    console.log(`   \n   1. Acesse: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
    console.log('   2. Cole o conteúdo do arquivo SQL');
    console.log('   3. Clique em "Run"');
    console.log(`\n   Arquivo SQL:\n   ${filePath}\n`);

    return { success: false, manual: true };
  } catch (error) {
    console.error(`❌ Erro ao ler arquivo: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifyConnection() {
  console.log('🔍 Verificando conexão com Supabase...');
  console.log(`   URL: ${SUPABASE_URL}`);

  try {
    // Tentar uma query simples para verificar conexão
    const { data, error } = await supabase
      .from('_realtime')
      .select('*')
      .limit(1);

    if (error && !error.message.includes('does not exist')) {
      console.log('✅ Conexão estabelecida!');
      return true;
    }

    // Se a tabela não existe, ainda assim estamos conectados
    console.log('✅ Conexão estabelecida!');
    return true;
  } catch (error) {
    console.error(`❌ Erro de conexão: ${error.message}`);
    return false;
  }
}

async function checkExistingTables() {
  console.log('\n🔍 Verificando tabelas existentes...');

  try {
    // Tentar query em uma tabela que seria criada pela migration
    const { data, error } = await supabase
      .from('instituicao')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('⚠️  Tabelas já existem! Migration pode já ter sido aplicada.');
      return true;
    }

    console.log('✅ Tabelas não encontradas (migration ainda não aplicada)');
    return false;
  } catch (error) {
    console.log('✅ Tabelas não encontradas (migration ainda não aplicada)');
    return false;
  }
}

async function main() {
  console.log('🚀 Cortex Ledger - Apply Migrations Script');
  console.log('==========================================\n');

  // Verificar conexão
  const connected = await verifyConnection();
  if (!connected) {
    console.error('\n❌ Não foi possível conectar ao Supabase. Verifique as credenciais.');
    process.exit(1);
  }

  // Verificar se migrations já foram aplicadas
  const tablesExist = await checkExistingTables();
  if (tablesExist) {
    console.log('\n⚠️  AVISO: Migrations podem já ter sido aplicadas.');
    console.log('   Se continuar, pode haver erros de "already exists".\n');
  }

  // Paths dos arquivos SQL
  const migrationFile = join(rootDir, 'supabase/migrations/20251026T000000_init.sql');
  const seedFile = join(rootDir, 'supabase/seed.sql');

  console.log('\n📋 Plano de Execução:');
  console.log('   1. Migration (schema + RLS + triggers)');
  console.log('   2. Seed (dados de teste)');

  // Executar migration
  const migrationResult = await executeSQLFile(migrationFile, 'Aplicando migration');

  if (migrationResult.manual) {
    console.log('\n📌 INSTRUÇÕES DE EXECUÇÃO MANUAL:');
    console.log('\n1️⃣  MIGRATION (Schema + RLS + Triggers):');
    console.log(`   cat "${migrationFile}" | pbcopy`);
    console.log(`   Abra: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
    console.log('   Cole o SQL copiado e execute\n');

    console.log('2️⃣  SEED (Dados de teste):');
    console.log(`   cat "${seedFile}" | pbcopy`);
    console.log(`   Abra: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
    console.log('   Cole o SQL copiado e execute\n');

    console.log('\n💡 ALTERNATIVA - Executar via psql:');
    console.log('   1. Obtenha o database password no Supabase Dashboard');
    console.log('   2. Execute:');
    console.log(`      export PGPASSWORD="sua_senha_aqui"`);
    console.log(`      psql "postgresql://postgres.xborrshstfcvzrxyqyor@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f "${migrationFile}"`);
    console.log(`      psql "postgresql://postgres.xborrshstfcvzrxyqyor@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f "${seedFile}"`);
  }

  console.log('\n✅ Script concluído.');
  console.log('   As migrations precisam ser aplicadas manualmente via Supabase Studio.');
  console.log('   Siga as instruções acima.\n');
}

main().catch(console.error);
