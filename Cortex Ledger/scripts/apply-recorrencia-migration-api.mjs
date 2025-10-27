import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://xborrshstfcvzrxyqyor.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('\nUsage:')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/apply-recorrencia-migration-api.mjs')
  process.exit(1)
}

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'params=single-object'
    },
    body: JSON.stringify({ query: sql })
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  return { success: true, response: text }
}

async function applyMigration() {
  console.log('📖 Reading migration file...\n')

  const migrationPath = join(__dirname, '../supabase/migrations/20251026T000002_fix_recorrencia_columns.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';')

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.length > 80
      ? statement.substring(0, 80) + '...'
      : statement

    console.log(`[${i + 1}/${statements.length}] ${preview}`)

    try {
      await executeSQL(statement)
      console.log('✅ Success\n')
      successCount++
    } catch (error) {
      console.error('❌ Error:', error.message)
      console.error('   Statement:', statement)
      console.log()
      errorCount++
    }
  }

  console.log('━'.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log(`   📝 Total: ${statements.length}`)

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!')
  } else {
    console.log('\n⚠️  Migration completed with errors')
    process.exit(1)
  }
}

applyMigration().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
