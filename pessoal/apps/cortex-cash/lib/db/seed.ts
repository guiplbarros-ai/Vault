'use client'

/**
 * Seed de dados iniciais para o banco de dados
 * Agent CORE: Owner
 */

import type { Categoria, Tag } from '../types'

/**
 * Tags padrão do sistema
 * Tags predefinidas para classificação de transações
 */
export const TAGS_PADRAO: Omit<Tag, 'id' | 'created_at'>[] = [
  {
    nome: 'Essencial',
    cor: '#10b981', // green-500
    tipo: 'sistema',
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Importante',
    cor: '#3b82f6', // blue-500
    tipo: 'sistema',
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Supérfluo',
    cor: '#ef4444', // red-500
    tipo: 'sistema',
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Extraordinário',
    cor: '#f59e0b', // amber-500
    tipo: 'sistema',
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Recorrente',
    cor: '#8b5cf6', // purple-500
    tipo: 'sistema',
    is_sistema: true,
    usuario_id: undefined,
  },
]

/**
 * Categorias padrão do sistema
 * 39 categorias (13 principais + subcategorias) conforme especificação
 */
export const CATEGORIAS_PADRAO: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>[] = [
  // ==================== DESPESAS ====================
  {
    nome: 'Alimentação',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🍽️',
    cor: '#ef4444',
    ordem: 1,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Restaurantes',
    tipo: 'despesa',
    grupo: 'Alimentação',
    icone: '🍴',
    cor: '#f87171',
    ordem: 2,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Supermercado',
    tipo: 'despesa',
    grupo: 'Alimentação',
    icone: '🛒',
    cor: '#fca5a5',
    ordem: 3,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Transporte',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🚗',
    cor: '#f59e0b',
    ordem: 4,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Combustível',
    tipo: 'despesa',
    grupo: 'Transporte',
    icone: '⛽',
    cor: '#fbbf24',
    ordem: 5,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Transporte Público',
    tipo: 'despesa',
    grupo: 'Transporte',
    icone: '🚌',
    cor: '#fcd34d',
    ordem: 6,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Moradia',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🏠',
    cor: '#8b5cf6',
    ordem: 7,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Aluguel',
    tipo: 'despesa',
    grupo: 'Moradia',
    icone: '🏡',
    cor: '#a78bfa',
    ordem: 8,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Contas',
    tipo: 'despesa',
    grupo: 'Moradia',
    icone: '📄',
    cor: '#c4b5fd',
    ordem: 9,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Saúde',
    tipo: 'despesa',
    grupo: undefined,
    icone: '❤️',
    cor: '#ec4899',
    ordem: 10,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Farmácia',
    tipo: 'despesa',
    grupo: 'Saúde',
    icone: '💊',
    cor: '#f472b6',
    ordem: 11,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Plano de Saúde',
    tipo: 'despesa',
    grupo: 'Saúde',
    icone: '🏥',
    cor: '#f9a8d4',
    ordem: 12,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Educação',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🎓',
    cor: '#3b82f6',
    ordem: 13,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Cursos',
    tipo: 'despesa',
    grupo: 'Educação',
    icone: '📚',
    cor: '#60a5fa',
    ordem: 14,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Livros',
    tipo: 'despesa',
    grupo: 'Educação',
    icone: '📖',
    cor: '#93c5fd',
    ordem: 15,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Lazer',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🎮',
    cor: '#14b8a6',
    ordem: 16,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Entretenimento',
    tipo: 'despesa',
    grupo: 'Lazer',
    icone: '📺',
    cor: '#2dd4bf',
    ordem: 17,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Viagens',
    tipo: 'despesa',
    grupo: 'Lazer',
    icone: '✈️',
    cor: '#5eead4',
    ordem: 18,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Vestuário',
    tipo: 'despesa',
    grupo: undefined,
    icone: '👕',
    cor: '#a855f7',
    ordem: 19,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Roupas',
    tipo: 'despesa',
    grupo: 'Vestuário',
    icone: '👔',
    cor: '#c084fc',
    ordem: 20,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Calçados',
    tipo: 'despesa',
    grupo: 'Vestuário',
    icone: '👟',
    cor: '#d8b4fe',
    ordem: 21,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Assinaturas',
    tipo: 'despesa',
    grupo: undefined,
    icone: '💳',
    cor: '#06b6d4',
    ordem: 22,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Streaming',
    tipo: 'despesa',
    grupo: 'Assinaturas',
    icone: '▶️',
    cor: '#22d3ee',
    ordem: 23,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Software',
    tipo: 'despesa',
    grupo: 'Assinaturas',
    icone: '💻',
    cor: '#67e8f9',
    ordem: 24,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Impostos',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🧾',
    cor: '#64748b',
    ordem: 25,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Investimentos',
    tipo: 'despesa',
    grupo: undefined,
    icone: '📈',
    cor: '#10b981',
    ordem: 26,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Empréstimos',
    tipo: 'despesa',
    grupo: undefined,
    icone: '💰',
    cor: '#dc2626',
    ordem: 27,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Pet',
    tipo: 'despesa',
    grupo: undefined,
    icone: '🐶',
    cor: '#f97316',
    ordem: 28,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Outros',
    tipo: 'despesa',
    grupo: undefined,
    icone: '📦',
    cor: '#6b7280',
    ordem: 29,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  // ==================== RECEITAS ====================
  {
    nome: 'Salário',
    tipo: 'receita',
    grupo: undefined,
    icone: '💵',
    cor: '#10b981',
    ordem: 30,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Freelance',
    tipo: 'receita',
    grupo: undefined,
    icone: '💼',
    cor: '#059669',
    ordem: 31,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Investimentos',
    tipo: 'receita',
    grupo: undefined,
    icone: '📊',
    cor: '#34d399',
    ordem: 32,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Dividendos',
    tipo: 'receita',
    grupo: 'Investimentos',
    icone: '💲',
    cor: '#6ee7b7',
    ordem: 33,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
  {
    nome: 'Juros',
    tipo: 'receita',
    grupo: 'Investimentos',
    icone: '📉',
    cor: '#a7f3d0',
    ordem: 34,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Reembolso',
    tipo: 'receita',
    grupo: undefined,
    icone: '🔄',
    cor: '#22c55e',
    ordem: 35,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Prêmio',
    tipo: 'receita',
    grupo: undefined,
    icone: '🏆',
    cor: '#4ade80',
    ordem: 36,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Vendas',
    tipo: 'receita',
    grupo: undefined,
    icone: '🛍️',
    cor: '#86efac',
    ordem: 37,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  {
    nome: 'Outros',
    tipo: 'receita',
    grupo: undefined,
    icone: '💚',
    cor: '#bbf7d0',
    ordem: 38,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },

  // ==================== TRANSFERÊNCIAS ====================
  {
    nome: 'Transferência',
    tipo: 'transferencia',
    grupo: undefined,
    icone: '↔️',
    cor: '#6366f1',
    ordem: 39,
    ativa: true,
    is_sistema: true,
    usuario_id: undefined,
  },
]

/**
 * Função para inserir categorias padrão no banco (Supabase)
 * Aceita um cliente Supabase como parâmetro (db: any para compatibilidade de assinatura)
 */
export async function seedCategorias(db: any): Promise<void> {
  try {
    const now = new Date().toISOString()

    // Mapear categorias principais primeiro (sem grupo)
    const principais = CATEGORIAS_PADRAO.filter((c) => !c.grupo)
    const mapa: Record<string, string> = {} // nome → id

    // Inserir categorias principais
    const categoriasParaInserir = principais.map((categoria) => {
      const id = crypto.randomUUID()
      mapa[categoria.nome] = id
      return {
        id,
        nome: categoria.nome,
        tipo: categoria.tipo,
        grupo: categoria.grupo,
        pai_id: null,
        icone: categoria.icone,
        cor: categoria.cor,
        ordem: categoria.ordem,
        ativa: categoria.ativa,
        is_sistema: true,
        usuario_id: null,
        created_at: now,
        updated_at: now,
      }
    })

    const { error: err1 } = await db.from('categorias').upsert(categoriasParaInserir, { onConflict: 'id' })
    if (err1 && err1.code !== '23505') {
      console.warn('Aviso ao inserir categorias principais:', err1.message)
    }

    // Agora inserir subcategorias com pai_id correto
    const subcategorias = CATEGORIAS_PADRAO.filter((c) => c.grupo)
    const subcategoriasParaInserir = subcategorias.map((categoria) => {
      const paiId = mapa[categoria.grupo!] || null
      return {
        id: crypto.randomUUID(),
        nome: categoria.nome,
        tipo: categoria.tipo,
        grupo: categoria.grupo,
        pai_id: paiId,
        icone: categoria.icone,
        cor: categoria.cor,
        ordem: categoria.ordem,
        ativa: categoria.ativa,
        is_sistema: true,
        usuario_id: null,
        created_at: now,
        updated_at: now,
      }
    })

    const { error: err2 } = await db.from('categorias').upsert(subcategoriasParaInserir, { onConflict: 'id' })
    if (err2 && err2.code !== '23505') {
      console.warn('Aviso ao inserir subcategorias:', err2.message)
    }

    console.log(`${CATEGORIAS_PADRAO.length} categorias padrao inseridas com sucesso!`)
    console.log(`   - ${principais.length} categorias principais`)
    console.log(`   - ${subcategorias.length} subcategorias`)
  } catch (error) {
    console.error('Erro ao inserir categorias padrao:', error)
    throw error
  }
}

/**
 * Seed de instituições básicas do Brasil
 * Apenas bancos principais - sem criar contas
 */
export async function seedInstituicoesPadrao(db: any): Promise<void> {
  try {
    const now = new Date().toISOString()

    // Verifica se já existem instituições
    const { count: existingCount } = await db.from('instituicoes').select('*', { count: 'exact', head: true })
    if ((existingCount ?? 0) > 0) {
      console.log('Instituicoes ja existem no banco')
      return
    }

    const instituicoes = [
      {
        id: crypto.randomUUID(),
        nome: 'Nubank',
        codigo: '260',
        logo_url: null,
        cor: '#8A05BE',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Inter',
        codigo: '077',
        logo_url: null,
        cor: '#FF7A00',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'C6 Bank',
        codigo: '336',
        logo_url: null,
        cor: '#000000',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'PagBank (PagSeguro)',
        codigo: '290',
        logo_url: null,
        cor: '#00A868',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Itau',
        codigo: '341',
        logo_url: null,
        cor: '#EC7000',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Bradesco',
        codigo: '237',
        logo_url: null,
        cor: '#CC092F',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Banco do Brasil',
        codigo: '001',
        logo_url: null,
        cor: '#FFF200',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Caixa Economica Federal',
        codigo: '104',
        logo_url: null,
        cor: '#0066A1',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Santander',
        codigo: '033',
        logo_url: null,
        cor: '#EC0000',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Picpay',
        codigo: '380',
        logo_url: null,
        cor: '#21C25E',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Mercado Pago',
        codigo: '323',
        logo_url: null,
        cor: '#009EE3',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'XP Investimentos',
        codigo: '102',
        logo_url: null,
        cor: '#000000',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'BTG Pactual',
        codigo: '208',
        logo_url: null,
        cor: '#003C7E',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Carteira (Dinheiro)',
        codigo: 'carteira',
        logo_url: null,
        cor: '#6B7280',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Outro',
        codigo: 'outro',
        logo_url: null,
        cor: '#9CA3AF',
        created_at: now,
        updated_at: now,
      },
    ]

    const { error } = await db.from('instituicoes').upsert(instituicoes, { onConflict: 'id' })
    if (error && error.code !== '23505') {
      console.warn('Aviso ao inserir instituicoes padrao:', error.message)
    } else {
      console.log(`${instituicoes.length} instituicoes padrao inseridas`)
    }
  } catch (error) {
    console.error('Erro ao inserir instituicoes padrao:', error)
    throw error
  }
}

/**
 * Verifica se o banco já possui categorias (Supabase)
 */
export async function hasCategories(db: any): Promise<boolean> {
  try {
    const { count } = await db.from('categorias').select('*', { count: 'exact', head: true })
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

/**
 * Inicializa o banco com dados padrão se necessário (Supabase)
 */
export async function initializeSeedData(db: any): Promise<void> {
  const hasData = await hasCategories(db)

  if (!hasData) {
    console.log('Banco vazio detectado. Inserindo dados padrao...')
    await seedInstituicoesPadrao(db)
    await seedCategorias(db)
  } else {
    console.log('Banco ja possui categorias.')

    // Verifica se possui instituições, mesmo que já tenha categorias
    const { count: instituicoesCount } = await db.from('instituicoes').select('*', { count: 'exact', head: true })
    if ((instituicoesCount ?? 0) === 0) {
      console.log('Adicionando instituicoes padrao...')
      await seedInstituicoesPadrao(db)
    }
  }
}

/**
 * Seed completo com mock data para testes
 * Insere instituições, contas e transações variadas
 */
export async function seedMockData(db: any): Promise<void> {
  try {
    const now = new Date().toISOString()

    // 1. Instituições
    const instituicoes = [
      {
        id: crypto.randomUUID(),
        nome: 'Nubank',
        codigo: 'nubank',
        logo_url: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Bradesco',
        codigo: 'bradesco',
        logo_url: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        nome: 'Inter',
        codigo: 'inter',
        logo_url: null,
        created_at: now,
        updated_at: now,
      },
    ]

    const { error: errInst } = await db.from('instituicoes').upsert(instituicoes, { onConflict: 'id' })
    if (errInst && errInst.code !== '23505') {
      console.warn('Aviso ao inserir instituicoes:', errInst.message)
    } else {
      console.log(`${instituicoes.length} instituicoes inseridas`)
    }

    // 2. Contas
    const contas = [
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[0]!.id, // Nubank
        nome: 'Nubank - Conta Corrente',
        tipo: 'corrente',
        saldo_referencia: 5000.0,
        data_referencia: now,
        saldo_atual: 5000.0,
        ativa: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[1]!.id, // Bradesco
        nome: 'Bradesco - Poupanca',
        tipo: 'poupanca',
        saldo_referencia: 15000.0,
        data_referencia: now,
        saldo_atual: 15000.0,
        ativa: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[2]!.id, // Inter
        nome: 'Inter - Investimentos',
        tipo: 'investimento',
        saldo_referencia: 50000.0,
        data_referencia: now,
        saldo_atual: 50000.0,
        ativa: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[0]!.id, // Nubank
        nome: 'Nubank - Carteira Digital',
        tipo: 'outros',
        saldo_referencia: 1200.0,
        data_referencia: now,
        saldo_atual: 1200.0,
        ativa: true,
        created_at: now,
        updated_at: now,
      },
    ]

    const { error: errContas } = await db.from('contas').upsert(contas, { onConflict: 'id' })
    if (errContas && errContas.code !== '23505') {
      console.warn('Aviso ao inserir contas:', errContas.message)
    } else {
      console.log(`${contas.length} contas inseridas`)
    }

    // 3. Buscar categorias já inseridas
    const { data: categoriasData } = await db.from('categorias').select('*')
    const categorias = categoriasData || []
    console.log('='.repeat(60))
    console.log('INICIANDO SEED DE TRANSACOES')
    console.log(`Total de categorias disponíveis: ${categorias.length}`)
    console.log(
      'Primeiras 5 categorias:',
      categorias.slice(0, 5).map((c: any) => `${c.nome} (${c.tipo})`)
    )
    console.log('='.repeat(60))

    const getCategoriaByNome = (nome: string, tipo?: 'receita' | 'despesa' | 'transferencia') => {
      let categoria
      if (tipo) {
        categoria = categorias.find((c: any) => c.nome === nome && c.tipo === tipo)
      } else {
        categoria = categorias.find((c: any) => c.nome === nome)
      }

      if (!categoria) {
        console.error(
          `❌ CATEGORIA NÃO ENCONTRADA: "${nome}" ${tipo ? `tipo: ${tipo}` : 'sem tipo'}`
        )
      }
      return categoria?.id || null
    }

    // 4. Transações (últimos 12 meses com variedade)
    const transacoes = []
    const baseDate = new Date()

    // Salário mensal (últimos 12 meses)
    for (let i = 0; i < 12; i++) {
      const salarioDate = new Date(baseDate)
      salarioDate.setMonth(baseDate.getMonth() - i)
      salarioDate.setDate(5) // Dia 5 de cada mês

      // Varia o salário ligeiramente (+/- 5%)
      const salarioBase = 8500.0
      const variacao = (Math.random() - 0.5) * 0.1 // -5% a +5%
      const salario = salarioBase * (1 + variacao)

      transacoes.push({
        id: crypto.randomUUID(),
        conta_id: contas[0]!.id,
        categoria_id: getCategoriaByNome('Salário', 'receita'),
        data: salarioDate.toISOString(),
        tipo: 'receita',
        descricao: 'Salario - Empresa XYZ',
        valor: Math.round(salario * 100) / 100,
        observacoes: 'Pagamento mensal',
        hash: null,
        created_at: now,
        updated_at: now,
      })
    }

    // Despesas recorrentes mensais (últimos 12 meses)
    for (let mes = 0; mes < 12; mes++) {
      const mesDate = new Date(baseDate)
      mesDate.setMonth(baseDate.getMonth() - mes)

      // Despesas fixas mensais
      const despesasFixas = [
        { categoria: 'Aluguel', descricao: 'Aluguel Apartamento', valor: -2500.0, dia: 1 },
        {
          categoria: 'Contas',
          descricao: 'Conta de Luz',
          valor: -150 - Math.random() * 80,
          dia: 8,
        },
        {
          categoria: 'Contas',
          descricao: 'Conta de Água',
          valor: -80 - Math.random() * 40,
          dia: 10,
        },
        { categoria: 'Contas', descricao: 'Internet', valor: -129.9, dia: 5 },
        { categoria: 'Plano de Saúde', descricao: 'Unimed', valor: -450.0, dia: 1 },
        { categoria: 'Streaming', descricao: 'Netflix', valor: -49.9, dia: 15 },
        { categoria: 'Streaming', descricao: 'Spotify', valor: -21.9, dia: 15 },
        { categoria: 'Software', descricao: 'GitHub Pro', valor: -29.0, dia: 20 },
      ]

      despesasFixas.forEach((despesa) => {
        const dataTransacao = new Date(mesDate)
        dataTransacao.setDate(despesa.dia)

        transacoes.push({
          id: crypto.randomUUID(),
          conta_id: contas[0]!.id,
          categoria_id: getCategoriaByNome(despesa.categoria, 'despesa'),
          data: dataTransacao.toISOString(),
          tipo: 'despesa',
          descricao: despesa.descricao,
          valor: Math.round(despesa.valor * 100) / 100,
          observacoes: null,
          hash: null,
          created_at: now,
          updated_at: now,
        })
      })

      // Despesas variáveis (2-4 por mês)
      const numDespesasVariaveis = 2 + Math.floor(Math.random() * 3)
      const despesasVariaveis = [
        {
          categoria: 'Restaurantes',
          descricoes: ['Restaurante Italiano', 'iFood - Jantar', 'Restaurante Japonês', 'Padaria'],
          valorBase: 100,
        },
        {
          categoria: 'Supermercado',
          descricoes: ['Supermercado Extra', 'Hortifruti', 'Mercado Local'],
          valorBase: 300,
        },
        {
          categoria: 'Combustível',
          descricoes: ['Posto Shell', 'Posto Ipiranga', 'Posto BR'],
          valorBase: 250,
        },
        {
          categoria: 'Farmácia',
          descricoes: ['Drogaria São Paulo', 'Farmácia Popular'],
          valorBase: 50,
        },
        { categoria: 'Entretenimento', descricoes: ['Cinema', 'Teatro', 'Show'], valorBase: 80 },
        { categoria: 'Roupas', descricoes: ['Zara', 'C&A', 'Renner'], valorBase: 200 },
      ]

      for (let i = 0; i < numDespesasVariaveis; i++) {
        const despesaTemplate =
          despesasVariaveis[Math.floor(Math.random() * despesasVariaveis.length)]!
        const descricao =
          despesaTemplate.descricoes[Math.floor(Math.random() * despesaTemplate.descricoes.length)]
        const valor = -(despesaTemplate.valorBase * (0.5 + Math.random()))
        const dia = 1 + Math.floor(Math.random() * 28)

        const dataTransacao = new Date(mesDate)
        dataTransacao.setDate(dia)

        transacoes.push({
          id: crypto.randomUUID(),
          conta_id: contas[0]!.id,
          categoria_id: getCategoriaByNome(despesaTemplate.categoria, 'despesa'),
          data: dataTransacao.toISOString(),
          tipo: 'despesa',
          descricao: descricao,
          valor: Math.round(valor * 100) / 100,
          observacoes: null,
          hash: null,
          created_at: now,
          updated_at: now,
        })
      }
    }

    // Receitas extras (distribuídas ao longo de 12 meses)
    const mesesComReceitasExtras = [0, 2, 3, 5, 7, 9, 10] // Alguns meses aleatórios
    mesesComReceitasExtras.forEach((mes) => {
      const mesDate = new Date(baseDate)
      mesDate.setMonth(baseDate.getMonth() - mes)

      const tipoReceita = Math.random()
      let categoria, descricao, valor

      if (tipoReceita < 0.4) {
        categoria = 'Freelance'
        descricao = 'Freelance - Projeto Web'
        valor = 2000 + Math.random() * 3000
      } else if (tipoReceita < 0.7) {
        categoria = 'Dividendos'
        descricao = 'Dividendos - ITSA4'
        valor = 80 + Math.random() * 150
      } else {
        categoria = 'Reembolso'
        descricao = 'Reembolso - Despesa Médica'
        valor = 150 + Math.random() * 400
      }

      mesDate.setDate(10 + Math.floor(Math.random() * 15))

      transacoes.push({
        id: crypto.randomUUID(),
        conta_id: contas[1]!.id, // Bradesco Poupança
        categoria_id: getCategoriaByNome(categoria, 'receita'),
        data: mesDate.toISOString(),
        tipo: 'receita',
        descricao: descricao,
        valor: Math.round(valor * 100) / 100,
        observacoes: null,
        hash: null,
        created_at: now,
        updated_at: now,
      })
    })

    // Investimentos mensais (últimos 12 meses)
    for (let i = 0; i < 12; i++) {
      const investDate = new Date(baseDate)
      investDate.setMonth(baseDate.getMonth() - i)
      investDate.setDate(10)

      // Varia o aporte (800 a 1200)
      const aporteBase = 1000.0
      const variacao = (Math.random() - 0.5) * 0.4 // -20% a +20%
      const aporte = aporteBase * (1 + variacao)

      transacoes.push({
        id: crypto.randomUUID(),
        conta_id: contas[2]!.id, // Inter Investimentos
        categoria_id: getCategoriaByNome('Investimentos', 'despesa'),
        data: investDate.toISOString(),
        tipo: 'despesa',
        descricao: 'Tesouro Selic - Aporte',
        valor: -Math.round(aporte * 100) / 100,
        observacoes: 'Aporte mensal',
        hash: null,
        created_at: now,
        updated_at: now,
      })
    }

    // Verificar quantas transações têm categoria válida
    const transacoesComCategoria = transacoes.filter((t) => t.categoria_id !== null)
    const transacoesSemCategoria = transacoes.filter((t) => t.categoria_id === null)

    console.log('='.repeat(60))
    console.log('📊 ESTATÍSTICAS FINAIS DAS TRANSAÇÕES')
    console.log(`   Total criado: ${transacoes.length}`)
    console.log(`   ✅ Com categoria: ${transacoesComCategoria.length}`)
    console.log(`   ❌ Sem categoria: ${transacoesSemCategoria.length}`)

    if (transacoesSemCategoria.length > 0) {
      console.error('❌ PRIMEIRAS 10 TRANSAÇÕES SEM CATEGORIA:')
      transacoesSemCategoria.slice(0, 10).forEach((t) => {
        console.error(`   - ${t.descricao} (${t.tipo})`)
      })
    }
    console.log('='.repeat(60))

    const { error: errTx } = await db.from('transacoes').upsert(transacoes, { onConflict: 'id' })
    if (errTx && errTx.code !== '23505') {
      console.warn('Aviso ao inserir transacoes:', errTx.message)
    } else {
      console.log(`${transacoes.length} transacoes inseridas`)
    }

    console.log('Mock data completo inserido com sucesso!')
  } catch (error) {
    console.error('Erro ao inserir mock data:', error)
    throw error
  }
}

/**
 * Seed de investimentos de exemplo
 */
export async function seedInvestimentos(db: any): Promise<void> {
  try {
    const now = new Date().toISOString()

    // Buscar instituições existentes
    const { data: instituicoesData } = await db.from('instituicoes').select('*')
    const instituicoes = instituicoesData || []
    if (instituicoes.length === 0) {
      console.log('Nenhuma instituicao encontrada. Execute seedMockData primeiro.')
      return
    }

    // Buscar contas existentes
    const { data: contasData } = await db.from('contas').select('*')
    const contas = contasData || []
    const contaInvestimento = contas.find((c: any) => c.tipo === 'investimento')

    const d = (offsetMonths: number) =>
      new Date(new Date().setMonth(new Date().getMonth() + offsetMonths)).toISOString()
    const dYear = (offsetYears: number) =>
      new Date(new Date().setFullYear(new Date().getFullYear() + offsetYears)).toISOString()

    const investimentos = [
      // Renda Fixa
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[1]!.id, // Bradesco
        nome: 'CDB Bradesco 125% CDI',
        tipo: 'renda_fixa',
        ticker: null,
        valor_aplicado: 10000.0,
        valor_atual: 10650.0,
        quantidade: null,
        data_aplicacao: d(-6),
        data_vencimento: d(18),
        taxa_juros: 13.75,
        rentabilidade_contratada: 125,
        indexador: 'CDI',
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'CDB com liquidez diaria',
        cor: '#10b981',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[2]!.id, // Inter
        nome: 'Tesouro Selic 2027',
        tipo: 'renda_fixa',
        ticker: 'SELIC2027',
        valor_aplicado: 15000.0,
        valor_atual: 15975.0,
        quantidade: null,
        data_aplicacao: d(-8),
        data_vencimento: new Date('2027-03-01').toISOString(),
        taxa_juros: 13.65,
        rentabilidade_contratada: 100,
        indexador: 'SELIC',
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'Tesouro Direto - Rentabilidade pos-fixada',
        cor: '#059669',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[1]!.id, // Bradesco
        nome: 'LCI Bradesco 95% CDI',
        tipo: 'renda_fixa',
        ticker: null,
        valor_aplicado: 20000.0,
        valor_atual: 21200.0,
        quantidade: null,
        data_aplicacao: d(-10),
        data_vencimento: d(14),
        taxa_juros: 12.35,
        rentabilidade_contratada: 95,
        indexador: 'CDI',
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'LCI isenta de IR',
        cor: '#34d399',
        created_at: now,
        updated_at: now,
      },

      // Renda Variável
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[2]!.id, // Inter
        nome: 'Petrobras PN',
        tipo: 'renda_variavel',
        ticker: 'PETR4',
        valor_aplicado: 8000.0,
        valor_atual: 9200.0,
        quantidade: 200,
        data_aplicacao: d(-4),
        data_vencimento: null,
        taxa_juros: null,
        rentabilidade_contratada: null,
        indexador: null,
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'Acoes Petrobras - 200 acoes @ R$ 40,00',
        cor: '#3b82f6',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[2]!.id, // Inter
        nome: 'Itausa PN',
        tipo: 'renda_variavel',
        ticker: 'ITSA4',
        valor_aplicado: 5000.0,
        valor_atual: 5350.0,
        quantidade: 500,
        data_aplicacao: d(-12),
        data_vencimento: null,
        taxa_juros: null,
        rentabilidade_contratada: null,
        indexador: null,
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'Acoes Itausa - Recebendo dividendos',
        cor: '#60a5fa',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[2]!.id, // Inter
        nome: 'FII HGLG11',
        tipo: 'renda_variavel',
        ticker: 'HGLG11',
        valor_aplicado: 12000.0,
        valor_atual: 12840.0,
        quantidade: 100,
        data_aplicacao: d(-7),
        data_vencimento: null,
        taxa_juros: null,
        rentabilidade_contratada: null,
        indexador: null,
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'Fundo Imobiliario - Dividend Yield ~0.8%/mes',
        cor: '#93c5fd',
        created_at: now,
        updated_at: now,
      },

      // Fundos de Investimento
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[1]!.id, // Bradesco
        nome: 'Bradesco FIC RF Referenciado DI',
        tipo: 'fundo_investimento',
        ticker: null,
        valor_aplicado: 25000.0,
        valor_atual: 26125.0,
        quantidade: 2545.32,
        data_aplicacao: dYear(-1),
        data_vencimento: null,
        taxa_juros: null,
        rentabilidade_contratada: null,
        indexador: 'CDI',
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'Fundo DI - Baixo risco',
        cor: '#14b8a6',
        created_at: now,
        updated_at: now,
      },

      // Previdencia
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[1]!.id, // Bradesco
        nome: 'PGBL Bradesco Previdencia',
        tipo: 'previdencia',
        ticker: null,
        valor_aplicado: 18000.0,
        valor_atual: 18900.0,
        quantidade: null,
        data_aplicacao: dYear(-2),
        data_vencimento: null,
        taxa_juros: null,
        rentabilidade_contratada: null,
        indexador: null,
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: 'Previdencia privada - Aporte mensal R$ 750',
        cor: '#8b5cf6',
        created_at: now,
        updated_at: now,
      },

      // Criptomoedas
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[0]!.id, // Nubank
        nome: 'Bitcoin',
        tipo: 'criptomoeda',
        ticker: 'BTC',
        valor_aplicado: 3000.0,
        valor_atual: 3450.0,
        quantidade: 0.015,
        data_aplicacao: d(-3),
        data_vencimento: null,
        taxa_juros: null,
        rentabilidade_contratada: null,
        indexador: null,
        status: 'ativo',
        conta_origem_id: contaInvestimento?.id || null,
        observacoes: '0.015 BTC via Nubank',
        cor: '#f59e0b',
        created_at: now,
        updated_at: now,
      },
    ]

    const { error: errInv } = await db.from('investimentos').upsert(investimentos, { onConflict: 'id' })
    if (errInv && errInv.code !== '23505') {
      console.warn('Aviso ao inserir investimentos:', errInv.message)
    } else {
      console.log(`${investimentos.length} investimentos inseridos`)
    }

    // Criar histórico para cada investimento
    const historicos = []
    const nowMs = Date.now()

    for (const inv of investimentos) {
      // Histórico inicial (aporte)
      historicos.push({
        id: crypto.randomUUID(),
        investimento_id: inv.id,
        data: inv.data_aplicacao,
        valor: inv.valor_aplicado,
        quantidade: inv.quantidade,
        tipo_movimentacao: 'aporte',
        observacoes: 'Aplicacao inicial',
        created_at: now,
      })

      // Adicionar alguns rendimentos mensais
      if (inv.tipo === 'renda_fixa' || inv.tipo === 'fundo_investimento') {
        const mesesDecorridos = Math.floor(
          (nowMs - new Date(inv.data_aplicacao).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )

        for (let i = 1; i <= Math.min(mesesDecorridos, 3); i++) {
          const rendimentoDate = new Date(inv.data_aplicacao)
          rendimentoDate.setMonth(rendimentoDate.getMonth() + i)

          const valorRendimento = (inv.valor_aplicado * (inv.taxa_juros || 1)) / 100 / 12

          historicos.push({
            id: crypto.randomUUID(),
            investimento_id: inv.id,
            data: rendimentoDate.toISOString(),
            valor: valorRendimento,
            quantidade: null,
            tipo_movimentacao: 'rendimento',
            observacoes: `Rendimento mensal ${i}`,
            created_at: now,
          })
        }
      }
    }

    const { error: errHist } = await db.from('historico_investimentos').upsert(historicos, { onConflict: 'id' })
    if (errHist && errHist.code !== '23505') {
      console.warn('Aviso ao inserir historico de investimentos:', errHist.message)
    } else {
      console.log(`${historicos.length} registros de historico inseridos`)
    }

    console.log('Seed de investimentos completo!')
  } catch (error) {
    console.error('Erro ao inserir investimentos:', error)
    throw error
  }
}

