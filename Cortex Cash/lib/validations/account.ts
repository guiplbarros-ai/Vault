import { z } from 'zod'
import { currencySchema, requiredString } from './common'

export const accountSchema = z.object({
  name: requiredString,
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'cash'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  balance: currencySchema,
  currency: z.string().length(3, 'Código de moeda deve ter 3 caracteres').default('BRL'),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal').optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

export const accountTransferSchema = z.object({
  fromAccountId: requiredString,
  toAccountId: requiredString,
  amount: currencySchema,
  date: z.date().or(z.string().transform((val) => new Date(val))),
  description: z.string().optional(),
  fee: currencySchema.optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: 'Contas de origem e destino devem ser diferentes',
  path: ['toAccountId'],
})

export type AccountFormData = z.infer<typeof accountSchema>
export type AccountTransferFormData = z.infer<typeof accountTransferSchema>
