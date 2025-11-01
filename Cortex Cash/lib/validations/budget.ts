import { z } from 'zod'
import { currencySchema, requiredString } from './common'

/**
 * Schema de orçamento mensal por categoria ou centro de custo
 * Alinhado com OrcamentoService
 */
export const orcamentoSchema = z.object({
  nome: requiredString.max(100, 'Nome deve ter no máximo 100 caracteres'),
  tipo: z.enum(['categoria', 'centro_custo'], {
    required_error: 'Tipo de orçamento é obrigatório',
  }),
  categoria_id: z.string().optional(),
  centro_custo_id: z.string().optional(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM (ex: 2025-11)'),
  valor_planejado: currencySchema.refine(val => val > 0, 'Valor deve ser maior que zero'),
  alerta_80: z.boolean().optional().default(true),
  alerta_100: z.boolean().optional().default(true),
}).refine(
  (data) => {
    // Se tipo é categoria, categoria_id é obrigatório
    if (data.tipo === 'categoria') {
      return !!data.categoria_id;
    }
    return true;
  },
  {
    message: 'Categoria é obrigatória quando tipo é "Categoria"',
    path: ['categoria_id'],
  }
).refine(
  (data) => {
    // Se tipo é centro_custo, centro_custo_id é obrigatório
    if (data.tipo === 'centro_custo') {
      return !!data.centro_custo_id;
    }
    return true;
  },
  {
    message: 'Centro de custo é obrigatório quando tipo é "Centro de Custo"',
    path: ['centro_custo_id'],
  }
);

export type OrcamentoFormData = z.infer<typeof orcamentoSchema>

// ============================================================================
// Schemas legados (manter para compatibilidade)
// ============================================================================

export const budgetSchema = z.object({
  name: requiredString,
  categoryId: requiredString,
  amount: currencySchema,
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], {
    required_error: 'Período é obrigatório',
  }),
  startDate: z.date().or(z.string().transform((val) => new Date(val))),
  endDate: z.date().or(z.string().transform((val) => new Date(val))).optional(),
  alertThreshold: z.number().min(0).max(100).optional().default(80),
  rollover: z.boolean().optional().default(false),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
}).refine((data) => !data.endDate || data.endDate > data.startDate, {
  message: 'Data final deve ser posterior à data inicial',
  path: ['endDate'],
})

export const budgetTemplateSchema = z.object({
  name: requiredString,
  description: z.string().optional(),
  categories: z.array(z.object({
    categoryId: requiredString,
    amount: currencySchema,
    percentage: z.number().min(0).max(100).optional(),
  })).min(1, 'Pelo menos uma categoria é necessária'),
})

export type BudgetFormData = z.infer<typeof budgetSchema>
export type BudgetTemplateFormData = z.infer<typeof budgetTemplateSchema>
