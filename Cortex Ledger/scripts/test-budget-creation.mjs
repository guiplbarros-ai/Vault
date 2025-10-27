#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { format, startOfMonth } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xborrshstfcvzrxyqyor.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3Jyc2hzdGZjdnpyeHlxeW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTc0NTksImV4cCI6MjA3Njk5MzQ1OX0.Y7R66W0bAQ7KkoO_ozeOnyIfDZeSdNzw9oKr7uVp9T4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBudgetCreation() {
  console.log('🧪 Testing Budget Creation...\n')

  // Verificar se há usuário autenticado
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    console.error('❌ No active session. Please login first.')
    console.log('\nYou need to be authenticated to create budgets.')
    console.log('The app uses Row Level Security (RLS) policies.')
    return
  }

  console.log('✅ User authenticated:', session.user.email)
  console.log('User ID:', session.user.id)

  // Buscar uma categoria do usuário
  console.log('\n🔍 Fetching user categories...')
  const { data: categorias, error: categoriasError } = await supabase
    .from('categoria')
    .select('*')
    .limit(1)

  if (categoriasError) {
    console.error('❌ Error fetching categories:', categoriasError)
    return
  }

  if (!categorias || categorias.length === 0) {
    console.error('❌ No categories found. Please create at least one category first.')
    return
  }

  const categoria = categorias[0]
  console.log('✅ Found category:', categoria.nome, '(', categoria.grupo, ')')

  // Criar orçamento de teste
  const mesAtual = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const budgetData = {
    categoria_id: categoria.id,
    mes: mesAtual,
    valor_alvo: 1500.00
  }

  console.log('\n📝 Creating budget with data:', budgetData)

  const { data: budget, error: budgetError } = await supabase
    .from('orcamento')
    .insert(budgetData)
    .select()
    .single()

  if (budgetError) {
    console.error('❌ Error creating budget:', budgetError)
    console.error('\nPossible causes:')
    console.error('1. RLS policies not configured correctly')
    console.error('2. Duplicate budget for same category and month')
    console.error('3. User permissions issue')
    return
  }

  console.log('✅ Budget created successfully!')
  console.log('Budget ID:', budget.id)
  console.log('Budget data:', budget)

  // Verificar se o orçamento foi criado
  console.log('\n🔍 Verifying budget...')
  const { data: verificacao, error: verifyError } = await supabase
    .from('orcamento')
    .select('*')
    .eq('id', budget.id)
    .single()

  if (verifyError) {
    console.error('❌ Error verifying budget:', verifyError)
    return
  }

  console.log('✅ Budget verified in database!')
  console.log(verificacao)

  // Limpar - deletar o orçamento de teste
  console.log('\n🧹 Cleaning up test budget...')
  const { error: deleteError } = await supabase
    .from('orcamento')
    .delete()
    .eq('id', budget.id)

  if (deleteError) {
    console.error('⚠️  Could not delete test budget:', deleteError)
  } else {
    console.log('✅ Test budget deleted successfully')
  }

  console.log('\n✅ All tests passed!')
}

testBudgetCreation().catch(console.error)
