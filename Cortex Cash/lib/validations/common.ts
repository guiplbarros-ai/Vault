import { z } from 'zod'

// Common field validations
export const emailSchema = z.string().email('Email inválido')

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Número de telefone inválido')
  .optional()

export const currencySchema = z
  .number()
  .or(z.string().transform((val) => parseFloat(val.replace(/[^\d.-]/g, ''))))
  .refine((val) => !isNaN(val as number), {
    message: 'Valor inválido',
  })
  .transform((val) => (isNaN(val as number) ? 0 : Number(val)))

export const percentageSchema = z
  .number()
  .or(z.string().transform((val) => parseFloat(val)))
  .refine((val) => !isNaN(val as number) && val >= 0 && val <= 100, {
    message: 'Percentual deve estar entre 0 e 100',
  })

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => (typeof val === 'string' ? new Date(val) : val))
  .refine((date) => date instanceof Date && !isNaN(date.getTime()), {
    message: 'Data inválida',
  })

export const urlSchema = z.string().url('URL inválida').optional()

export const slugSchema = z
  .string()
  .min(1, 'Slug é obrigatório')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minúsculas, números e hífens')

// Common validation helpers
export const optionalString = z.string().optional().or(z.literal(''))
export const requiredString = z.string().min(1, 'Campo obrigatório')
export const optionalNumber = z.number().optional().or(z.literal(0))
export const requiredNumber = z.number().min(0, 'Valor deve ser positivo')
