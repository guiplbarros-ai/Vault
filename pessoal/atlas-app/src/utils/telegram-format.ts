/**
 * Telegram message formatting helpers
 */

/** Remove citation markers like [1], [2] from Perplexity output */
export function stripCitations(text: string): string {
  return text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim()
}

/** Format price in BRL without decimals: 4200 → "4.200" */
export function fmtPrice(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Horizontal rule for Telegram messages */
export const HR = '─'.repeat(24)