/**
 * Seed de cartões de crédito
 */
export async function seedCartoes(db: any) {
  try {
    console.log('Seeding cartoes de credito...')

    const { data: instituicoesData } = await db.from('instituicoes').select('*')
    const instituicoes = instituicoesData || []
    if (instituicoes.length === 0) {
      console.log('Nenhuma instituicao encontrada. Execute seedInstituicoes() primeiro.')
      return
    }

    const { data: contasData } = await db.from('contas').select('*')
    const contas = contasData || []
    const contaCorrente = contas.find((c: any) => c.tipo === 'corrente')

    const now = new Date().toISOString()

    // Criar cartões de crédito de exemplo
    const cartoes = [
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[0]!.id, // Nubank
        conta_pagamento_id: contaCorrente?.id || null,
        nome: 'Nubank Mastercard',
        ultimos_digitos: '4523',
        bandeira: 'mastercard',
        limite_total: 15000.0,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        cor: '#8A05BE',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[1]!.id, // Bradesco
        conta_pagamento_id: contaCorrente?.id || null,
        nome: 'Bradesco Visa Platinum',
        ultimos_digitos: '8971',
        bandeira: 'visa',
        limite_total: 25000.0,
        dia_fechamento: 10,
        dia_vencimento: 20,
        ativo: true,
        cor: '#CC092F',
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        instituicao_id: instituicoes[2]!.id, // Inter
        conta_pagamento_id: contaCorrente?.id || null,
        nome: 'Inter Mastercard Gold',
        ultimos_digitos: '3456',
        bandeira: 'mastercard',
        limite_total: 10000.0,
        dia_fechamento: 5,
        dia_vencimento: 15,
        ativo: true,
        cor: '#FF7A00',
        created_at: now,
        updated_at: now,
      },
    ]

    const { error: errCartoes } = await db.from('cartoes_config').upsert(cartoes, { onConflict: 'id' })
    if (errCartoes && errCartoes.code !== '23505') {
      console.warn('Aviso ao inserir cartoes:', errCartoes.message)
    } else {
      console.log(`${cartoes.length} cartoes inseridos`)
    }

    // Criar faturas de exemplo para cada cartão
    const faturas: any[] = []
    const lancamentos: any[] = []

    for (const cartao of cartoes) {
      // Fatura do mês atual
      const hoje = new Date()
      const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
      const dataFechamento = new Date(hoje.getFullYear(), hoje.getMonth(), cartao.dia_fechamento).toISOString()
      const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), cartao.dia_vencimento).toISOString()

      const faturaAtualId = crypto.randomUUID()
      let valorTotalAtual = 0

      // Criar alguns lançamentos de exemplo
      const lancamentosExemplo = [
        {
          id: crypto.randomUUID(),
          fatura_id: faturaAtualId,
          transacao_id: null,
          data_compra: new Date(hoje.getFullYear(), hoje.getMonth(), 5).toISOString(),
          descricao: 'Supermercado Extra',
          valor_brl: 450.0,
          parcela_numero: null,
          parcela_total: null,
          moeda_original: null,
          valor_original: null,
          taxa_cambio: null,
          categoria_id: null,
          created_at: now,
        },
        {
          id: crypto.randomUUID(),
          fatura_id: faturaAtualId,
          transacao_id: null,
          data_compra: new Date(hoje.getFullYear(), hoje.getMonth(), 8).toISOString(),
          descricao: 'Restaurante Outback',
          valor_brl: 280.0,
          parcela_numero: null,
          parcela_total: null,
          moeda_original: null,
          valor_original: null,
          taxa_cambio: null,
          categoria_id: null,
          created_at: now,
        },
        {
          id: crypto.randomUUID(),
          fatura_id: faturaAtualId,
          transacao_id: null,
          data_compra: new Date(hoje.getFullYear(), hoje.getMonth(), 12).toISOString(),
          descricao: 'Netflix - Assinatura',
          valor_brl: 55.9,
          parcela_numero: null,
          parcela_total: null,
          moeda_original: null,
          valor_original: null,
          taxa_cambio: null,
          categoria_id: null,
          created_at: now,
        },
        {
          id: crypto.randomUUID(),
          fatura_id: faturaAtualId,
          transacao_id: null,
          data_compra: new Date(hoje.getFullYear(), hoje.getMonth(), 15).toISOString(),
          descricao: 'Posto Shell - Combustivel',
          valor_brl: 320.0,
          parcela_numero: null,
          parcela_total: null,
          moeda_original: null,
          valor_original: null,
          taxa_cambio: null,
          categoria_id: null,
          created_at: now,
        },
      ]

      lancamentos.push(...lancamentosExemplo)
      valorTotalAtual = lancamentosExemplo.reduce((sum, l) => sum + l.valor_brl, 0)

      faturas.push({
        id: faturaAtualId,
        cartao_id: cartao.id,
        mes_referencia: mesAtual,
        data_fechamento: dataFechamento,
        data_vencimento: dataVencimento,
        valor_total: valorTotalAtual,
        valor_minimo: valorTotalAtual * 0.15,
        valor_pago: 0,
        status: 'aberta',
        fechada_automaticamente: false,
        data_pagamento: null,
        transacao_pagamento_id: null,
        created_at: now,
        updated_at: now,
      })

      // Fatura do mês anterior (paga)
      const mesAnterior = `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`
      const dataFechamentoAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, cartao.dia_fechamento).toISOString()
      const dataVencimentoAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, cartao.dia_vencimento).toISOString()
      const dataPagamentoAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, cartao.dia_vencimento - 2).toISOString()

      faturas.push({
        id: crypto.randomUUID(),
        cartao_id: cartao.id,
        mes_referencia: mesAnterior,
        data_fechamento: dataFechamentoAnterior,
        data_vencimento: dataVencimentoAnterior,
        valor_total: 1850.0,
        valor_minimo: 277.5,
        valor_pago: 1850.0,
        status: 'paga',
        fechada_automaticamente: true,
        data_pagamento: dataPagamentoAnterior,
        transacao_pagamento_id: null,
        created_at: now,
        updated_at: now,
      })
    }

    const { error: errFaturas } = await db.from('faturas').upsert(faturas, { onConflict: 'id' })
    if (errFaturas && errFaturas.code !== '23505') {
      console.warn('Aviso ao inserir faturas:', errFaturas.message)
    } else {
      console.log(`${faturas.length} faturas inseridas`)
    }

    const { error: errLanc } = await db.from('faturas_lancamentos').upsert(lancamentos, { onConflict: 'id' })
    if (errLanc && errLanc.code !== '23505') {
      console.warn('Aviso ao inserir lancamentos de fatura:', errLanc.message)
    } else {
      console.log(`${lancamentos.length} lancamentos de fatura inseridos`)
    }

    console.log('Seed de cartoes completo!')
  } catch (error) {
    console.error('Erro ao inserir cartoes:', error)
    throw error
  }
}
