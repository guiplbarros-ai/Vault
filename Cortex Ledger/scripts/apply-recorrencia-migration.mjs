import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://xborrshstfcvzrxyqyor.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3Jyc2hzdGZjdnpyeHlxeW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTc0NTksImV4cCI6MjA3Njk5MzQ1OX0.Y7R66W0bAQ7KkoO_ozeOnyIfDZeSdNzw9oKr7uVp9T4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('Reading migration file...')

  const migrationPath = join(__dirname, '../supabase/migrations/20251026T000002_fix_recorrencia_columns.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration...')
  console.log('SQL:', sql)

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (statement) {
      console.log('\nExecuting:', statement.substring(0, 100) + '...')
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          console.error('Error:', error)
          // Try alternative approach
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ sql_query: statement })
          })

          if (!response.ok) {
            const text = await response.text()
            console.error('HTTP Error:', response.status, text)
          } else {
            console.log('Success via HTTP')
          }
        } else {
          console.log('Success')
        }
      } catch (err) {
        console.error('Exception:', err.message)
      }
    }
  }

  console.log('\nMigration completed!')
}

applyMigration().catch(console.error)
