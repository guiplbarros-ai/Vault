import Parser from 'rss-parser'
import { loadEnv } from '../utils/env.js'
import { getNotesDbService } from './notes-db.service.js'

loadEnv()

export type NewsTopic = 'general' | 'finance' | 'sports' | 'hn'

export interface NewsItem {
  topic: NewsTopic
  title: string
  url: string
  source: string
  publishedAt: string | null
  summary: string | null
  raw?: Record<string, unknown>
}

function truthyEnv(name: string, defaultValue = '1'): boolean {
  const v = (process.env[name] ?? defaultValue).toString().trim().toLowerCase()
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '')
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function splitList(v: string | undefined): string[] {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function stripHtml(raw: string): string {
  return (raw || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ellipsize(s: string, max: number): string {
  const t = (s || '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractNumbersForMarkets(text: string): string[] {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (!t) return []

  const matches: string[] = []
  const patterns: RegExp[] = [
    /\bR\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})\b/g, // R$ 4,95
    /[+\-]?\d{1,2}(?:[.,]\d{1,2})?\s?%/g, // -0,8%
    /\b\d{2,3}(?:\.\d{3})+\b/g, // 128.450 (pontos)
    /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})\b/g, // 4,95 (fallback)
  ]

  for (const re of patterns) {
    const m = t.match(re)
    if (!m || m.length === 0) continue
    for (const x of m) {
      const v = x.trim()
      if (!v) continue
      matches.push(v)
      if (matches.length >= 4) return Array.from(new Set(matches))
    }
  }
  return Array.from(new Set(matches))
}

function enrichHeadlineWithNumbers(input: { title: string; summary: string | null }): string {
  const title = (input.title || '').trim()
  if (!title) return title

  const norm = normalizeText(title)
  const wantsNumbers =
    norm.includes('dolar') ||
    norm.includes('ibovespa') ||
    norm.includes('acoes') ||
    /a[cç]ões/i.test(title)

  if (!wantsNumbers) return title
  if (/[0-9]/.test(title) || /%/.test(title)) return title

  const pool = `${title} ${input.summary || ''}`.trim()
  const nums = extractNumbersForMarkets(pool)
  if (nums.length === 0) return title

  return `${title} (${nums.slice(0, 2).join('; ')})`
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test((s || '').trim())
}

function defaultFeeds(): Record<Exclude<NewsTopic, 'hn'>, string[]> {
  // Prefer Google News RSS (works well for “headlines do dia” + queries).
  // Docs: https://news.google.com/rss
  const brTop = 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419'
  const brFinance =
    'https://news.google.com/rss/search?q=mercado%20financeiro%20OR%20bolsa%20OR%20selic%20OR%20inflacao%20OR%20dolar&hl=pt-BR&gl=BR&ceid=BR:pt-419'
  const galo =
    'https://news.google.com/rss/search?q=Atl%C3%A9tico%20Mineiro%20OR%20Galo&hl=pt-BR&gl=BR&ceid=BR:pt-419'
  const steelers =
    'https://news.google.com/rss/search?q=Pittsburgh%20Steelers&hl=en-US&gl=US&ceid=US:en'

  return {
    general: [brTop],
    finance: [brFinance],
    sports: [galo, steelers],
  }
}

function defaultExcludeKeywords(): string[] {
  // “pouca política”: filtro leve por palavras comuns (ajustável via env)
  return [
    'bolsonaro',
    'lula',
    'congresso',
    'senado',
    'camara',
    'câmara',
    'stf',
    'supremo',
    'eleicao',
    'eleição',
    'eleicoes',
    'eleições',
    'campanha',
    'presidente',
    'governo',
    'pt ',
    'pl ',
    'tse',
    'ministro',
    'ministra',
  ]
}

function looksLikePolitics(title: string, extra: string[]): boolean {
  const t = normalizeText(title)
  const list = [...defaultExcludeKeywords(), ...extra].map(normalizeText).filter(Boolean)
  return list.some((k) => k && t.includes(k))
}

class NewsService {
  private readonly parser: Parser
  private readonly timeoutMs: number

  constructor() {
    this.timeoutMs = clampInt(process.env.NEWS_TIMEOUT_MS, 1000, 60000, 8000)
    this.parser = new Parser()
  }

  enabled(): boolean {
    return truthyEnv('NEWS_ENABLED', '1')
  }

