export interface FlightResult {
  id: string
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  price: number
  currency: string
  airline: string
  stops: number
  duration: number // em minutos
  deepLink?: string
  provider: 'kiwi' | 'serpapi' | 'amadeus'
  fetchedAt: Date
}

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: Date
  returnDate?: Date
  adults?: number
  cabinClass?: 'economy' | 'business' | 'first'
  directOnly?: boolean
  maxStops?: number
}

export interface MonitoredRoute {
  id: string
  chatId: number
  origin: string
  destination: string
  isRoundTrip: boolean
  minStayDays?: number
  maxStayDays?: number
  targetPrice?: number
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface PriceHistory {
  id: string
  routeId: string
  origin: string
  destination: string
  date: string
  price: number
  currency: string
  provider: string
  fetchedAt: Date
}

export interface FlightDeal {
  id: string
  routeId?: string
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  price: number
  previousPrice?: number
  dropPercent?: number
  airline: string
  stops: number
  deepLink?: string
  dealType: 'price_drop' | 'lowest_ever' | 'trend_down' | 'target_reached' | 'good_price' | 'great_price' | 'manual'
  notifiedAt?: Date
  createdAt: Date
}
