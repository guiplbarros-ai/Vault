/**
 * Utilitários de Data e Hora
 * Agent CORE: Owner
 */

import { format, parse, isValid, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data para exibição
 */
export function formatDate(date: Date | string | number, formatString: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (!isValid(d)) {
    return 'Data inválida';
  }

  return format(d, formatString, { locale: ptBR });
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Formata data no formato ISO (YYYY-MM-DD)
 */
export function formatISO(date: Date | string | number): string {
  return formatDate(date, 'yyyy-MM-dd');
}

/**
 * Formata mês/ano (ex: Janeiro/2025)
 */
export function formatMonthYear(date: Date | string | number): string {
  return formatDate(date, 'MMMM/yyyy');
}

/**
 * Formata mês/ano curto (ex: Jan/25)
 */
export function formatMonthYearShort(date: Date | string | number): string {
  return formatDate(date, 'MMM/yy');
}

/**
 * Retorna o mês de referência no formato YYYY-MM
 */
export function getMonthReference(date: Date | string | number): string {
  return formatDate(date, 'yyyy-MM');
}

/**
 * Parse de data de string para Date
 * Suporta múltiplos formatos: DD/MM/YYYY, YYYY-MM-DD, etc
 */
export function parseDate(dateString: string, formatString: string = 'dd/MM/yyyy'): Date | null {
  try {
    const parsed = parse(dateString, formatString, new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Parse de data com múltiplos formatos
 * Tenta vários formatos comuns até encontrar um válido
 */
export function parseDateMultiFormat(dateString: string): Date | null {
  const formats = [
    'dd/MM/yyyy',
    'dd/MM/yy',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd-MM-yyyy',
    'MM/dd/yyyy',
    'dd.MM.yyyy',
  ];

  for (const format of formats) {
    const parsed = parseDate(dateString, format);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Retorna o primeiro dia do mês
 */
export function getMonthStart(date: Date | string | number = new Date()): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return startOfMonth(d);
}

/**
 * Retorna o último dia do mês
 */
export function getMonthEnd(date: Date | string | number = new Date()): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return endOfMonth(d);
}

/**
 * Retorna a data N meses atrás
 */
export function getMonthsAgo(months: number, from: Date = new Date()): Date {
  return subMonths(from, months);
}

/**
 * Retorna a data N meses à frente
 */
export function getMonthsAhead(months: number, from: Date = new Date()): Date {
  return addMonths(from, months);
}

/**
 * Retorna o número de dias entre duas datas
 */
export function daysBetween(start: Date | string | number, end: Date | string | number): number {
  const d1 = typeof start === 'string' || typeof start === 'number' ? new Date(start) : start;
  const d2 = typeof end === 'string' || typeof end === 'number' ? new Date(end) : end;

  return differenceInDays(d2, d1);
}

/**
 * Verifica se uma data está dentro de um intervalo
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Retorna a data de hoje às 00:00:00
 */
export function getToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Retorna array de meses para um período
 * Ex: getMonthsInRange('2024-01', '2024-03') => ['2024-01', '2024-02', '2024-03']
 */
export function getMonthsInRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let current = parse(startMonth + '-01', 'yyyy-MM-dd', new Date());
  const end = parse(endMonth + '-01', 'yyyy-MM-dd', new Date());

  while (current <= end) {
    months.push(getMonthReference(current));
    current = addMonths(current, 1);
  }

  return months;
}

/**
 * Retorna o mês atual no formato YYYY-MM
 */
export function getCurrentMonth(): string {
  return getMonthReference(new Date());
}

/**
 * Retorna o mês anterior no formato YYYY-MM
 */
export function getPreviousMonth(): string {
  return getMonthReference(getMonthsAgo(1));
}

/**
 * Formata duração em dias (ex: "3 dias atrás", "em 5 dias")
 */
export function formatDaysAgo(days: number): string {
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days === -1) return 'amanhã';
  if (days > 0) return `${days} dias atrás`;
  return `em ${Math.abs(days)} dias`;
}

/**
 * Calcula a data de fechamento de fatura baseado no dia de fechamento
 */
export function calcularDataFechamento(diaFechamento: number, mesReferencia: string): Date {
  const [ano, mes] = mesReferencia.split('-').map(Number);
  const data = new Date(ano, mes - 1, diaFechamento);
  return data;
}

/**
 * Calcula a data de vencimento baseado no dia de vencimento
 */
export function calcularDataVencimento(diaVencimento: number, dataFechamento: Date): Date {
  let data = new Date(dataFechamento);
  data.setDate(diaVencimento);

  // Se o vencimento é antes do fechamento, é no mês seguinte
  if (diaVencimento < dataFechamento.getDate()) {
    data = addMonths(data, 1);
  }

  return data;
}

/**
 * Retorna o período do ciclo da fatura baseado no dia de fechamento
 */
export function calcularCicloFatura(diaFechamento: number, mesReferencia: string): {
  inicio: Date;
  fim: Date;
} {
  const dataFechamento = calcularDataFechamento(diaFechamento, mesReferencia);
  const dataInicio = new Date(dataFechamento);
  dataInicio.setMonth(dataInicio.getMonth() - 1);
  dataInicio.setDate(dataInicio.getDate() + 1);

  return {
    inicio: dataInicio,
    fim: dataFechamento,
  };
}
