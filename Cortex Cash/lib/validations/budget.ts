import { z } from 'zod'
import { currencySchema, requiredString, percentageSchema } from './common'

export const budgetSchema = z.object({
  name: requiredString,
  categoryId: requiredString,
  amount: currencySchema,
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], {
    required_error: 'Período é obrigatório',
  }),
  startDate: z.date().or(z.string().transform((val) => new Date(val))),
  endDate: z.date().or(z.string().transform((val) => new Date(val))).optional(),
  alertThreshold: percentageSchema.optional().default(80),
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
    percentage: percentageSchema.optional(),
  })).min(1, 'Pelo menos uma categoria é necessária'),
})

export type BudgetFormData = z.infer<typeof budgetSchema>
export type BudgetTemplateFormData = z.infer<typeof budgetTemplateSchema>
