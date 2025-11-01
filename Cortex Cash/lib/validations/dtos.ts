/**
 * Validation schemas for DTOs
 * Agent CORE: Implementador
 *
 * Zod schemas for runtime validation of Data Transfer Objects
 */

import { z } from 'zod';
import { ValidationError } from '../errors';

// ============================================================================
// Enum schemas (for tipo validation)
// ============================================================================

export const tipoTransacaoSchema = z.enum(['receita', 'despesa', 'transferencia']);
export const tipoContaSchema = z.enum(['corrente', 'poupanca', 'investimento', 'carteira']);
export const tipoInvestimentoSchema = z.enum([
  'renda_fixa',
  'renda_variavel',
  'fundo_investimento',
  'previdencia',
  'criptomoeda',
  'outro',
]);
export const tipoMovimentacaoSchema = z.enum(['aporte', 'resgate', 'rendimento', 'ajuste']);

// ============================================================================
// DTO Validation Schemas
// ============================================================================

/**
 * Schema for CreateInstituicaoDTO
 */
export const createInstituicaoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  codigo: z.string().max(20, 'Código muito longo').optional(),
  logo_url: z.string().url('URL inválida').optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)').optional(),
});

/**
 * Schema for CreateContaDTO
 */
export const createContaSchema = z.object({
  instituicao_id: z.string().min(1, 'ID de instituição é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  tipo: tipoContaSchema,
  agencia: z.string().max(20, 'Agência muito longa').optional(),
  numero: z.string().max(30, 'Número muito longo').optional(),
  saldo_inicial: z.number().finite('Saldo inicial deve ser um número válido'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)').optional(),
  icone: z.string().max(50, 'Ícone muito longo').optional(),
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
});

/**
 * Schema for CreateTransacaoDTO
 */
export const createTransacaoSchema = z.object({
  conta_id: z.string().min(1, 'ID de conta é obrigatório'),
  categoria_id: z.string().min(1, 'ID de categoria é obrigatório').optional(),
  data: z.union([z.date(), z.string().min(1, 'Data é obrigatória')]),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(200, 'Descrição muito longa'),
  valor: z.number().positive('Valor deve ser positivo').finite('Valor deve ser um número válido'),
  tipo: tipoTransacaoSchema,
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
  tags: z.array(z.string().max(50, 'Tag muito longa')).max(10, 'Máximo de 10 tags').optional(),
});

/**
 * Schema for CreateCategoriaDTO
 */
export const createCategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  tipo: tipoTransacaoSchema,
  grupo: z.string().max(50, 'Grupo muito longo').optional(),
  icone: z.string().max(50, 'Ícone muito longo').optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)').optional(),
  ordem: z.number().int('Ordem deve ser um número inteiro').nonnegative('Ordem não pode ser negativa').optional(),
});

/**
 * Schema for CreateInvestimentoDTO
 */
export const createInvestimentoSchema = z.object({
  instituicao_id: z.string().min(1, 'ID de instituição é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  tipo: tipoInvestimentoSchema,
  ticker: z.string().max(20, 'Ticker muito longo').optional(),
  valor_aplicado: z.number().nonnegative('Valor aplicado não pode ser negativo').finite('Valor aplicado deve ser um número válido'),
  valor_atual: z.number().nonnegative('Valor atual não pode ser negativo').finite('Valor atual deve ser um número válido'),
  quantidade: z.number().nonnegative('Quantidade não pode ser negativa').finite('Quantidade deve ser um número válido').optional(),
  data_aplicacao: z.union([z.date(), z.string().min(1, 'Data de aplicação é obrigatória')]),
  data_vencimento: z.union([z.date(), z.string()]).optional(),
  taxa_juros: z.number().nonnegative('Taxa de juros não pode ser negativa').finite('Taxa de juros deve ser um número válido').optional(),
  rentabilidade_contratada: z.number().nonnegative('Rentabilidade contratada não pode ser negativa').finite('Rentabilidade contratada deve ser um número válido').optional(),
  indexador: z.string().max(20, 'Indexador muito longo').optional(),
  conta_origem_id: z.string().optional(),
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)').optional(),
});

/**
 * Schema for CreateHistoricoInvestimentoDTO
 */
