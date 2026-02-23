/**
 * Inicialização do banco de dados
 * Agent UI: Owner
 *
 * Popula o banco com dados iniciais na primeira execução.
 * Agora usa Supabase em vez de Dexie/IndexedDB.
 */

import { getSupabaseBrowserClient } from './supabase'
import { CATEGORIAS_PADRAO, hasCategories, seedCategorias } from './seed'
import { seedCenarioBase } from './seed-planejamento'
import { hasTags, seedTags } from './seed-tags'
import { hasUsuarios, seedUsuarios } from './seed-usuarios'

const INIT_FLAG_KEY = 'cortex-cash-initialized'

/**
 * Verifica se o banco já foi inicializado
 */
export function isInitialized(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(INIT_FLAG_KEY) === 'true'
}

/**
 * Marca o banco como inicializado
 */
function markAsInitialized(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(INIT_FLAG_KEY, 'true')
  }
}

/**
 * Inicializa o banco de dados com dados padrão
 * Verifica se os dados essenciais já existem no Supabase e os cria se necessário.
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized()) {
    console.log('Banco ja inicializado, pulando seed...')
    return
  }

  console.log('Inicializando banco de dados...')

  try {
    const supabase = getSupabaseBrowserClient()

    // Verifica se já tem dados básicos
    const alreadyHasCategories = await hasCategories(supabase)
    const alreadyHasTags = await hasTags(supabase)
    const alreadyHasUsuarios = await hasUsuarios()

    if (alreadyHasCategories && alreadyHasTags && alreadyHasUsuarios) {
      console.log('Dados basicos ja existem, pulando seed...')
      markAsInitialized()
      return
    }

    // Seed de usuários padrão (PRIMEIRO — outros dados dependem disso)
    if (!alreadyHasUsuarios) {
      console.log('Criando usuarios padrao...')
      await seedUsuarios()
    }

    // Seed de categorias padrão
    if (!alreadyHasCategories) {
      console.log(`Criando ${CATEGORIAS_PADRAO.length} categorias padrao...`)
      await seedCategorias(supabase)
    }

    // Seed de tags padrão
    if (!alreadyHasTags) {
      console.log('Criando tags padrao...')
      await seedTags(supabase)
    }

    // Seed de cenário base de planejamento
    console.log('Criando cenario base de planejamento...')
    await seedCenarioBase()

    markAsInitialized()
    console.log('Banco inicializado com sucesso!')
  } catch (error) {
    console.error('Erro ao inicializar banco:', error)
    throw error
  }
}

/**
 * Reseta o banco (limpa tudo e reinicializa)
 * CUIDADO: Apaga todos os dados do usuário no Supabase.
 */
export async function resetDatabase(): Promise<void> {
  console.log('Resetando banco de dados...')

  const supabase = getSupabaseBrowserClient()

  // Limpa as tabelas de dados do usuário (ordem respeitando foreign keys)
  const tablesToClear = [
    'faturas_lancamentos',
    'faturas',
    'logs_ia',
    'historico_investimentos',
    'investimentos',
    'patrimonio_snapshots',
    'transacoes',
    'orcamentos',
    'configuracoes_comportamento',
    'objetivos_financeiros',
    'cenarios',
    'cartoes_config',
    'centros_custo',
    'regras_classificacao',
    'templates_importacao',
    'contas',
    'categorias',
    'tags',
    'instituicoes',
    'declaracoes_ir',
    'rendimentos_tributaveis',
    'rendimentos_isentos',
    'despesas_dedutiveis',
    'bens_direitos',
    'dividas_onus',
  ]

  for (const table of tablesToClear) {
    await supabase.from(table).delete().neq('id', '')
  }

  // Remove flag de inicialização
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(INIT_FLAG_KEY)
  }

  // Reinicializa
  await initializeDatabase()

  console.log('Banco resetado com sucesso!')
}
