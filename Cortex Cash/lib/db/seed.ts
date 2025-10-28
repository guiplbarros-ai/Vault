/**
 * Seed de dados iniciais para o banco de dados
 * Agent CORE: Owner
 */

import { Categoria } from '../types';

/**
 * Categorias padrão do sistema
 * 13 categorias principais conforme especificação
 */
export const CATEGORIAS_PADRAO: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>[] = [
  // ==================== DESPESAS ====================
  {
    nome: 'Alimentação',
    tipo: 'despesa',
    grupo: null,
    icone: '🍽️',
    cor: '#ef4444',
    ordem: 1,
    ativa: true,
  },
  {
    nome: 'Restaurantes',
    tipo: 'despesa',
    grupo: 'Alimentação',
    icone: '🍴',
    cor: '#f87171',
    ordem: 2,
    ativa: true,
  },
  {
    nome: 'Supermercado',
    tipo: 'despesa',
    grupo: 'Alimentação',
    icone: '🛒',
    cor: '#fca5a5',
    ordem: 3,
    ativa: true,
  },

  {
    nome: 'Transporte',
    tipo: 'despesa',
    grupo: null,
    icone: '🚗',
    cor: '#f59e0b',
    ordem: 4,
    ativa: true,
  },
  {
    nome: 'Combustível',
    tipo: 'despesa',
    grupo: 'Transporte',
    icone: '⛽',
    cor: '#fbbf24',
    ordem: 5,
    ativa: true,
  },
  {
    nome: 'Transporte Público',
    tipo: 'despesa',
    grupo: 'Transporte',
    icone: '🚌',
    cor: '#fcd34d',
    ordem: 6,
    ativa: true,
  },

  {
    nome: 'Moradia',
    tipo: 'despesa',
    grupo: null,
    icone: '🏠',
    cor: '#8b5cf6',
    ordem: 7,
    ativa: true,
  },
  {
    nome: 'Aluguel',
    tipo: 'despesa',
    grupo: 'Moradia',
    icone: '🏡',
    cor: '#a78bfa',
    ordem: 8,
    ativa: true,
  },
  {
    nome: 'Contas',
    tipo: 'despesa',
    grupo: 'Moradia',
    icone: '📄',
    cor: '#c4b5fd',
    ordem: 9,
    ativa: true,
  },

  {
    nome: 'Saúde',
    tipo: 'despesa',
    grupo: null,
    icone: '❤️',
    cor: '#ec4899',
    ordem: 10,
    ativa: true,
  },
  {
    nome: 'Farmácia',
    tipo: 'despesa',
    grupo: 'Saúde',
    icone: '💊',
    cor: '#f472b6',
    ordem: 11,
    ativa: true,
  },
  {
    nome: 'Plano de Saúde',
    tipo: 'despesa',
    grupo: 'Saúde',
    icone: '🏥',
    cor: '#f9a8d4',
    ordem: 12,
    ativa: true,
  },

  {
    nome: 'Educação',
    tipo: 'despesa',
    grupo: null,
    icone: '🎓',
    cor: '#3b82f6',
    ordem: 13,
    ativa: true,
  },
  {
    nome: 'Cursos',
    tipo: 'despesa',
    grupo: 'Educação',
    icone: '📚',
    cor: '#60a5fa',
    ordem: 14,
    ativa: true,
  },
  {
    nome: 'Livros',
    tipo: 'despesa',
    grupo: 'Educação',
    icone: '📖',
    cor: '#93c5fd',
    ordem: 15,
    ativa: true,
  },

  {
    nome: 'Lazer',
    tipo: 'despesa',
    grupo: null,
    icone: '🎮',
    cor: '#14b8a6',
    ordem: 16,
    ativa: true,
  },
  {
    nome: 'Entretenimento',
    tipo: 'despesa',
    grupo: 'Lazer',
    icone: '📺',
    cor: '#2dd4bf',
    ordem: 17,
    ativa: true,
  },
  {
    nome: 'Viagens',
    tipo: 'despesa',
    grupo: 'Lazer',
    icone: '✈️',
    cor: '#5eead4',
    ordem: 18,
    ativa: true,
  },

  {
    nome: 'Vestuário',
    tipo: 'despesa',
    grupo: null,
    icone: '👕',
    cor: '#a855f7',
    ordem: 19,
    ativa: true,
  },
  {
    nome: 'Roupas',
    tipo: 'despesa',
    grupo: 'Vestuário',
    icone: '👔',
    cor: '#c084fc',
    ordem: 20,
    ativa: true,
  },
  {
    nome: 'Calçados',
    tipo: 'despesa',
    grupo: 'Vestuário',
    icone: '👟',
    cor: '#d8b4fe',
    ordem: 21,
    ativa: true,
  },

  {
    nome: 'Assinaturas',
    tipo: 'despesa',
    grupo: null,
    icone: '💳',
    cor: '#06b6d4',
    ordem: 22,
    ativa: true,
  },
  {
    nome: 'Streaming',
    tipo: 'despesa',
    grupo: 'Assinaturas',
    icone: '▶️',
    cor: '#22d3ee',
    ordem: 23,
    ativa: true,
  },
  {
    nome: 'Software',
    tipo: 'despesa',
    grupo: 'Assinaturas',
    icone: '💻',
    cor: '#67e8f9',
    ordem: 24,
    ativa: true,
  },

  {
    nome: 'Impostos',
    tipo: 'despesa',
    grupo: null,
    icone: '🧾',
    cor: '#64748b',
    ordem: 25,
    ativa: true,
  },

  {
    nome: 'Investimentos',
    tipo: 'despesa',
    grupo: null,
    icone: '📈',
    cor: '#10b981',
    ordem: 26,
    ativa: true,
  },

  {
    nome: 'Empréstimos',
    tipo: 'despesa',
    grupo: null,
    icone: '💰',
    cor: '#dc2626',
    ordem: 27,
    ativa: true,
  },

  {
    nome: 'Pet',
    tipo: 'despesa',
    grupo: null,
    icone: '🐶',
    cor: '#f97316',
    ordem: 28,
    ativa: true,
  },

  {
    nome: 'Outros',
    tipo: 'despesa',
    grupo: null,
    icone: '📦',
    cor: '#6b7280',
    ordem: 29,
    ativa: true,
  },

  // ==================== RECEITAS ====================
  {
    nome: 'Salário',
    tipo: 'receita',
    grupo: null,
    icone: '💵',
    cor: '#10b981',
    ordem: 30,
    ativa: true,
  },

  {
    nome: 'Freelance',
    tipo: 'receita',
    grupo: null,
    icone: '💼',
    cor: '#059669',
    ordem: 31,
    ativa: true,
  },

  {
    nome: 'Investimentos',
    tipo: 'receita',
    grupo: null,
    icone: '📊',
    cor: '#34d399',
    ordem: 32,
    ativa: true,
  },
  {
    nome: 'Dividendos',
    tipo: 'receita',
    grupo: 'Investimentos',
    icone: '💲',
    cor: '#6ee7b7',
    ordem: 33,
    ativa: true,
  },
  {
    nome: 'Juros',
    tipo: 'receita',
    grupo: 'Investimentos',
    icone: '📉',
    cor: '#a7f3d0',
    ordem: 34,
    ativa: true,
  },

  {
    nome: 'Reembolso',
    tipo: 'receita',
    grupo: null,
    icone: '🔄',
    cor: '#22c55e',
    ordem: 35,
    ativa: true,
  },

  {
    nome: 'Prêmio',
    tipo: 'receita',
    grupo: null,
    icone: '🏆',
    cor: '#4ade80',
    ordem: 36,
    ativa: true,
  },

  {
    nome: 'Vendas',
    tipo: 'receita',
    grupo: null,
    icone: '🛍️',
    cor: '#86efac',
    ordem: 37,
    ativa: true,
  },

  {
    nome: 'Outros',
    tipo: 'receita',
    grupo: null,
    icone: '💚',
    cor: '#bbf7d0',
    ordem: 38,
    ativa: true,
  },

  // ==================== TRANSFERÊNCIAS ====================
  {
    nome: 'Transferência',
    tipo: 'transferencia',
    grupo: null,
    icone: '↔️',
    cor: '#6366f1',
    ordem: 39,
    ativa: true,
  },
];

