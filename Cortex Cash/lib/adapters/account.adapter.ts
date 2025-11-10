/**
 * Adapter para converter entre tipos de formulário de conta e tipos do banco
 * Agent UI: Owner
 */

import type { Conta, TipoConta } from '../types';
import type { AccountFormData } from '../validations';
import { lightenColor } from '../utils/color';

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
 * @param formData - Dados do formulário
 * @param instituicaoId - ID da instituição (opcional, pode vir do formData)
 * @param contasPai - Lista de contas disponíveis para buscar a conta pai (opcional)
 */
export function mapFormDataToCreateConta(
  formData: AccountFormData,
  instituicaoId?: string,
  contasPai?: Conta[]
): Omit<Conta, 'id' | 'created_at' | 'updated_at'> {
  // Se instituicaoId não for passado, usa o do formData
  const finalInstituicaoId = instituicaoId || formData.institution || '';

  // Conta pai para vinculação
  const parentAccountId = formData.parentAccount || undefined;

  // Determina a cor: se tiver conta pai, usa cor dela clareada; senão usa a do formulário
  let cor = formData.color;
  if (parentAccountId && contasPai) {
    const contaPai = contasPai.find(c => c.id === parentAccountId);
    if (contaPai && contaPai.cor) {
      cor = lightenColor(contaPai.cor, 20); // 20% mais claro
    }
  }

  // Busca o usuário atual do localStorage
  const currentUserId = typeof window !== 'undefined'
    ? localStorage.getItem('cortex-cash-current-user-id') || ''
    : '';

  return {
    instituicao_id: finalInstituicaoId,
    nome: formData.name,
    tipo: mapFormAccountTypeToDBType(formData.type) as TipoConta,
    saldo_referencia: formData.balance, // User é soberano - informa o saldo atual
    data_referencia: new Date(), // Data de hoje como referência inicial
    saldo_atual: formData.balance, // Inicialmente igual ao saldo de referência
    ativa: formData.isActive ?? true,
    cor: cor,
    icone: formData.icon,
    observacoes: formData.notes,
    // Campos de agência e número removidos por questões de segurança
    agencia: undefined,
    numero: undefined,
    // Conta pai para vinculação (poupança, investimento, cartões)
    conta_pai_id: parentAccountId,
    usuario_id: currentUserId,
  };
}

/**
 * Converte dados da conta do banco para dados do formulário
 */
export function mapContaToFormData(conta: Conta): Partial<AccountFormData> {
  return {
    name: conta.nome,
    type: mapDBAccountTypeToFormType(conta.tipo),
    balance: conta.saldo_referencia, // Mostra o saldo de referência (user é soberano!)
    currency: 'BRL', // Por enquanto fixo
    isActive: conta.ativa,
    color: conta.cor,
    icon: conta.icone,
    notes: conta.observacoes,
    institution: conta.instituicao_id,
    // Campos de agência e número removidos por questões de segurança
    // Conta pai para vinculação
    parentAccount: conta.conta_pai_id,
  };
}
