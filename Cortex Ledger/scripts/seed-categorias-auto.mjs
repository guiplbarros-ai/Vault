#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xborrshstfcvzrxyqyor.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3Jyc2hzdGZjdnpyeHlxeW9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ1OSwiZXhwIjoyMDc2OTkzNDU5fQ.MAgFTswYJyA0CIY38W-PTRHC5uCG3f2bV2o8FQv37-g'

console.log('🚀 Iniciando seed de categorias...\n')

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  // Get user by email
  const email = 'guilhermeplbarros@gmail.com'

  console.log(`📧 Buscando usuário com email: ${email}`)

  const { data: users, error: userError } = await supabase.auth.admin.listUsers()

  if (userError) {
    console.error('❌ Erro ao buscar usuários:', userError)
    process.exit(1)
  }

  const user = users.users.find(u => u.email === email)

  if (!user) {
    console.error(`❌ Usuário com email ${email} não encontrado`)
    process.exit(1)
  }

  console.log(`✅ Usuário encontrado: ${user.id}\n`)

  const userId = user.id

  // Check if user already has categories
  const { data: existingCategorias, error: checkError } = await supabase
    .from('categoria')
    .select('id')
    .eq('user_id', userId)

  if (checkError) {
    console.error('❌ Erro ao verificar categorias existentes:', checkError)
    process.exit(1)
  }

  if (existingCategorias && existingCategorias.length > 0) {
    console.log(`⚠️  Usuário já possui ${existingCategorias.length} categorias.`)
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      rl.question('Deseja continuar e adicionar mais categorias? (s/n): ', resolve)
    })

    rl.close()

    if (answer.toLowerCase() !== 's') {
      console.log('❌ Operação cancelada.')
      process.exit(0)
    }
  }

  console.log('📦 Inserindo categorias...\n')

  // Define categories
  const categorias = [
    // 🏠 MORADIA
    { grupo: 'Moradia', nome: 'Aluguel' },
    { grupo: 'Moradia', nome: 'Condomínio' },
    { grupo: 'Moradia', nome: 'IPTU' },
    { grupo: 'Moradia', nome: 'Energia Elétrica' },
    { grupo: 'Moradia', nome: 'Água' },
    { grupo: 'Moradia', nome: 'Gás' },
    { grupo: 'Moradia', nome: 'Internet' },
    { grupo: 'Moradia', nome: 'Telefone/Celular' },
    { grupo: 'Moradia', nome: 'TV/Streaming' },
    { grupo: 'Moradia', nome: 'Manutenção' },
    { grupo: 'Moradia', nome: 'Móveis e Decoração' },

    // 🍔 ALIMENTAÇÃO
    { grupo: 'Alimentação', nome: 'Supermercado' },
    { grupo: 'Alimentação', nome: 'Feira' },
    { grupo: 'Alimentação', nome: 'Padaria' },
    { grupo: 'Alimentação', nome: 'Restaurantes' },
    { grupo: 'Alimentação', nome: 'Lanches/Fast Food' },
    { grupo: 'Alimentação', nome: 'Delivery' },
    { grupo: 'Alimentação', nome: 'Bebidas/Bar' },
    { grupo: 'Alimentação', nome: 'Cafeteria' },

    // 🚗 TRANSPORTE
    { grupo: 'Transporte', nome: 'Combustível' },
    { grupo: 'Transporte', nome: 'Transporte Público' },
    { grupo: 'Transporte', nome: 'Uber/Taxi' },
    { grupo: 'Transporte', nome: 'Estacionamento' },
    { grupo: 'Transporte', nome: 'Pedágio' },
    { grupo: 'Transporte', nome: 'Manutenção Veículo' },
    { grupo: 'Transporte', nome: 'IPVA' },
    { grupo: 'Transporte', nome: 'Seguro Veículo' },
    { grupo: 'Transporte', nome: 'Financiamento Veículo' },
    { grupo: 'Transporte', nome: 'Multas' },

    // 💊 SAÚDE
    { grupo: 'Saúde', nome: 'Plano de Saúde' },
    { grupo: 'Saúde', nome: 'Médico' },
    { grupo: 'Saúde', nome: 'Dentista' },
    { grupo: 'Saúde', nome: 'Farmácia/Medicamentos' },
    { grupo: 'Saúde', nome: 'Exames' },
    { grupo: 'Saúde', nome: 'Psicólogo/Terapia' },
    { grupo: 'Saúde', nome: 'Academia' },
    { grupo: 'Saúde', nome: 'Suplementos' },

    // 📚 EDUCAÇÃO
    { grupo: 'Educação', nome: 'Mensalidade Escolar' },
    { grupo: 'Educação', nome: 'Faculdade/Pós' },
    { grupo: 'Educação', nome: 'Cursos' },
    { grupo: 'Educação', nome: 'Material Escolar' },
    { grupo: 'Educação', nome: 'Livros' },
    { grupo: 'Educação', nome: 'Idiomas' },

    // 👕 VESTUÁRIO
    { grupo: 'Vestuário', nome: 'Roupas' },
    { grupo: 'Vestuário', nome: 'Calçados' },
    { grupo: 'Vestuário', nome: 'Acessórios' },
    { grupo: 'Vestuário', nome: 'Lavanderia' },

    // 🎭 LAZER
    { grupo: 'Lazer', nome: 'Cinema' },
    { grupo: 'Lazer', nome: 'Shows/Eventos' },
    { grupo: 'Lazer', nome: 'Viagens' },
    { grupo: 'Lazer', nome: 'Hotéis' },
    { grupo: 'Lazer', nome: 'Passagens Aéreas' },
    { grupo: 'Lazer', nome: 'Hobbies' },
    { grupo: 'Lazer', nome: 'Games/Apps' },
    { grupo: 'Lazer', nome: 'Assinaturas Digitais' },
    { grupo: 'Lazer', nome: 'Esportes' },

    // 💄 CUIDADOS PESSOAIS
    { grupo: 'Cuidados Pessoais', nome: 'Cabelo/Barbeiro' },
    { grupo: 'Cuidados Pessoais', nome: 'Estética' },
    { grupo: 'Cuidados Pessoais', nome: 'Cosméticos' },
    { grupo: 'Cuidados Pessoais', nome: 'Perfumes' },

    // 🐕 PETS
    { grupo: 'Pets', nome: 'Alimentação Pet' },
    { grupo: 'Pets', nome: 'Veterinário' },
    { grupo: 'Pets', nome: 'Pet Shop' },
    { grupo: 'Pets', nome: 'Plano de Saúde Pet' },

    // 🏦 FINANÇAS
    { grupo: 'Finanças', nome: 'Empréstimos' },
    { grupo: 'Finanças', nome: 'Financiamentos' },
    { grupo: 'Finanças', nome: 'Cartão de Crédito' },
    { grupo: 'Finanças', nome: 'Tarifas Bancárias' },
    { grupo: 'Finanças', nome: 'Seguros' },
    { grupo: 'Finanças', nome: 'Investimentos' },
    { grupo: 'Finanças', nome: 'Previdência Privada' },
    { grupo: 'Finanças', nome: 'IOF' },
    { grupo: 'Finanças', nome: 'Multas/Juros' },

    // 💻 TECNOLOGIA
    { grupo: 'Tecnologia', nome: 'Eletrônicos' },
    { grupo: 'Tecnologia', nome: 'Software/Apps' },
    { grupo: 'Tecnologia', nome: 'Cloud/Servidores' },
    { grupo: 'Tecnologia', nome: 'Manutenção Tech' },

    // 👨‍👩‍👧 FAMÍLIA
    { grupo: 'Família', nome: 'Pensão Alimentícia' },
    { grupo: 'Família', nome: 'Presentes' },
    { grupo: 'Família', nome: 'Festas' },
    { grupo: 'Família', nome: 'Babá/Creche' },
    { grupo: 'Família', nome: 'Fraldas/Bebê' },

    // 💼 TRABALHO
    { grupo: 'Trabalho', nome: 'Material de Escritório' },
    { grupo: 'Trabalho', nome: 'Equipamentos' },
    { grupo: 'Trabalho', nome: 'Vestuário Profissional' },
    { grupo: 'Trabalho', nome: 'Almoço Trabalho' },

    // 💝 DOAÇÕES
    { grupo: 'Doações', nome: 'Caridade' },
    { grupo: 'Doações', nome: 'Igreja/Religião' },
    { grupo: 'Doações', nome: 'ONGs' },

    // 📋 IMPOSTOS
    { grupo: 'Impostos', nome: 'IRPF' },
    { grupo: 'Impostos', nome: 'ISS' },
    { grupo: 'Impostos', nome: 'Outros Impostos' },

    // ❓ OUTROS
    { grupo: 'Outros', nome: 'Diversos' },
    { grupo: 'Outros', nome: 'Não Categorizado' },

    // 💰 RECEITAS
    { grupo: 'Receitas', nome: 'Salário' },
    { grupo: 'Receitas', nome: 'Freelance' },
    { grupo: 'Receitas', nome: 'Bônus' },
    { grupo: 'Receitas', nome: '13º Salário' },
    { grupo: 'Receitas', nome: 'Férias' },
    { grupo: 'Receitas', nome: 'PLR/Participação' },
    { grupo: 'Receitas', nome: 'Rendimentos Investimentos' },
    { grupo: 'Receitas', nome: 'Dividendos' },
    { grupo: 'Receitas', nome: 'Aluguel Recebido' },
    { grupo: 'Receitas', nome: 'Venda de Bens' },
    { grupo: 'Receitas', nome: 'Reembolso' },
    { grupo: 'Receitas', nome: 'Cashback' },
    { grupo: 'Receitas', nome: 'Prêmios' },
    { grupo: 'Receitas', nome: 'Pensão Recebida' },
    { grupo: 'Receitas', nome: 'Outras Receitas' },

    // 🔄 TRANSFERÊNCIAS
    { grupo: 'Transferências', nome: 'Entre Contas' },
    { grupo: 'Transferências', nome: 'Pagamento de Fatura' },
    { grupo: 'Transferências', nome: 'Aplicação em Investimentos' },
    { grupo: 'Transferências', nome: 'Resgate de Investimentos' },
  ]

  // Add user_id and ativa to each category
  const categoriasComUserId = categorias.map(cat => ({
    ...cat,
    user_id: userId,
    ativa: true
  }))

  // Insert in batches
  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < categoriasComUserId.length; i += batchSize) {
    const batch = categoriasComUserId.slice(i, i + batchSize)

    const { data, error } = await supabase
      .from('categoria')
      .insert(batch)
      .select()

    if (error) {
      console.error(`❌ Erro ao inserir batch ${i / batchSize + 1}:`, error)
      continue
    }

    inserted += data.length
    console.log(`✅ Inseridas ${data.length} categorias (total: ${inserted}/${categorias.length})`)
  }

  console.log(`\n🎉 Seed concluído! ${inserted} categorias inseridas com sucesso.`)
}

main().catch(console.error)
