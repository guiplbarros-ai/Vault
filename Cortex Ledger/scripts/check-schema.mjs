import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xborrshstfcvzrxyqyor.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3Jyc2hzdGZjdnpyeHlxeW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTc0NTksImV4cCI6MjA3Njk5MzQ1OX0.Y7R66W0bAQ7KkoO_ozeOnyIfDZeSdNzw9oKr7uVp9T4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  console.log('🔍 Checking transacao table schema...\n')

  // Try to select with categoria_id to see if it exists
  const { data, error } = await supabase
    .from('transacao')
    .select('id, descricao, valor, data, tipo, categoria_id, conta_id')
    .limit(1)

  if (error) {
    console.error('❌ Error querying transacao:', error)

    if (error.message && error.message.includes('categoria_id')) {
      console.log('\n⚠️  Column categoria_id does NOT exist in transacao table')
      console.log('\n📋 You need to add this column. Here are the options:\n')
      console.log('Option 1: Run in Supabase SQL Editor')
      console.log('  1. Go to: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new')
      console.log('  2. Copy and paste the SQL from: supabase/migrations/20251026T000001_add_categoria_to_transacao.sql')
      console.log('  3. Click "Run"\n')

      console.log('Option 2: Use Supabase CLI (if you have service role key)')
      console.log('  supabase link --project-ref xborrshstfcvzrxyqyor')
      console.log('  supabase db push\n')
    }
  } else {
    console.log('✅ categoria_id column exists!')
    console.log('Data sample:', data)
  }

  // Check if we can query with relationship
  console.log('\n🔍 Testing relationship query...')
  const { data: data2, error: error2 } = await supabase
    .from('transacao')
    .select('id, descricao, categoria:categoria_id(id, nome)')
    .limit(1)

  if (error2) {
    console.error('❌ Relationship query failed:', error2)
  } else {
    console.log('✅ Relationship query works!')
    console.log('Data:', data2)
  }
}

checkSchema()
