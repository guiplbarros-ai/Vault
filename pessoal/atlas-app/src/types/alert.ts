export interface PriceAlert {
  id: string
  chatId: number
  routeId?: string
  origin?: string
  destination?: string
  maxPrice?: number
  minDropPercent?: number // ex: 15 = 15% de queda
  notifyLowestEver: boolean
  notifyTrendDown: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ChatSettings {
  chatId: number
  digestEnabled: boolean
  digestTime?: string // HH:mm
  timezone: string
  language: string
  createdAt: Date
  updatedAt: Date
}

export interface UsageEvent {
  id: string
  provider: string
  endpoint: string
  requestCount: number
  cost?: number
  createdAt: Date
}

export type AlertType = 'price_drop' | 'lowest_ever' | 'trend_down' | 'target_reached' | 'good_price' | 'great_price'

export interface AlertNotification {
  type: AlertType
  route: string
  currentPrice: number
  previousPrice?: number
  dropPercent?: number
  lowestPrice?: number
  message: string
  deepLink?: string
}
