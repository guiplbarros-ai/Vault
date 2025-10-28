import { z } from 'zod'
import { requiredString, slugSchema } from './common'

export const categorySchema = z.object({
  name: requiredString,
  slug: slugSchema,
  type: z.enum(['income', 'expense'], {
    required_error: 'Tipo de categoria é obrigatório',
  }),
  parentId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal').optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  budget: z.number().optional(),
})

export const categoryTreeSchema: z.ZodType<any> = z.object({
  ...categorySchema.shape,
  children: z.lazy(() => z.array(categoryTreeSchema)).optional(),
})

export type CategoryFormData = z.infer<typeof categorySchema>
export type CategoryTreeData = z.infer<typeof categoryTreeSchema>
