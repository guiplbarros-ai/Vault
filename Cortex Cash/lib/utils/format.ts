/**
 * Utilitários de Formatação
 * Agent CORE: Owner
 */

import { getSetting } from '../services/settings.service';

/**
 * Formata valor monetário em Real (R$)
 */
export function formatCurrency(value: number, options?: { showSign?: boolean; compact?: boolean; hideDecimals?: boolean }): string {
  const { showSign = false, compact = false } = options || {};

  // Obtém configuração global de ocultar decimais
  let hideDecimals = options?.hideDecimals;
  if (hideDecimals === undefined && typeof window !== 'undefined') {
    try {
      hideDecimals = getSetting<boolean>('localization.hideDecimals');
    } catch {
      hideDecimals = false;
    }
  }

  const fractionDigits = hideDecimals ? 0 : 2;

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    notation: compact ? 'compact' : 'standard',
  }).format(Math.abs(value));

  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
}

/**
 * Formata número como porcentagem
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata número com separadores de milhar
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Parse de valor monetário (ex: "R$ 1.234,56" -> 1234.56)
 */
export function parseCurrency(value: string): number {
  // Remove tudo exceto números, vírgula e hífen
  const cleaned = value.replace(/[^\d,\-]/g, '');

  // Substitui vírgula por ponto
  const normalized = cleaned.replace(',', '.');

  // Parse para número
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normaliza valor de string para número
 * Suporta vírgula e ponto como separador decimal
 */
export function normalizeValue(value: string, decimalSeparator: string = ','): number {
  // Remove espaços
  let cleaned = value.trim();

  // Se o separador decimal é vírgula, troca por ponto
  if (decimalSeparator === ',') {
    // Remove pontos (separadores de milhar)
    cleaned = cleaned.replace(/\./g, '');
    // Troca vírgula por ponto
    cleaned = cleaned.replace(',', '.');
  } else {
    // Remove vírgulas (separadores de milhar)
    cleaned = cleaned.replace(/,/g, '');
  }

  // Parse para número
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata número de conta bancária (ex: "12345-6")
 */
export function formatAccountNumber(account: string, digit?: string): string {
  if (digit) {
    return `${account}-${digit}`;
  }
  return account;
}

/**
 * Formata agência bancária (ex: "1234")
 */
export function formatAgency(agency: string, digit?: string): string {
  if (digit) {
    return `${agency}-${digit}`;
  }
  return agency;
}

/**
 * Mascara número de cartão (ex: "**** **** **** 1234")
 */
export function maskCardNumber(cardNumber: string): string {
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Formata CNPJ (ex: "12.345.678/0001-90")
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF (ex: "123.456.789-00")
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Trunca texto com ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitaliza primeira letra de cada palavra
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formata texto de descrição de transação
 * Remove caracteres especiais e normaliza espaços
 */
export function normalizeDescription(description: string): string {
  return description
    .trim()
    .replace(/\s+/g, ' ') // Remove espaços extras
    .replace(/[^\w\s\-.,]/gi, ''); // Remove caracteres especiais
}

/**
 * Gera hash SHA256 para string
 * Usado para dedupe de transações
 */
export async function generateHash(input: string): Promise<string> {
  // No navegador, usa Web Crypto API
  if (typeof window !== 'undefined' && window.crypto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // Fallback para Node.js (usado em testes)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Formata tamanho de arquivo (ex: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formata cor em hexadecimal
 */
export function formatColor(color: string): string {
  if (color.startsWith('#')) return color;
  return `#${color}`;
}

/**
 * Extrai iniciais de um nome (ex: "João Silva" -> "JS")
 */
export function getInitials(name: string, maxLength: number = 2): string {
  const words = name.trim().split(' ').filter(Boolean);
  const initials = words.map((word) => word[0].toUpperCase()).join('');
  return initials.slice(0, maxLength);
}

/**
 * Formata número de parcelas (ex: "1/12")
 */
export function formatInstallment(current: number, total: number): string {
  return `${current}/${total}`;
}

/**
 * Converte string para slug (URL-friendly)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}

/**
 * Formata lista de tags como string
 */
export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

/**
 * Parse de tags de string para array
 */
export function parseTags(tagsString: string): string[] {
  if (!tagsString) return [];

  try {
    // Tenta parsear como JSON
    const parsed = JSON.parse(tagsString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback: split por vírgula
    return tagsString.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}

/**
 * Formata status de fatura
 */
export function formatFaturaStatus(status: string): string {
  const statusMap: Record<string, string> = {
    aberta: 'Aberta',
    fechada: 'Fechada',
    paga: 'Paga',
    atrasada: 'Atrasada',
  };

  return statusMap[status] || status;
}

/**
 * Retorna cor baseada no valor (positivo = verde, negativo = vermelho)
 */
export function getValueColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

/**
 * Retorna cor baseada no status do orçamento
 */
export function getBudgetStatusColor(percentual: number): string {
  if (percentual >= 100) return 'text-red-600 dark:text-red-400';
  if (percentual >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

/**
 * Formata data em formato brasileiro (DD/MM/AAAA)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Data inválida';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formata data com hora (DD/MM/AAAA HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Data inválida';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
