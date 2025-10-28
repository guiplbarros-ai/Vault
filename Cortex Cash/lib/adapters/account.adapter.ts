/**
 * Adapter para converter entre tipos de formulário de conta e tipos do banco
 * Agent UI: Owner
 */

import type { Conta, TipoConta } from '../types';
import type { AccountFormData } from '../validations';

/**
 * Converte tipo de conta do formulário (inglês) para tipo do banco (português)
 */
export function mapFormAccountTypeToDBType(
  formType: 'checking' | 'savings' | 'credit' | 'investment' | 'cash'
): TipoConta | string {
  const mapping: Record<string, string> = {
    checking: 'corrente',
    savings: 'poupanca',
    investment: 'investimento',
    cash: 'carteira',
    credit: 'credit', // Não existe no TipoConta do Agent 1, mantém como string
  };
  return mapping[formType] || formType;
}

/**
 * Converte tipo de conta do banco (português) para tipo do formulário (inglês)
 */
export function mapDBAccountTypeToFormType(
  dbType: string
): 'checking' | 'savings' | 'credit' | 'investment' | 'cash' {
  const mapping: Record<string, 'checking' | 'savings' | 'credit' | 'investment' | 'cash'> = {
    corrente: 'checking',
    poupanca: 'savings',
    investimento: 'investment',
    carteira: 'cash',
    credit: 'credit',
  };
  return mapping[dbType] || 'checking';
}

/**
 * Converte dados do formulário para dados de criação de conta
 */
export function mapFormDataToCreateConta(
  formData: AccountFormData,
  instituicaoId: string
): Omit<Conta, 'id' | 'created_at' | 'updated_at'> {
  return {
    instituicao_id: instituicaoId,
    nome: formData.name,
    tipo: mapFormAccountTypeToDBType(formData.type) as TipoConta,
    saldo_inicial: formData.balance,
    saldo_atual: formData.balance, // Inicialmente igual ao saldo inicial
    ativa: formData.isActive ?? true,
    cor: formData.color,
    icone: formData.icon,
    observacoes: formData.notes,
    agencia: formData.institution,
    numero: formData.accountNumber,
  };
}

/**
 * Converte dados da conta do banco para dados do formulário
 */
export function mapContaToFormData(conta: Conta): Partial<AccountFormData> {
  return {
    name: conta.nome,
    type: mapDBAccountTypeToFormType(conta.tipo),
    balance: conta.saldo_inicial,
    currency: 'BRL', // Por enquanto fixo
    isActive: conta.ativa,
    color: conta.cor,
    icon: conta.icone,
    notes: conta.observacoes,
    institution: conta.agencia,
    accountNumber: conta.numero,
  };
}
