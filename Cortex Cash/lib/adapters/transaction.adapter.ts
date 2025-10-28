/**
 * Adapter para converter entre tipos de formulário e tipos do banco de dados
 * Agent UI: Owner
 */

import type { CreateTransacaoDTO, TipoTransacao } from '../types';
import type { TransactionFormData } from '../validations';

/**
 * Converte tipo do formulário (inglês) para tipo do banco (português)
 */
export function mapFormTypeToDBType(formType: 'income' | 'expense'): TipoTransacao {
  return formType === 'income' ? 'receita' : 'despesa';
}

/**
 * Converte tipo do banco (português) para tipo do formulário (inglês)
 */
export function mapDBTypeToFormType(dbType: TipoTransacao): 'income' | 'expense' | 'transfer' {
  if (dbType === 'receita') return 'income';
  if (dbType === 'despesa') return 'expense';
  return 'transfer';
}

/**
 * Converte dados do formulário para DTO do banco
 */
export function mapFormDataToDTO(formData: TransactionFormData): CreateTransacaoDTO {
  return {
    conta_id: formData.accountId,
    categoria_id: formData.categoryId,
    data: formData.date,
    descricao: formData.description,
    valor: formData.amount,
    tipo: mapFormTypeToDBType(formData.type),
    observacoes: formData.notes,
    tags: formData.tags,
  };
}

/**
 * Converte dados do banco para dados do formulário
 */
export function mapDTOToFormData(dto: CreateTransacaoDTO): Partial<TransactionFormData> {
  return {
    accountId: dto.conta_id,
    categoryId: dto.categoria_id,
    date: typeof dto.data === 'string' ? new Date(dto.data) : dto.data,
    description: dto.descricao,
    amount: dto.valor,
    type: mapDBTypeToFormType(dto.tipo),
    notes: dto.observacoes,
    tags: dto.tags,
  };
}
