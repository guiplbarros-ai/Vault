/**
 * Fixtures - Transações
 * Agent CORE: Implementador
 *
 * Dados de teste para transações
 */

import type { Transacao } from '@/lib/types';
import { contaAtiva, contaPoupanca } from './contas';
import { categoriasDespesa, categoriasReceita } from './categorias';

export const transacoes: Transacao[] = [
  // Despesas
  {
    id: 'trans-1',
    conta_id: contaAtiva.id,
    categoria_id: categoriasDespesa[0].id, // Alimentação
    data: new Date('2025-01-15'),
    descricao: 'IFOOD RESTAURANTE',
    valor: 45.50,
    tipo: 'despesa',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'ia',
    hash: 'hash-trans-1',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-15'),
  },
  {
    id: 'trans-2',
    conta_id: contaAtiva.id,
    categoria_id: categoriasDespesa[1].id, // Transporte
    data: new Date('2025-01-16'),
    descricao: 'UBER VIAGEM',
    valor: 28.90,
    tipo: 'despesa',
    parcelado: false,
    classificacao_confirmada: false,
    classificacao_origem: 'ia',
    hash: 'hash-trans-2',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-16'),
    updated_at: new Date('2025-01-16'),
  },
  {
    id: 'trans-3',
    conta_id: contaAtiva.id,
    categoria_id: categoriasDespesa[2].id, // Saúde
    data: new Date('2025-01-17'),
    descricao: 'FARMACIA POPULAR',
    valor: 87.30,
    tipo: 'despesa',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'regra',
    hash: 'hash-trans-3',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-17'),
    updated_at: new Date('2025-01-17'),
  },
  {
    id: 'trans-4',
    conta_id: contaAtiva.id,
    categoria_id: categoriasDespesa[3].id, // Moradia
    data: new Date('2025-01-10'),
    descricao: 'ALUGUEL JAN/2025',
    valor: 1500.00,
    tipo: 'despesa',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'manual',
    hash: 'hash-trans-4',
    observacoes: 'Aluguel mensal',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-10'),
    updated_at: new Date('2025-01-10'),
  },

  // Receitas
  {
    id: 'trans-5',
    conta_id: contaAtiva.id,
    categoria_id: categoriasReceita[0].id, // Salário
    data: new Date('2025-01-05'),
    descricao: 'SALARIO JAN/2025',
    valor: 5000.00,
    tipo: 'receita',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'manual',
    hash: 'hash-trans-5',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-05'),
    updated_at: new Date('2025-01-05'),
  },
  {
    id: 'trans-6',
    conta_id: contaAtiva.id,
    categoria_id: categoriasReceita[1].id, // Freelance
    data: new Date('2025-01-20'),
    descricao: 'FREELANCE PROJETO X',
    valor: 1200.00,
    tipo: 'receita',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'manual',
    hash: 'hash-trans-6',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-20'),
    updated_at: new Date('2025-01-20'),
  },

  // Transferência
  {
    id: 'trans-7-origem',
    conta_id: contaAtiva.id,
    data: new Date('2025-01-12'),
    descricao: 'TRANSFERENCIA PARA POUPANCA',
    valor: -500.00,
    tipo: 'transferencia',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'manual',
    transferencia_id: 'transfer-1',
    conta_destino_id: contaPoupanca.id,
    hash: 'hash-trans-7-origem',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-12'),
    updated_at: new Date('2025-01-12'),
  },
  {
    id: 'trans-7-destino',
    conta_id: contaPoupanca.id,
    data: new Date('2025-01-12'),
    descricao: 'TRANSFERENCIA DA CONTA CORRENTE',
    valor: 500.00,
    tipo: 'transferencia',
    parcelado: false,
    classificacao_confirmada: true,
    classificacao_origem: 'manual',
    transferencia_id: 'transfer-1',
    hash: 'hash-trans-7-destino',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-12'),
    updated_at: new Date('2025-01-12'),
  },

  // Parcelada
  {
    id: 'trans-8',
    conta_id: contaAtiva.id,
    categoria_id: categoriasDespesa[4].id, // Lazer
    data: new Date('2025-01-08'),
    descricao: 'PLAYSTATION STORE',
    valor: 99.97,
    tipo: 'despesa',
    parcelado: true,
    parcela_numero: 1,
    parcela_total: 3,
    classificacao_confirmada: true,
    classificacao_origem: 'ia',
    hash: 'hash-trans-8',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-08'),
    updated_at: new Date('2025-01-08'),
  },

  // Sem categoria (pendente classificação)
  {
    id: 'trans-9',
    conta_id: contaAtiva.id,
    categoria_id: undefined,
    data: new Date('2025-01-25'),
    descricao: 'COMPRA MISTERIOSA',
    valor: 150.00,
    tipo: 'despesa',
    parcelado: false,
    classificacao_confirmada: false,
    classificacao_origem: undefined,
    hash: 'hash-trans-9',
    usuario_id: 'usuario-test',
    created_at: new Date('2025-01-25'),
    updated_at: new Date('2025-01-25'),
  },
];

export const despesas = transacoes.filter(t => t.tipo === 'despesa');
export const receitas = transacoes.filter(t => t.tipo === 'receita');
export const transferencias = transacoes.filter(t => t.tipo === 'transferencia');
export const pendentesClassificacao = transacoes.filter(t => !t.classificacao_confirmada);
