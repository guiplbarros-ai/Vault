/**
 * Configuração de Moedas e Taxas de Câmbio
 * Agent CORE: Owner
 *
 * Centraliza taxas de câmbio para evitar valores hardcoded duplicados
 */

/**
 * Taxa de câmbio BRL/USD
 *
 * IMPORTANTE: Este é um valor aproximado para cálculos locais.
 * Para aplicações em produção, considere usar uma API de câmbio:
 * - https://docs.awesomeapi.com.br/api-de-moedas
 * - https://exchangeratesapi.io/
 *
 * Última atualização: 2025-01-05
 */
export const USD_TO_BRL = 6.0;

/**
 * Converte USD para BRL
 */
export function usdToBrl(usd: number): number {
  return usd * USD_TO_BRL;
}

/**
 * Converte BRL para USD
 */
export function brlToUsd(brl: number): number {
  return brl / USD_TO_BRL;
}

/**
 * Formata valor em USD
 */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Formata valor em BRL
 */
export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
