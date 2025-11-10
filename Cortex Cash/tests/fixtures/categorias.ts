/**
 * Fixtures - Categorias
 * Agent CORE: Implementador
 *
 * Dados de teste para categorias
 */

import type { Categoria } from '@/lib/types';

export const categoriasDespesa: Categoria[] = [
  {
    id: 'cat-alimentacao',
    nome: 'Alimentação',
    tipo: 'despesa',
    icone: '🍔',
    cor: '#FF6B6B',
    ordem: 1,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-transporte',
    nome: 'Transporte',
    tipo: 'despesa',
    icone: '🚗',
    cor: '#4ECDC4',
    ordem: 2,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-saude',
    nome: 'Saúde',
    tipo: 'despesa',
    icone: '🏥',
    cor: '#95E1D3',
    ordem: 3,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-moradia',
    nome: 'Moradia',
    tipo: 'despesa',
    icone: '🏠',
    cor: '#F38181',
    ordem: 4,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-lazer',
    nome: 'Lazer',
    tipo: 'despesa',
    icone: '🎮',
    cor: '#AA96DA',
    ordem: 5,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-inativa',
    nome: 'Categoria Inativa',
    tipo: 'despesa',
    icone: '❌',
    cor: '#999999',
    ordem: 99,
    ativa: false,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
];

export const categoriasReceita: Categoria[] = [
  {
    id: 'cat-salario',
    nome: 'Salário',
    tipo: 'receita',
    icone: '💰',
    cor: '#51CF66',
    ordem: 1,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-freelance',
    nome: 'Freelance',
    tipo: 'receita',
    icone: '💻',
    cor: '#74C0FC',
    ordem: 2,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'cat-investimento',
    nome: 'Rendimento de Investimento',
    tipo: 'receita',
    icone: '📈',
    cor: '#FFD43B',
    ordem: 3,
    ativa: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
];

export const todasCategorias = [...categoriasDespesa, ...categoriasReceita];
