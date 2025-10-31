/**
 * Constantes para bandeiras de cartão de crédito
 */

export const BANDEIRAS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
} as const;

export const BANDEIRA_OPTIONS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
] as const;

export const BANDEIRA_COLORS = {
  visa: '#1A1F71',
  mastercard: '#EB001B',
  elo: '#FFCB05',
  amex: '#006FCF',
} as const;

export const STATUS_FATURA = {
  aberta: 'Aberta',
  fechada: 'Fechada',
  paga: 'Paga',
  atrasada: 'Atrasada',
} as const;

export const STATUS_FATURA_OPTIONS = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'fechada', label: 'Fechada' },
  { value: 'paga', label: 'Paga' },
  { value: 'atrasada', label: 'Atrasada' },
] as const;

export const STATUS_FATURA_COLORS = {
  aberta: '#3B82F6', // blue
  fechada: '#F59E0B', // amber
  paga: '#10B981', // green
  atrasada: '#EF4444', // red
} as const;

export type BandeiraType = keyof typeof BANDEIRAS;
export type StatusFaturaType = keyof typeof STATUS_FATURA;

