#!/usr/bin/env node

/**
 * Script para inserir categorias padrão no Cortex Ledger
 * Execute: node scripts/seed-categorias.mjs
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas')
  console.error('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Categorias organizadas por grupo
const categorias = [
  // 🏠 MORADIA
  { grupo: 'Moradia', nome: 'Aluguel', ordem: 1 },
  { grupo: 'Moradia', nome: 'Condomínio', ordem: 2 },
  { grupo: 'Moradia', nome: 'IPTU', ordem: 3 },
  { grupo: 'Moradia', nome: 'Energia Elétrica', ordem: 4 },
  { grupo: 'Moradia', nome: 'Água', ordem: 5 },
  { grupo: 'Moradia', nome: 'Gás', ordem: 6 },
  { grupo: 'Moradia', nome: 'Internet', ordem: 7 },
  { grupo: 'Moradia', nome: 'Telefone/Celular', ordem: 8 },
  { grupo: 'Moradia', nome: 'TV/Streaming', ordem: 9 },
  { grupo: 'Moradia', nome: 'Manutenção', ordem: 10 },
  { grupo: 'Moradia', nome: 'Móveis e Decoração', ordem: 11 },

  // 🍔 ALIMENTAÇÃO
  { grupo: 'Alimentação', nome: 'Supermercado', ordem: 20 },
  { grupo: 'Alimentação', nome: 'Feira', ordem: 21 },
  { grupo: 'Alimentação', nome: 'Padaria', ordem: 22 },
  { grupo: 'Alimentação', nome: 'Restaurantes', ordem: 23 },
  { grupo: 'Alimentação', nome: 'Lanches/Fast Food', ordem: 24 },
  { grupo: 'Alimentação', nome: 'Delivery', ordem: 25 },
  { grupo: 'Alimentação', nome: 'Bebidas/Bar', ordem: 26 },
  { grupo: 'Alimentação', nome: 'Cafeteria', ordem: 27 },

  // 🚗 TRANSPORTE
  { grupo: 'Transporte', nome: 'Combustível', ordem: 30 },
  { grupo: 'Transporte', nome: 'Transporte Público', ordem: 31 },
  { grupo: 'Transporte', nome: 'Uber/Taxi', ordem: 32 },
  { grupo: 'Transporte', nome: 'Estacionamento', ordem: 33 },
  { grupo: 'Transporte', nome: 'Pedágio', ordem: 34 },
  { grupo: 'Transporte', nome: 'Manutenção Veículo', ordem: 35 },
  { grupo: 'Transporte', nome: 'IPVA', ordem: 36 },
  { grupo: 'Transporte', nome: 'Seguro Veículo', ordem: 37 },
  { grupo: 'Transporte', nome: 'Financiamento Veículo', ordem: 38 },
  { grupo: 'Transporte', nome: 'Multas', ordem: 39 },

  // 💊 SAÚDE
  { grupo: 'Saúde', nome: 'Plano de Saúde', ordem: 40 },
  { grupo: 'Saúde', nome: 'Médico', ordem: 41 },
  { grupo: 'Saúde', nome: 'Dentista', ordem: 42 },
  { grupo: 'Saúde', nome: 'Farmácia/Medicamentos', ordem: 43 },
  { grupo: 'Saúde', nome: 'Exames', ordem: 44 },
  { grupo: 'Saúde', nome: 'Psicólogo/Terapia', ordem: 45 },
  { grupo: 'Saúde', nome: 'Academia', ordem: 46 },
  { grupo: 'Saúde', nome: 'Suplementos', ordem: 47 },

  // 📚 EDUCAÇÃO
  { grupo: 'Educação', nome: 'Mensalidade Escolar', ordem: 50 },
  { grupo: 'Educação', nome: 'Faculdade/Pós', ordem: 51 },
  { grupo: 'Educação', nome: 'Cursos', ordem: 52 },
  { grupo: 'Educação', nome: 'Material Escolar', ordem: 53 },
  { grupo: 'Educação', nome: 'Livros', ordem: 54 },
  { grupo: 'Educação', nome: 'Idiomas', ordem: 55 },

  // 👕 VESTUÁRIO
  { grupo: 'Vestuário', nome: 'Roupas', ordem: 60 },
  { grupo: 'Vestuário', nome: 'Calçados', ordem: 61 },
  { grupo: 'Vestuário', nome: 'Acessórios', ordem: 62 },
  { grupo: 'Vestuário', nome: 'Lavanderia', ordem: 63 },

  // 🎭 LAZER
  { grupo: 'Lazer', nome: 'Cinema', ordem: 70 },
  { grupo: 'Lazer', nome: 'Shows/Eventos', ordem: 71 },
  { grupo: 'Lazer', nome: 'Viagens', ordem: 72 },
  { grupo: 'Lazer', nome: 'Hotéis', ordem: 73 },
  { grupo: 'Lazer', nome: 'Passagens Aéreas', ordem: 74 },
  { grupo: 'Lazer', nome: 'Hobbies', ordem: 75 },
  { grupo: 'Lazer', nome: 'Games/Apps', ordem: 76 },
  { grupo: 'Lazer', nome: 'Assinaturas Digitais', ordem: 77 },
  { grupo: 'Lazer', nome: 'Esportes', ordem: 78 },

  // 💄 CUIDADOS PESSOAIS
  { grupo: 'Cuidados Pessoais', nome: 'Cabelo/Barbeiro', ordem: 80 },
  { grupo: 'Cuidados Pessoais', nome: 'Estética', ordem: 81 },
  { grupo: 'Cuidados Pessoais', nome: 'Cosméticos', ordem: 82 },
  { grupo: 'Cuidados Pessoais', nome: 'Perfumes', ordem: 83 },

  // 🐕 PETS
  { grupo: 'Pets', nome: 'Alimentação Pet', ordem: 90 },
  { grupo: 'Pets', nome: 'Veterinário', ordem: 91 },
  { grupo: 'Pets', nome: 'Pet Shop', ordem: 92 },
  { grupo: 'Pets', nome: 'Plano de Saúde Pet', ordem: 93 },

  // 🏦 FINANÇAS
  { grupo: 'Finanças', nome: 'Empréstimos', ordem: 100 },
  { grupo: 'Finanças', nome: 'Financiamentos', ordem: 101 },
  { grupo: 'Finanças', nome: 'Cartão de Crédito', ordem: 102 },
  { grupo: 'Finanças', nome: 'Tarifas Bancárias', ordem: 103 },
  { grupo: 'Finanças', nome: 'Seguros', ordem: 104 },
  { grupo: 'Finanças', nome: 'Investimentos', ordem: 105 },
  { grupo: 'Finanças', nome: 'Previdência Privada', ordem: 106 },
  { grupo: 'Finanças', nome: 'IOF', ordem: 107 },
  { grupo: 'Finanças', nome: 'Multas/Juros', ordem: 108 },

  // 💻 TECNOLOGIA
  { grupo: 'Tecnologia', nome: 'Eletrônicos', ordem: 110 },
  { grupo: 'Tecnologia', nome: 'Software/Apps', ordem: 111 },
  { grupo: 'Tecnologia', nome: 'Cloud/Servidores', ordem: 112 },
  { grupo: 'Tecnologia', nome: 'Manutenção Tech', ordem: 113 },

  // 👨‍👩‍👧 FAMÍLIA
  { grupo: 'Família', nome: 'Pensão Alimentícia', ordem: 120 },
  { grupo: 'Família', nome: 'Presentes', ordem: 121 },
  { grupo: 'Família', nome: 'Festas', ordem: 122 },
  { grupo: 'Família', nome: 'Babá/Creche', ordem: 123 },
  { grupo: 'Família', nome: 'Fraldas/Bebê', ordem: 124 },

  // 💼 TRABALHO
  { grupo: 'Trabalho', nome: 'Material de Escritório', ordem: 130 },
  { grupo: 'Trabalho', nome: 'Equipamentos', ordem: 131 },
  { grupo: 'Trabalho', nome: 'Vestuário Profissional', ordem: 132 },
  { grupo: 'Trabalho', nome: 'Almoço Trabalho', ordem: 133 },

  // 💝 DOAÇÕES
  { grupo: 'Doações', nome: 'Caridade', ordem: 140 },
  { grupo: 'Doações', nome: 'Igreja/Religião', ordem: 141 },
  { grupo: 'Doações', nome: 'ONGs', ordem: 142 },

  // 📋 IMPOSTOS
  { grupo: 'Impostos', nome: 'IRPF', ordem: 150 },
  { grupo: 'Impostos', nome: 'ISS', ordem: 151 },
  { grupo: 'Impostos', nome: 'Outros Impostos', ordem: 152 },

  // ❓ OUTROS
  { grupo: 'Outros', nome: 'Diversos', ordem: 200 },
  { grupo: 'Outros', nome: 'Não Categorizado', ordem: 201 },

  // 💰 RECEITAS
  { grupo: 'Receitas', nome: 'Salário', ordem: 300 },
  { grupo: 'Receitas', nome: 'Freelance', ordem: 301 },
  { grupo: 'Receitas', nome: 'Bônus', ordem: 302 },
  { grupo: 'Receitas', nome: '13º Salário', ordem: 303 },
  { grupo: 'Receitas', nome: 'Férias', ordem: 304 },
  { grupo: 'Receitas', nome: 'PLR/Participação', ordem: 305 },
  { grupo: 'Receitas', nome: 'Rendimentos Investimentos', ordem: 306 },
  { grupo: 'Receitas', nome: 'Dividendos', ordem: 307 },
  { grupo: 'Receitas', nome: 'Aluguel Recebido', ordem: 308 },
  { grupo: 'Receitas', nome: 'Venda de Bens', ordem: 309 },
  { grupo: 'Receitas', nome: 'Reembolso', ordem: 310 },
  { grupo: 'Receitas', nome: 'Cashback', ordem: 311 },
  { grupo: 'Receitas', nome: 'Prêmios', ordem: 312 },
  { grupo: 'Receitas', nome: 'Pensão Recebida', ordem: 313 },
  { grupo: 'Receitas', nome: 'Outras Receitas', ordem: 314 },

  // 🔄 TRANSFERÊNCIAS
  { grupo: 'Transferências', nome: 'Entre Contas', ordem: 400 },
  { grupo: 'Transferências', nome: 'Pagamento de Fatura', ordem: 401 },
  { grupo: 'Transferências', nome: 'Aplicação em Investimentos', ordem: 402 },
  { grupo: 'Transferências', nome: 'Resgate de Investimentos', ordem: 403 },
]

async function main() {
  console.log('🚀 Iniciando seed de categorias...\n')

  // Verificar se o usuário está autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ Erro: Usuário não autenticado')
    console.error('Por favor, faça login na aplicação web primeiro')
    process.exit(1)
  }

  console.log(`✅ Usuário autenticado: ${user.email}`)
  console.log(`📝 User ID: ${user.id}\n`)

  // Verificar categorias existentes
  const { data: existentes, error: checkError } = await supabase
    .from('categoria')
    .select('nome, grupo')
    .eq('user_id', user.id)

  if (checkError) {
    console.error('❌ Erro ao verificar categorias existentes:', checkError)
    process.exit(1)
  }

  const existentesSet = new Set(existentes?.map(c => `${c.grupo}:${c.nome}`) || [])
  console.log(`📊 Categorias existentes: ${existentes?.length || 0}`)

  // Filtrar apenas categorias que não existem
  const novasCategorias = categorias.filter(cat =>
    !existentesSet.has(`${cat.grupo}:${cat.nome}`)
  )

  if (novasCategorias.length === 0) {
    console.log('✅ Todas as categorias já estão inseridas!')
    return
  }

  console.log(`📥 Inserindo ${novasCategorias.length} novas categorias...\n`)

  // Inserir categorias em lotes
  const BATCH_SIZE = 50
  let totalInseridas = 0
  let erros = 0

  for (let i = 0; i < novasCategorias.length; i += BATCH_SIZE) {
    const batch = novasCategorias.slice(i, i + BATCH_SIZE)

    const { data, error } = await supabase
      .from('categoria')
      .insert(batch.map(cat => ({
        user_id: user.id,
        grupo: cat.grupo,
        nome: cat.nome,
        ativa: true,
        ordem: cat.ordem
      })))
      .select()

    if (error) {
      console.error(`❌ Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error)
      erros += batch.length
    } else {
      totalInseridas += data.length
      console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${data.length} categorias inseridas`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Seed concluído!`)
  console.log(`📊 Total de categorias inseridas: ${totalInseridas}`)
  if (erros > 0) {
    console.log(`⚠️  Erros: ${erros}`)
  }
  console.log('='.repeat(50))

  // Listar resumo por grupo
  const { data: resumo } = await supabase
    .from('categoria')
    .select('grupo')
    .eq('user_id', user.id)

  if (resumo) {
    const grupos = resumo.reduce((acc, cat) => {
      acc[cat.grupo] = (acc[cat.grupo] || 0) + 1
      return acc
    }, {})

    console.log('\n📋 Resumo por grupo:')
    Object.entries(grupos)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([grupo, count]) => {
        console.log(`   ${grupo}: ${count} categorias`)
      })
  }
}

main().catch(console.error)
