/**
 * Adapter para converter entre tipos de formulário de categoria e tipos do banco
 * Agent UI: Owner
 */

import type { CreateCategoriaDTO, TipoTransacao } from '../types';
import type { CategoryFormData } from '../validations';

/**
 * Converte tipo de categoria do formulário (inglês) para tipo do banco (português)
 */
export function mapFormCategoryTypeToDBType(formType: 'income' | 'expense'): TipoTransacao {
  return formType === 'income' ? 'receita' : 'despesa';
}

/**
 * Converte tipo de categoria do banco (português) para tipo do formulário (inglês)
 */
export function mapDBCategoryTypeToFormType(dbType: TipoTransacao): 'income' | 'expense' {
  return dbType === 'receita' ? 'income' : 'expense';
}

/**
 * Converte dados do formulário para DTO de criação de categoria
 */
export function mapFormDataToCreateCategoria(formData: CategoryFormData): CreateCategoriaDTO {
  return {
    nome: formData.name,
    tipo: mapFormCategoryTypeToDBType(formData.type),
    grupo: formData.parentId, // parentId vira grupo (categoria pai)
    icone: formData.icon,
    cor: formData.color,
    ordem: 0, // Será calculado automaticamente
  };
}

/**
 * Converte dados de categoria do banco para dados do formulário
 */
export function mapCategoriaToFormData(categoria: CreateCategoriaDTO): Partial<CategoryFormData> {
  return {
    name: categoria.nome,
    type: mapDBCategoryTypeToFormType(categoria.tipo),
    parentId: categoria.grupo,
    icon: categoria.icone,
    color: categoria.cor,
    description: undefined, // Não há descrição no schema do Agent 1
  };
}
