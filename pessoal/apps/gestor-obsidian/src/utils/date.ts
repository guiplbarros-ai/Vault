import { format, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function getFormattedDate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function getFormattedTime(date: Date = new Date()): string {
  return format(date, 'HHmm')
}

export function getFormattedDateTime(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd HH:mm')
}

/**
 * Retorna data curta pt-BR no formato "11/dez"
 */
export function getDayMonthShortPtBR(date: Date = new Date()): string {
  // date-fns em ptBR pode retornar "dez." (com ponto) dependendo da versão/locale
  return format(date, 'dd/MMM', { locale: ptBR }).replace('.', '').toLowerCase()
}

/**
 * Quantos dias tem o mês da data informada
 */
export function getDaysInCurrentMonth(date: Date = new Date()): number {
  return getDaysInMonth(date)
}

export function getTimestampHeader(date: Date = new Date()): string {
  return `## Registro - ${getFormattedDateTime(date)}`
}
