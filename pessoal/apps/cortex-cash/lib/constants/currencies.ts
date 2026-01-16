export interface Currency {
  code: string
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Record<string, Currency> = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro',
    locale: 'pt-BR',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Americano',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Libra Esterlina',
    locale: 'en-GB',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Iene Japonês',
    locale: 'ja-JP',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Dólar Australiano',
    locale: 'en-AU',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Dólar Canadense',
    locale: 'en-CA',
  },
  CHF: {
    code: 'CHF',
    symbol: 'Fr',
    name: 'Franco Suíço',
    locale: 'de-CH',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Yuan Chinês',
    locale: 'zh-CN',
  },
  ARS: {
    code: 'ARS',
    symbol: '$',
    name: 'Peso Argentino',
    locale: 'es-AR',
  },
} as const

export const DEFAULT_CURRENCY = 'BRL'

export const CURRENCY_OPTIONS = Object.values(CURRENCIES).map((currency) => ({
  value: currency.code,
  label: `${currency.symbol} ${currency.name} (${currency.code})`,
}))

export const getCurrency = (code: string): Currency => {
  return CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY]
}
