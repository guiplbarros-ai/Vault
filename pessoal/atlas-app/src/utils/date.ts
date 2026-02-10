import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export function getTimezone(): string {
  return process.env.ATLAS_TIMEZONE || DEFAULT_TIMEZONE
}

export function now(): Date {
  return new Date()
}

export function toLocalTime(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(d, getTimezone())
}

export function formatDate(date: Date | string): string {
  const d = toLocalTime(date)
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: Date | string): string {
  const d = toLocalTime(date)
  return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

export function getFormattedDateTime(): string {
  return formatDateTime(now())
}

export function formatFlightDate(date: Date | string): string {
  const d = toLocalTime(date)
  return format(d, "dd/MM (EEE)", { locale: ptBR })
}

export function parseDateInput(input: string): Date | null {
  // Aceita formatos: dd/mm, dd/mm/yyyy, dd-mm, dd-mm-yyyy
  const normalized = input.replace(/-/g, '/')
  const parts = normalized.split('/')

  if (parts.length < 2) return null

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear()

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31 || month < 0 || month > 11) return null

  return new Date(year, month, day)
}
