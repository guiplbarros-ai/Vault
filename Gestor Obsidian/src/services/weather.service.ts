import { loadEnv } from '../utils/env.js';
import { logger } from '../utils/logger.js';

loadEnv();

type Units = 'metric' | 'imperial';

// NOTE: User-provided free key; explicitly allowed to hardcode for now.
const DEFAULT_TOMORROW_API_KEY = 'OVqZf9d7TQnaStDKF6EDQNr3erZlTvb5';

export interface WeatherDaily {
  time: Date;
  weatherCode?: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  precipitationProbabilityAvg?: number;
  uvIndexMax?: number;
  sunriseTime?: Date;
  sunsetTime?: Date;
}

export interface WeatherHourly {
  time: Date;
  weatherCode?: number;
  temperatureC?: number;
  precipitationProbability?: number;
  windSpeedKmh?: number;
  uvIndex?: number;
}

export interface WeatherForecast {
  requestedLocation: string;
  resolvedName?: string;
  lat?: number;
  lon?: number;
  daily: WeatherDaily[];
  hourly: WeatherHourly[];
}

interface TomorrowTimelinePoint {
  time: string;
  values: Record<string, unknown>;
}

interface TomorrowForecastResponse {
  timelines?: {
    hourly?: TomorrowTimelinePoint[];
    daily?: TomorrowTimelinePoint[];
  };
  location?: {
    lat?: number;
    lon?: number;
    name?: string;
  };
}

export function weatherCodeToPt(code?: number): string {
  if (code === undefined || code === null) return 'Tempo';
  // Tomorrow.io Weather Codes (subset)
  const map: Record<number, string> = {
    0: 'Desconhecido',
    1000: 'Céu limpo',
    1100: 'Poucas nuvens',
    1101: 'Parcialmente nublado',
    1102: 'Nublado',
    1001: 'Encoberto',
    2000: 'Neblina',
    2100: 'Névoa leve',
    4000: 'Garoa',
    4001: 'Chuva',
    4200: 'Chuva fraca',
    4201: 'Chuva forte',
    5000: 'Neve',
    5100: 'Neve fraca',
    5101: 'Neve forte',
    6000: 'Garoa congelante',
    6001: 'Chuva congelante',
    6200: 'Chuva congelante fraca',
    6201: 'Chuva congelante forte',
    7000: 'Granizo',
    7101: 'Granizo forte',
    7102: 'Granizo fraco',
    8000: 'Trovoadas',
  };
  return map[code] || `Tempo (código ${code})`;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function dt(v: unknown): Date | undefined {
  if (typeof v !== 'string') return undefined;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

function clampPct(v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  return Math.max(0, Math.min(100, v));
}

class WeatherService {
  private cache = new Map<string, { ts: number; data: WeatherForecast }>();

  enabled(): boolean {
    return ((process.env.TOMORROW_API_KEY || '').trim().length > 0) || DEFAULT_TOMORROW_API_KEY.length > 0;
  }

  private apiKey(): string {
    const k = (process.env.TOMORROW_API_KEY || '').trim();
    return k || DEFAULT_TOMORROW_API_KEY;
  }

  defaultLocation(): string {
    // Default: Belo Horizonte, MG (user locale). Can be overridden per-chat via WeatherPrefsService
    // and globally via TOMORROW_LOCATION env var.
    return (process.env.TOMORROW_LOCATION || '-19.922753,-43.945158').trim();
  }

  defaultUnits(): Units {
    const raw = (process.env.TOMORROW_UNITS || 'metric').trim().toLowerCase();
    return raw === 'imperial' ? 'imperial' : 'metric';
  }

  async getForecast(input?: { location?: string; units?: Units; cacheTtlMs?: number }): Promise<WeatherForecast> {
    const location = (input?.location || this.defaultLocation()).trim();
    const units = input?.units || this.defaultUnits();
    const ttl = Number.isFinite(Number(input?.cacheTtlMs)) ? Number(input?.cacheTtlMs) : 10 * 60 * 1000;
    const cacheKey = `${location}::${units}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ttl) return cached.data;

    const url = new URL('https://api.tomorrow.io/v4/weather/forecast');
    url.searchParams.set('location', location);
    url.searchParams.set('apikey', this.apiKey());
    url.searchParams.set('units', units);
    // Keep response light and stable
    url.searchParams.set('timesteps', '1h,1d');
    url.searchParams.set(
      'fields',
      [
        // hourly
        'temperature',
        'weatherCode',
        'precipitationProbability',
        'windSpeed',
        'uvIndex',
        // daily
        'temperatureMin',
        'temperatureMax',
        'precipitationProbabilityAvg',
        'weatherCodeMax',
        'uvIndexMax',
        'sunriseTime',
        'sunsetTime',
      ].join(','),
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url.toString(), { method: 'GET', signal: controller.signal });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Tomorrow.io error: ${res.status} - ${(text || res.statusText).slice(0, 250)}`);
      }

      const parsed = (text ? JSON.parse(text) : {}) as TomorrowForecastResponse;
      const dailyRaw = parsed.timelines?.daily || [];
      const hourlyRaw = parsed.timelines?.hourly || [];

      const daily: WeatherDaily[] = dailyRaw
        .map((p) => {
          const when = dt(p.time);
          if (!when) return null;
          const v = p.values || {};
          return {
            time: when,
            weatherCode: num(v.weatherCodeMax ?? v.weatherCode),
            temperatureMinC: num(v.temperatureMin),
            temperatureMaxC: num(v.temperatureMax),
            precipitationProbabilityAvg: clampPct(num(v.precipitationProbabilityAvg)),
            uvIndexMax: num(v.uvIndexMax ?? v.uvIndex),
            sunriseTime: dt(v.sunriseTime),
            sunsetTime: dt(v.sunsetTime),
          } satisfies WeatherDaily;
        })
        .filter(Boolean) as WeatherDaily[];

      const hourly: WeatherHourly[] = hourlyRaw
        .map((p) => {
          const when = dt(p.time);
          if (!when) return null;
          const v = p.values || {};
          return {
            time: when,
            weatherCode: num(v.weatherCode),
            temperatureC: num(v.temperature),
            precipitationProbability: clampPct(num(v.precipitationProbability)),
            windSpeedKmh: num(v.windSpeed),
            uvIndex: num(v.uvIndex),
          } satisfies WeatherHourly;
        })
        .filter(Boolean) as WeatherHourly[];

      const data: WeatherForecast = {
        requestedLocation: location,
        resolvedName: (parsed.location?.name || '').trim() || undefined,
        lat: num(parsed.location?.lat),
        lon: num(parsed.location?.lon),
        daily,
        hourly,
      };

      this.cache.set(cacheKey, { ts: Date.now(), data });
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(`WeatherService error: ${msg}`);
      throw e instanceof Error ? e : new Error(msg);
    } finally {
      clearTimeout(timeout);
    }
  }
}

let instance: WeatherService | null = null;

export function getWeatherService(): WeatherService {
  if (!instance) instance = new WeatherService();
  return instance;
}

export { WeatherService };

