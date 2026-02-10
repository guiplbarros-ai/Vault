// Cache de aeroportos brasileiros principais
// TODO: Expandir com API ou dados completos

export interface Airport {
  iata: string
  name: string
  city: string
  country: string
}

const AIRPORTS: Record<string, Airport> = {
  // Brasil - Principais
  GRU: { iata: 'GRU', name: 'Aeroporto de Guarulhos', city: 'Sao Paulo', country: 'BR' },
  CGH: { iata: 'CGH', name: 'Aeroporto de Congonhas', city: 'Sao Paulo', country: 'BR' },
  GIG: { iata: 'GIG', name: 'Aeroporto do Galeao', city: 'Rio de Janeiro', country: 'BR' },
  SDU: { iata: 'SDU', name: 'Santos Dumont', city: 'Rio de Janeiro', country: 'BR' },
  BSB: { iata: 'BSB', name: 'Aeroporto de Brasilia', city: 'Brasilia', country: 'BR' },
  CNF: { iata: 'CNF', name: 'Confins', city: 'Belo Horizonte', country: 'BR' },
  SSA: { iata: 'SSA', name: 'Aeroporto de Salvador', city: 'Salvador', country: 'BR' },
  REC: { iata: 'REC', name: 'Aeroporto do Recife', city: 'Recife', country: 'BR' },
  FOR: { iata: 'FOR', name: 'Aeroporto de Fortaleza', city: 'Fortaleza', country: 'BR' },
  POA: { iata: 'POA', name: 'Salgado Filho', city: 'Porto Alegre', country: 'BR' },
  CWB: { iata: 'CWB', name: 'Afonso Pena', city: 'Curitiba', country: 'BR' },
  FLN: { iata: 'FLN', name: 'Hercilio Luz', city: 'Florianopolis', country: 'BR' },
  NAT: { iata: 'NAT', name: 'Aeroporto de Natal', city: 'Natal', country: 'BR' },
  MAO: { iata: 'MAO', name: 'Eduardo Gomes', city: 'Manaus', country: 'BR' },
  BEL: { iata: 'BEL', name: 'Val de Cans', city: 'Belem', country: 'BR' },
  VCP: { iata: 'VCP', name: 'Viracopos', city: 'Campinas', country: 'BR' },

  // Europa - Principais
  LIS: { iata: 'LIS', name: 'Aeroporto de Lisboa', city: 'Lisboa', country: 'PT' },
  OPO: { iata: 'OPO', name: 'Aeroporto do Porto', city: 'Porto', country: 'PT' },
  MAD: { iata: 'MAD', name: 'Madrid Barajas', city: 'Madrid', country: 'ES' },
  BCN: { iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'ES' },
  CDG: { iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'FR' },
  ORY: { iata: 'ORY', name: 'Orly', city: 'Paris', country: 'FR' },
  FCO: { iata: 'FCO', name: 'Fiumicino', city: 'Roma', country: 'IT' },
  MXP: { iata: 'MXP', name: 'Malpensa', city: 'Milao', country: 'IT' },
  AMS: { iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'NL' },
  LHR: { iata: 'LHR', name: 'Heathrow', city: 'Londres', country: 'GB' },
  LGW: { iata: 'LGW', name: 'Gatwick', city: 'Londres', country: 'GB' },
  FRA: { iata: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'DE' },
  MUC: { iata: 'MUC', name: 'Munich', city: 'Munique', country: 'DE' },
  ZRH: { iata: 'ZRH', name: 'Zurich', city: 'Zurique', country: 'CH' },

  // Americas
  MIA: { iata: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
  JFK: { iata: 'JFK', name: 'John F Kennedy', city: 'New York', country: 'US' },
  EWR: { iata: 'EWR', name: 'Newark', city: 'New York', country: 'US' },
  LAX: { iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
  ORD: { iata: 'ORD', name: 'OHare', city: 'Chicago', country: 'US' },
  ATL: { iata: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'US' },
  DFW: { iata: 'DFW', name: 'Dallas Fort Worth', city: 'Dallas', country: 'US' },
  MCO: { iata: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US' },
  EZE: { iata: 'EZE', name: 'Ezeiza', city: 'Buenos Aires', country: 'AR' },
  SCL: { iata: 'SCL', name: 'Arturo Merino', city: 'Santiago', country: 'CL' },
  BOG: { iata: 'BOG', name: 'El Dorado', city: 'Bogota', country: 'CO' },
  LIM: { iata: 'LIM', name: 'Jorge Chavez', city: 'Lima', country: 'PE' },
  MEX: { iata: 'MEX', name: 'Benito Juarez', city: 'Cidade do Mexico', country: 'MX' },
  CUN: { iata: 'CUN', name: 'Cancun International', city: 'Cancun', country: 'MX' },
  PTY: { iata: 'PTY', name: 'Tocumen', city: 'Panama', country: 'PA' },
  DEN: { iata: 'DEN', name: 'Denver International', city: 'Denver', country: 'US' },
  IAH: { iata: 'IAH', name: 'George Bush', city: 'Houston', country: 'US' },
  SFO: { iata: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US' },
  SEA: { iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'US' },
  BOS: { iata: 'BOS', name: 'Logan International', city: 'Boston', country: 'US' },
  PHX: { iata: 'PHX', name: 'Sky Harbor', city: 'Phoenix', country: 'US' },
  LAS: { iata: 'LAS', name: 'Harry Reid', city: 'Las Vegas', country: 'US' },

  // Asia
  NRT: { iata: 'NRT', name: 'Narita International', city: 'Tóquio', country: 'JP' },
  HND: { iata: 'HND', name: 'Haneda', city: 'Tóquio', country: 'JP' },
  KIX: { iata: 'KIX', name: 'Kansai International', city: 'Osaka', country: 'JP' },
  ICN: { iata: 'ICN', name: 'Incheon International', city: 'Seul', country: 'KR' },
  PEK: { iata: 'PEK', name: 'Beijing Capital', city: 'Pequim', country: 'CN' },
  PVG: { iata: 'PVG', name: 'Pudong International', city: 'Xangai', country: 'CN' },
  HKG: { iata: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK' },
  SIN: { iata: 'SIN', name: 'Changi', city: 'Singapura', country: 'SG' },
  BKK: { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'TH' },
  DXB: { iata: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE' },
  DOH: { iata: 'DOH', name: 'Hamad International', city: 'Doha', country: 'QA' },

  // Oceania
  SYD: { iata: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'AU' },
  MEL: { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU' },
  AKL: { iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ' },
}

export function getAirport(iata: string): Airport | undefined {
  return AIRPORTS[iata.toUpperCase()]
}

export function isValidIata(iata: string): boolean {
  return iata.length === 3 && /^[A-Z]{3}$/i.test(iata)
}

// Mapeamento de códigos de país para nomes
const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brasil',
  US: 'EUA',
  PT: 'Portugal',
  ES: 'Espanha',
  FR: 'França',
  IT: 'Itália',
  NL: 'Holanda',
  GB: 'Reino Unido',
  DE: 'Alemanha',
  CH: 'Suíça',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colômbia',
  PE: 'Peru',
  MX: 'México',
  PA: 'Panamá',
  JP: 'Japão',
  KR: 'Coreia do Sul',
  CN: 'China',
  HK: 'Hong Kong',
  SG: 'Singapura',
  TH: 'Tailândia',
  AE: 'Emirados Árabes',
  QA: 'Catar',
  AU: 'Austrália',
  NZ: 'Nova Zelândia',
}

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

export function formatAirportFull(iata: string): string {
  const airport = getAirport(iata)
  if (!airport) return iata.toUpperCase()
  const country = getCountryName(airport.country)
  return `${airport.city}, ${country} (${airport.iata})`
}

export function formatRoute(origin: string, destination: string): string {
  const o = getAirport(origin)
  const d = getAirport(destination)
  const originStr = o ? `${o.city} (${o.iata})` : origin.toUpperCase()
  const destStr = d ? `${d.city} (${d.iata})` : destination.toUpperCase()
  return `${originStr} → ${destStr}`
}

export function formatRouteFull(origin: string, destination: string): string {
  return `${formatAirportFull(origin)} → ${formatAirportFull(destination)}`
}

export function normalizeIata(iata: string): string {
  return iata.toUpperCase().trim()
}

export function getAllAirports(): Airport[] {
  return Object.values(AIRPORTS)
}

export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase()
  return Object.values(AIRPORTS).filter(
    (a) =>
      a.iata.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  )
}
