/**
 * Fixtures - Contas
 * Agent CORE: Implementador
 *
 * Dados de teste para contas
 */

import type { Conta } from '@/lib/types';

export const contas: Conta[] = [
  {
    id: 'conta-corrente',
    instituicao_id: 'inst-banco-brasil',
    nome: 'Conta Corrente',
    tipo: 'corrente',
    saldo_inicial: 1000.00,
    ativa: true,
    incluir_dashboard: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'conta-poupanca',
    instituicao_id: 'inst-banco-brasil',
    nome: 'Poupança',
    tipo: 'poupanca',
    saldo_inicial: 5000.00,
    ativa: true,
    incluir_dashboard: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'conta-investimento',
    instituicao_id: 'inst-xp',
    nome: 'XP Investimentos',
    tipo: 'investimento',
    saldo_inicial: 10000.00,
    ativa: true,
    incluir_dashboard: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'conta-carteira',
    instituicao_id: undefined,
    nome: 'Carteira',
    tipo: 'dinheiro',
    saldo_inicial: 200.00,
    ativa: true,
    incluir_dashboard: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'conta-inativa',
    instituicao_id: 'inst-bradesco',
    nome: 'Conta Antiga',
    tipo: 'corrente',
    saldo_inicial: 0,
    ativa: false,
    incluir_dashboard: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-06-01'),
  },
];

export const contaAtiva = contas[0];
export const contaPoupanca = contas[1];
export const contaInvestimento = contas[2];
export const contaCarteira = contas[3];
export const contaInativa = contas[4];
