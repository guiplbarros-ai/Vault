#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xborrshstfcvzrxyqyor.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3Jyc2hzdGZjdnpyeHlxeW9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ1OSwiZXhwIjoyMDc2OTkzNDU5fQ.MAgFTswYJyA0CIY38W-PTRHC5uCG3f2bV2o8FQv37-g';

console.log('🚀 Iniciando aplicação da migração SQL...\n');

// Read migration file
const migration = readFileSync('./supabase/migrations/20251026T000000_init.sql', 'utf8');

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📝 Executando migração SQL...');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      // Try alternative method: direct SQL execution via PostgREST
      console.log('⚠️  exec_sql não disponível, tentando método alternativo...\n');

      // Split into individual statements and execute
      const statements = migration
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📋 ${statements.length} comandos SQL para executar\n`);

      // We'll need to use a direct postgres connection for this
      console.log('❌ Não é possível executar SQL arbitrário via Supabase JS client.');
      console.log('\n📖 Por favor, execute a migração manualmente via Supabase Studio:');
      console.log('\n1. Acesse: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new');
      console.log('2. Cole o conteúdo do arquivo: supabase/migrations/20251026T000000_init.sql');
      console.log('3. Clique em "Run"');
      console.log('\n✅ A migração está pronta para ser executada!\n');
      return;
    }

    console.log('✅ Migração aplicada com sucesso!\n');

    // Verify tables were created
    console.log('🔍 Verificando tabelas criadas...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (!tablesError && tables) {
      console.log(`✅ ${tables.length} tabelas encontradas:\n`);
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    }

  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err.message);
    console.log('\n📖 Execute manualmente via Supabase Studio (ver instruções acima)');
  }
}

applyMigration();
