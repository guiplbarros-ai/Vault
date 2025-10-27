import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://xborrshstfcvzrxyqyor.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/apply-categoria-migration.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

async function applyMigration() {
  console.log('🚀 Reading migration file...')
  const migration = readFileSync('supabase/migrations/20251026T000001_add_categoria_to_transacao.sql', 'utf-8')

  console.log('📝 Migration SQL:')
  console.log(migration)
  console.log('\n')

  // Split by semicolon and execute each statement
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📊 Executing ${statements.length} statements...`)

  for (const [index, statement] of statements.entries()) {
    console.log(`\n[${index + 1}/${statements.length}] Executing...`)
    console.log(statement.substring(0, 100) + '...')

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      })

      if (error) {
        // If exec_sql doesn't exist, try direct execution
        console.log('⚠️  exec_sql RPC not found, trying direct execution...')
        // We can't execute DDL directly via Supabase client
        // User needs to run this in SQL editor
        console.log('❌ Cannot execute DDL statements directly.')
        console.log('Please run this migration in the Supabase SQL Editor:')
        console.log('https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new')
        process.exit(1)
      }

      console.log('✅ Success')
    } catch (err) {
      console.error('❌ Error:', err.message)
      throw err
    }
  }

  console.log('\n✅ All migrations applied successfully!')
}

applyMigration().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