export const createHistoricoInvestimentoSchema = z.object({
  investimento_id: z.string().min(1, 'ID de investimento é obrigatório'),
  data: z.union([z.date(), z.string().min(1, 'Data é obrigatória')]),
  valor: z.number().finite('Valor deve ser um número válido'),
  quantidade: z.number().nonnegative('Quantidade não pode ser negativa').finite('Quantidade deve ser um número válido').optional(),
  tipo_movimentacao: tipoMovimentacaoSchema,
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
});

// ============================================================================
// Agent IMPORT - Validation Schemas
// ============================================================================

/**
 * Schema for ParseConfig
 */
export const parseConfigSchema = z.object({
  separador: z.string().length(1, 'Separador deve ter 1 caractere').optional(),
  encoding: z.string().max(20, 'Encoding muito longo').optional(),
  pular_linhas: z.number().int('Pular linhas deve ser um número inteiro').nonnegative('Pular linhas não pode ser negativo').optional(),
  formato_data: z.string().max(20, 'Formato de data muito longo').optional(),
  separador_decimal: z.enum([',', '.'], { errorMap: () => ({ message: 'Separador decimal deve ser "," ou "."' }) }).optional(),
});

/**
 * Schema for MapeamentoColunas
 */
export const mapeamentoColunasSchema = z.object({
  data: z.number().int('Índice da coluna data deve ser um número inteiro').nonnegative('Índice da coluna data não pode ser negativo'),
  descricao: z.number().int('Índice da coluna descrição deve ser um número inteiro').nonnegative('Índice da coluna descrição não pode ser negativo'),
  valor: z.number().int('Índice da coluna valor deve ser um número inteiro').nonnegative('Índice da coluna valor não pode ser negativo'),
  tipo: z.number().int('Índice da coluna tipo deve ser um número inteiro').nonnegative('Índice da coluna tipo não pode ser negativo').optional(),
  categoria: z.number().int('Índice da coluna categoria deve ser um número inteiro').nonnegative('Índice da coluna categoria não pode ser negativo').optional(),
  observacoes: z.number().int('Índice da coluna observações deve ser um número inteiro').nonnegative('Índice da coluna observações não pode ser negativo').optional(),
});

/**
 * Schema for CreateTemplateImportacaoDTO
 */
export const createTemplateImportacaoSchema = z.object({
  instituicao_id: z.string().min(1, 'ID de instituição é obrigatório').optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  tipo_arquivo: z.enum(['csv', 'ofx', 'excel'], { errorMap: () => ({ message: 'Tipo de arquivo deve ser "csv", "ofx" ou "excel"' }) }),
  separador: z.string().length(1, 'Separador deve ter 1 caractere').optional(),
  encoding: z.string().max(20, 'Encoding muito longo').optional(),
  pular_linhas: z.number().int('Pular linhas deve ser um número inteiro').nonnegative('Pular linhas não pode ser negativo').optional(),
  mapeamento_colunas: z.string().min(1, 'Mapeamento de colunas é obrigatório'), // JSON string
  formato_data: z.string().max(20, 'Formato de data muito longo').optional(),
  separador_decimal: z.enum([',', '.'], { errorMap: () => ({ message: 'Separador decimal deve ser "," ou "."' }) }).optional(),
});

// ============================================================================
// Type exports (inferred from schemas)
// ============================================================================

export type CreateInstituicaoDTOValidated = z.infer<typeof createInstituicaoSchema>;
export type CreateContaDTOValidated = z.infer<typeof createContaSchema>;
export type CreateTransacaoDTOValidated = z.infer<typeof createTransacaoSchema>;
export type CreateCategoriaDTOValidated = z.infer<typeof createCategoriaSchema>;
export type CreateInvestimentoDTOValidated = z.infer<typeof createInvestimentoSchema>;
export type CreateHistoricoInvestimentoDTOValidated = z.infer<typeof createHistoricoInvestimentoSchema>;
export type ParseConfigValidated = z.infer<typeof parseConfigSchema>;
export type MapeamentoColunasValidated = z.infer<typeof mapeamentoColunasSchema>;
export type CreateTemplateImportacaoValidated = z.infer<typeof createTemplateImportacaoSchema>;

// ============================================================================
// Validation helpers
// ============================================================================

/**
 * Validates data against a schema and throws detailed error if invalid
 */
export function validateDTO<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    throw new ValidationError(`Validation failed: ${errors.join(', ')}`, errors);
  }

  return result.data;
}
