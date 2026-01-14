import { loadEnv } from '../utils/env.js';

loadEnv();

export interface PolymarketMarket {
  id: string;
  slug?: string;
  question?: string;
  description?: string;
  active?: boolean;
  closed?: boolean;
  endDate?: string;
  startDate?: string;
  outcomes?: string[];
  outcomePrices?: Array<string | number>;
  volumeNum?: number;
  liquidityNum?: number;
  category?: string;
  // Keep unknown fields for future-proofing
  [k: string]: unknown;
}

export interface PolymarketPublicSearchResponse {
  // The API can return events/tags/profiles; keep it flexible.
  markets?: PolymarketMarket[];
  events?: Array<Record<string, unknown>>;
  tags?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length ? s : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function normalizeBaseUrl(raw: string): string {
  const s = (raw || '').trim();
  return (s || 'https://gamma-api.polymarket.com').replace(/\/+$/, '');
}

class PolymarketService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = normalizeBaseUrl(process.env.POLYMARKET_BASE_URL || '');
    this.timeoutMs = clampInt(process.env.POLYMARKET_TIMEOUT_MS, 1000, 60000, 8000);
  }

  enabled(): boolean {
    // Public endpoints; always "enabled".
    return true;
  }

  private async getJson<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = new URL(`${this.baseUrl}${path}`);
      if (query) {
        for (const [k, v] of Object.entries(query)) {
          if (v === undefined) continue;
          url.searchParams.set(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
        }
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      const raw = await res.text();
      if (!res.ok) {
        const snippet = raw.slice(0, 800);
        throw new Error(`Polymarket HTTP ${res.status}: ${snippet || res.statusText}`);
      }
      return raw ? (JSON.parse(raw) as T) : ({} as T);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Busca pública (recomendada) que retorna eventos/tags/perfis.
   * A partir disso, extraímos mercados (quando presentes).
   */
  async publicSearch(input: {
    q: string;
    page?: number;
    limitPerType?: number;
    keepClosedMarkets?: boolean;
    eventsStatus?: string;
    sort?: string;
    ascending?: boolean;
    cache?: boolean;
  }): Promise<PolymarketPublicSearchResponse> {
    const q = (input.q || '').trim();
    if (!q) throw new Error('Polymarket search: q vazio');

    return await this.getJson<PolymarketPublicSearchResponse>('/public-search', {
      q,
      page: input.page,
      limit_per_type: input.limitPerType,
      keep_closed_markets: input.keepClosedMarkets ? 1 : 0,
      events_status: asString(input.eventsStatus),
      sort: asString(input.sort),
      ascending: input.ascending,
      cache: input.cache,
    });
  }

  async getMarketById(id: string): Promise<PolymarketMarket> {
    const mid = (id || '').trim();
    if (!mid) throw new Error('Polymarket getMarketById: id vazio');
    return await this.getJson<PolymarketMarket>(`/markets/${encodeURIComponent(mid)}`);
  }

  async listMarkets(input?: { active?: boolean; closed?: boolean; limit?: number; offset?: number }): Promise<PolymarketMarket[]> {
    const out = await this.getJson<unknown>('/markets', {
      active: input?.active,
      closed: input?.closed,
      limit: input?.limit,
      offset: input?.offset,
    });
    // The endpoint often returns an array.
    if (Array.isArray(out)) return out as PolymarketMarket[];
    // Sometimes wrapped.
    const maybe = (out as any)?.markets;
    if (Array.isArray(maybe)) return maybe as PolymarketMarket[];
    return [];
  }
}

let instance: PolymarketService | null = null;

export function getPolymarketService(): PolymarketService {
  if (!instance) instance = new PolymarketService();
  return instance;
}

export { PolymarketService };

