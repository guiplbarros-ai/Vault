import { z } from 'zod'
import { currencySchema, dateSchema, requiredString } from './common'

export const transactionSchema = z.object({
  description: requiredString,
  amount: currencySchema,
  date: dateSchema,
  categoryId: requiredString,
  accountId: requiredString,
  type: z.enum(['income', 'expense'], {
    required_error: 'Tipo de transação é obrigatório',
  }),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurring: z.boolean().optional().default(false),
  recurringPeriod: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
})

export const bulkTransactionSchema = z.object({
  transactions: z.array(transactionSchema).min(1, 'Pelo menos uma transação é necessária'),
  validateBeforeImport: z.boolean().optional().default(true),
})

export const transactionFilterSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  minAmount: currencySchema.optional(),
  maxAmount: currencySchema.optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type TransactionFormData = z.infer<typeof transactionSchema>
export type BulkTransactionFormData = z.infer<typeof bulkTransactionSchema>
export type TransactionFilterData = z.infer<typeof transactionFilterSchema>