/**
 * Função para inserir categorias padrão no banco (Dexie)
 */
export async function seedCategorias(db: any): Promise<void> {
  try {
    const now = new Date();

    const categorias = CATEGORIAS_PADRAO.map((categoria) => ({
      id: crypto.randomUUID(),
      nome: categoria.nome,
      tipo: categoria.tipo,
      grupo: categoria.grupo,
      icone: categoria.icone,
      cor: categoria.cor,
      ordem: categoria.ordem,
      ativa: categoria.ativa,
      created_at: now,
      updated_at: now,
    }));

    await db.categorias.bulkAdd(categorias);

    console.log(`✅ ${CATEGORIAS_PADRAO.length} categorias padrão inseridas com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao inserir categorias padrão:', error);
    throw error;
  }
}

/**
 * Verifica se o banco já possui categorias (Dexie)
 */
export async function hasCategories(db: any): Promise<boolean> {
  try {
    const count = await db.categorias.count();
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Inicializa o banco com dados padrão se necessário (Dexie)
 */
export async function initializeSeedData(db: any): Promise<void> {
  const hasData = await hasCategories(db);

  if (!hasData) {
    console.log('📦 Banco vazio detectado. Inserindo categorias padrão...');
    await seedCategorias(db);
  } else {
    console.log('✅ Banco já possui categorias.');
  }
}
