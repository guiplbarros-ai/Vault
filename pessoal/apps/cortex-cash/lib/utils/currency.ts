/**
 * Arredonda um valor para 2 casas decimais (centavos).
 * Usa Math.round para evitar erros de ponto flutuante em agregações financeiras.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

const FALLBACK_USD_BRL = 6.0
let cachedRate: { value: number; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Fetches the current USD→BRL exchange rate.
 * Uses AwesomeAPI (free, no key required) with 1h cache + fallback.
 */
export async function getUsdBrlRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
    return cachedRate.value
  }

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = Number.parseFloat(data.USDBRL?.bid)
    if (Number.isNaN(rate) || rate <= 0) throw new Error('Invalid rate')

    cachedRate = { value: rate, fetchedAt: Date.now() }
    return rate
  } catch {
    return cachedRate?.value ?? FALLBACK_USD_BRL
  }
}
