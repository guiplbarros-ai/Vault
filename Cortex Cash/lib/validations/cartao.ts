import { z } from 'zod';
import { currencySchema, requiredString } from './common';

/**
 * Schema para criação/edição de Cartão de Crédito
 */
export const cartaoSchema = z.object({
  nome: requiredString.max(100, 'Nome deve ter no máximo 100 caracteres'),
  instituicao_id: requiredString,
  conta_pagamento_id: z.string().optional(),
  ultimos_digitos: z
    .string()
    .regex(/^\d{4}$/, 'Últimos dígitos devem conter 4 números')
    .optional(),
  bandeira: z.enum(['visa', 'mastercard', 'elo', 'amex'], {
    errorMap: () => ({ message: 'Bandeira inválida' }),
  }).optional(),
  limite_total: currencySchema,
  dia_fechamento: z
    .number()
    .int('Dia deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31'),
  dia_vencimento: z
    .number()
    .int('Dia deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31'),
  ativo: z.boolean().default(true),
  cor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal (#RRGGBB)')
    .optional(),
});

/**
 * Schema para criação de Fatura
 */
export const faturaSchema = z.object({
  cartao_id: requiredString,
  mes_referencia: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM')
    .refine(
      (val) => {
        const [year, month] = val.split('-').map(Number);
        return month >= 1 && month <= 12 && year >= 2000 && year <= 2100;
      },
      { message: 'Mês de referência inválido' }
    ),
  data_fechamento: z.date().or(z.string().transform((val) => new Date(val))),
  data_vencimento: z.date().or(z.string().transform((val) => new Date(val))),
  valor_total: currencySchema.default(0),
  valor_minimo: currencySchema.default(0),
  valor_pago: currencySchema.default(0),
  status: z.enum(['aberta', 'fechada', 'paga', 'atrasada']).default('aberta'),
  fechada_automaticamente: z.boolean().default(false),
  data_pagamento: z
    .date()
    .or(z.string().transform((val) => new Date(val)))
    .optional(),
  transacao_pagamento_id: z.string().optional(),
});

/**
 * Schema para criação de Lançamento de Fatura
 */
export const faturaLancamentoSchema = z.object({
  fatura_id: requiredString,
  transacao_id: z.string().optional(),
  data_compra: z.date().or(z.string().transform((val) => new Date(val))),
  descricao: requiredString.max(200, 'Descrição deve ter no máximo 200 caracteres'),
  valor_brl: currencySchema,
  parcela_numero: z
    .number()
    .int('Parcela deve ser um número inteiro')
    .min(1, 'Parcela deve ser maior que 0')
    .optional(),
  parcela_total: z
    .number()
    .int('Total de parcelas deve ser um número inteiro')
    .min(1, 'Total de parcelas deve ser maior que 0')
    .optional(),
  moeda_original: z
    .string()
    .length(3, 'Código de moeda deve ter 3 caracteres')
    .optional(),
  valor_original: z.number().optional(),
  taxa_cambio: z.number().positive('Taxa de câmbio deve ser positiva').optional(),
  categoria_id: z.string().optional(),
}).refine(
  (data) => {
    // Se tem parcela_numero, deve ter parcela_total e vice-versa
    if (data.parcela_numero && !data.parcela_total) return false;
    if (data.parcela_total && !data.parcela_numero) return false;
    // Se tem parcela_numero, deve ser menor ou igual a parcela_total
    if (data.parcela_numero && data.parcela_total) {
      return data.parcela_numero <= data.parcela_total;
    }
    return true;
  },
  {
    message: 'Dados de parcelamento inválidos',
    path: ['parcela_numero'],
  }
);

/**
 * Schema para pagamento de fatura
 */
export const pagarFaturaSchema = z.object({
  fatura_id: requiredString,
  conta_pagamento_id: requiredString,
  valor_pago: currencySchema,
  data_pagamento: z.date().or(z.string().transform((val) => new Date(val))),
  observacoes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
});

/**
 * Types inferidos dos schemas
 */
export type CartaoFormData = z.infer<typeof cartaoSchema>;
export type FaturaFormData = z.infer<typeof faturaSchema>;
export type FaturaLancamentoFormData = z.infer<typeof faturaLancamentoSchema>;
export type PagarFaturaFormData = z.infer<typeof pagarFaturaSchema>;

