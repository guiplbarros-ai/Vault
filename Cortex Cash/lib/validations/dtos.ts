/**
 * Validation schemas for DTOs
 * Agent CORE: Implementador
 *
 * Zod schemas for runtime validation of Data Transfer Objects
 */

import { z } from 'zod';

// ============================================================================
// Enum schemas (for tipo validation)
// ============================================================================

export const tipoTransacaoSchema = z.enum(['receita', 'despesa', 'transferencia']);
export const tipoContaSchema = z.enum(['corrente', 'poupanca', 'investimento', 'carteira']);

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
  instituicao_id: z.string().uuid('ID de instituição inválido'),
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
  conta_id: z.string().uuid('ID de conta inválido'),
  categoria_id: z.string().uuid('ID de categoria inválido').optional(),
  data: z.union([z.date(), z.string().datetime('Data inválida')]),
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

// ============================================================================
// Type exports (inferred from schemas)
// ============================================================================

export type CreateInstituicaoDTOValidated = z.infer<typeof createInstituicaoSchema>;
export type CreateContaDTOValidated = z.infer<typeof createContaSchema>;
export type CreateTransacaoDTOValidated = z.infer<typeof createTransacaoSchema>;
export type CreateCategoriaDTOValidated = z.infer<typeof createCategoriaSchema>;

// ============================================================================
// Validation helpers
// ============================================================================

/**
 * Validates data against a schema and throws detailed error if invalid
 */
export function validateDTO<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}