  hnEnabled(): boolean {
    return truthyEnv('HN_ENABLED', '1')
  }

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'user-agent': 'cortex-bot/1.0',
          accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        },
        signal: controller.signal,
      })
      const raw = await res.text()
      if (!res.ok) {
        throw new Error(`NEWS HTTP ${res.status}: ${raw.slice(0, 200) || res.statusText}`)
      }
      return raw
    } finally {
      clearTimeout(timeout)
    }
  }

  private feedsForTopic(topic: Exclude<NewsTopic, 'hn'>): string[] {
    const defaults = defaultFeeds()[topic]
    const envKey =
      topic === 'general'
        ? 'NEWS_RSS_GENERAL_FEEDS'
        : topic === 'finance'
          ? 'NEWS_RSS_FINANCE_FEEDS'
          : 'NEWS_RSS_SPORTS_FEEDS'
    const configured = splitList(process.env[envKey])
    return configured.length ? configured : defaults
  }

  private excludeKeywords(): string[] {
    return splitList(process.env.NEWS_EXCLUDE_KEYWORDS)
  }

  private includeKeywords(topic: Exclude<NewsTopic, 'hn'>): string[] {
    const key =
      topic === 'general'
        ? 'NEWS_INCLUDE_KEYWORDS_GENERAL'
        : topic === 'finance'
          ? 'NEWS_INCLUDE_KEYWORDS_FINANCE'
          : 'NEWS_INCLUDE_KEYWORDS_SPORTS'
    return splitList(process.env[key])
  }

  private shouldKeepItem(topic: Exclude<NewsTopic, 'hn'>, title: string): boolean {
    const includes = this.includeKeywords(topic)
    if (includes.length > 0) {
      const t = normalizeText(title)
      const ok = includes
        .map(normalizeText)
        .filter(Boolean)
        .some((k) => t.includes(k))
      if (!ok) return false
    }
    // Filter politics only for general/finance by default.
    if (topic === 'general' || topic === 'finance') {
      const allowPolitics = truthyEnv('NEWS_ALLOW_POLITICS', '0')
      if (!allowPolitics && looksLikePolitics(title, this.excludeKeywords())) return false
    }
    return true
  }

  async getRssItems(input: { topic: Exclude<NewsTopic, 'hn'>; max: number }): Promise<NewsItem[]> {
    if (!this.enabled()) return []
    const max = clampInt(input.max, 1, 30, 8)
    const urls = this.feedsForTopic(input.topic)
    const seen = new Set<string>()
    const out: NewsItem[] = []

    for (const feedUrl of urls) {
      try {
        const xml = await this.fetchText(feedUrl)
        const parsed = await this.parser.parseString(xml)
        const source = (parsed.title || '').trim() || 'RSS'
        const items = Array.isArray(parsed.items) ? parsed.items : []

        for (const it of items) {
          const title = (it.title || '').toString().trim()
          const link = (it.link || '').toString().trim()
          if (!title || !isUrl(link)) continue
          if (!this.shouldKeepItem(input.topic, title)) continue

          const key = link
          if (seen.has(key)) continue
          seen.add(key)

          const pub = (it.isoDate || it.pubDate || '').toString().trim()
          const summaryRaw = (it.contentSnippet || it.content || '').toString().trim()
          const summary = summaryRaw ? ellipsize(stripHtml(summaryRaw), 260) : null

          out.push({
            topic: input.topic,
            title: enrichHeadlineWithNumbers({ title: stripHtml(title), summary }),
            url: link,
            source,
            publishedAt: pub || null,
            summary,
            raw: { feedUrl },
          })
          if (out.length >= max) break
        }
      } catch {
        // ignore per-feed failures (digest must continue)
      }
      if (out.length >= max) break
    }
    return out
  }

  async getHackerNewsFrontPage(input: { max: number }): Promise<NewsItem[]> {
    if (!this.enabled() || !this.hnEnabled()) return []
    const max = clampInt(input.max, 1, 30, 6)

    // Algolia HN API (public)
    const url = `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${encodeURIComponent(String(max))}`
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: controller.signal,
        })
        const raw = await res.text()
        if (!res.ok) throw new Error(`HN HTTP ${res.status}`)
        const json = raw ? (JSON.parse(raw) as any) : {}
        const hits = Array.isArray(json.hits) ? json.hits : []
        const out: NewsItem[] = []
        for (const h of hits.slice(0, max)) {
          const title = (h.title || '').toString().trim()
          const storyUrl = (h.url || '').toString().trim()
          const hnUrl = h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : null
          const finalUrl = isUrl(storyUrl) ? storyUrl : hnUrl || ''
          if (!title || !finalUrl) continue
          out.push({
            topic: 'hn',
            title: stripHtml(title),
            url: finalUrl,
            source: 'Hacker News',
            publishedAt: (h.created_at || '').toString().trim() || null,
            summary: null,
            raw: { hn: hnUrl, objectID: h.objectID },
          })
        }
        return out
      } finally {
        clearTimeout(timeout)
      }
    } catch {
      return []
    }
  }

  async captureToNotes(input: { workspaceId: string; items: NewsItem[] }): Promise<void> {
    const notesDb = getNotesDbService()
    if (!notesDb.enabled()) return

    const wid = (input.workspaceId || 'pessoal').trim() || 'pessoal'
    for (const it of input.items) {
      const source = it.topic === 'hn' ? 'hn' : 'rss'
      const sourcePath =
        it.topic === 'hn'
          ? it.raw && typeof (it.raw as any).objectID !== 'undefined'
            ? `hn/${String((it.raw as any).objectID)}`
            : `hn/url/${it.url}`
          : it.url

      const md = [
        `# ${it.title}`,
        '',
        `- url: ${it.url}`,
        `- source: ${it.source}`,
        it.publishedAt ? `- published_at: ${it.publishedAt}` : '',
        '',
        it.summary ? it.summary : '',
        '',
        '---',
        `kind: news_item`,
        `topic: ${it.topic}`,
      ]
        .filter(Boolean)
        .join('\n')

      try {
        await notesDb.upsertExternalNote({
          workspaceId: wid,
          source,
          sourcePath,
          title: it.title.slice(0, 180),
          bodyMd: md,
          type: 'nota',
          tags: [
            `origem/${source}`,
            'tipo/noticia',
            `news/topic/${it.topic}`,
            ...(it.topic === 'sports' ? ['area/esportes'] : []),
            ...(it.topic === 'finance' ? ['area/financas'] : []),
          ],
          context: 'unknown',
        })
      } catch {
        // ignore individual item failures
      }
    }
  }
}

let instance: NewsService | null = null
export function getNewsService(): NewsService {
  if (!instance) instance = new NewsService()
  return instance
}

export { NewsService }
