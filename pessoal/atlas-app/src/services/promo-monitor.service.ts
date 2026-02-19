import { getTelegramService } from './telegram.service.js'
import { getRoutesDbService } from './routes-db.service.js'
import { logger } from '../utils/logger.js'

const FEEDS = [
  'https://www.melhoresdestinos.com.br/feed/',
  'https://passageirodeprimeira.com/feed/',
  'https://pontospravoar.com/feed/',
]

// Filter 1: Livelo promos (generic) — "livelo" + promo keyword
const REQUIRED_KEYWORD = 'livelo'
const PROMO_KEYWORDS = ['bônus', 'bonus', 'transferência', 'transferencia', 'promoção', 'promocao', 'extra', 'pontos']

// Filter 2: Smiles transfer bonuses — "smiles" + transfer/bonus keyword
const SMILES_KEYWORD = 'smiles'
const SMILES_BONUS_KEYWORDS = ['bônus', 'bonus', 'transferência', 'transferencia', 'livelo', 'pontos']

// Só notifica artigos publicados nas últimas 6 horas (evita spam no restart)
const MAX_AGE_MS = 6 * 60 * 60 * 1000

const FETCH_TIMEOUT_MS = 15000

interface RssItem {
  title: string
  link: string
  pubDate: Date
  description: string
}

class PromoMonitorService {
  private seenUrls = new Set<string>()
  private lastArticle: RssItem | null = null

  async checkFeeds(): Promise<void> {
    const alerts: RssItem[] = []

    for (const feedUrl of FEEDS) {
      try {
        const items = await this.fetchFeed(feedUrl)
        const now = Date.now()

        for (const item of items) {
          const age = now - item.pubDate.getTime()

          if (age > MAX_AGE_MS) continue
          if (this.seenUrls.has(item.link)) continue
          if (!this.isRelevant(item)) continue

          this.seenUrls.add(item.link)
          alerts.push(item)
        }
      } catch (error) {
        logger.warn(`Erro ao checar feed ${feedUrl}: ${error}`)
      }
    }

    if (alerts.length === 0) return

    // Atualiza último artigo encontrado
    this.lastArticle = alerts[0]

    // Envia notificações
    await this.notifyAll(alerts)
  }

  private isRelevant(item: RssItem): boolean {
    const text = `${item.title} ${item.description}`.toLowerCase()

    // Filter 1: Livelo generic promo
    const hasLivelo = text.includes(REQUIRED_KEYWORD)
    const hasPromo = PROMO_KEYWORDS.some(k => text.includes(k))

    // Filter 2: Smiles transfer bonus (may or may not mention Livelo)
    const hasSmiles = text.includes(SMILES_KEYWORD)
    const hasSmilesBonus = SMILES_BONUS_KEYWORDS.some(k => text.includes(k))

    return (hasLivelo && hasPromo) || (hasSmiles && hasSmilesBonus)
  }

  private isSmilesTransferBonus(item: RssItem): boolean {
    const text = `${item.title} ${item.description}`.toLowerCase()
    const hasSmiles = text.includes(SMILES_KEYWORD)
    const hasTransfer = ['transferência', 'transferencia', 'livelo', 'bônus', 'bonus'].some(k => text.includes(k))
    return hasSmiles && hasTransfer
  }

  private async fetchFeed(url: string): Promise<RssItem[]> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Atlas-Flight-Monitor/1.0',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const xml = await response.text()
      return this.parseRss(xml)
    } finally {
      clearTimeout(timeout)
    }
  }

  private parseRss(xml: string): RssItem[] {
    const items: RssItem[] = []

    // Extrai blocos <item>...</item>
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]

      const title = this.extractTag(block, 'title')
      const link = this.extractTag(block, 'link')
      const pubDateStr = this.extractTag(block, 'pubDate')
      const description = this.extractTag(block, 'description')

      if (!title || !link) continue

      const pubDate = pubDateStr ? new Date(pubDateStr) : new Date()

      items.push({ title, link, pubDate, description: description || '' })
    }

    return items
  }

  private extractTag(xml: string, tag: string): string | null {
    // Tenta CDATA primeiro: <tag><![CDATA[content]]></tag>
    const cdataRegex = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
    const cdataMatch = cdataRegex.exec(xml)
    if (cdataMatch) return cdataMatch[1].trim()

    // Tag normal: <tag>content</tag>
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
    const m = regex.exec(xml)
    if (m) return m[1].trim()

    return null
  }

  private async notifyAll(alerts: RssItem[]): Promise<void> {
    const telegram = getTelegramService()
    if (!telegram.enabled()) return

    // Busca todos os chats com rotas ativas
    const routes = await getRoutesDbService().getAllActiveRoutes()
    const chatIds = [...new Set(routes.map(r => r.chatId))]

    if (chatIds.length === 0) return

    for (const item of alerts) {
      const message = this.formatNotification(item)
      logger.info(`[Promo] Notificando ${chatIds.length} chat(s): ${item.title}`)

      for (const chatId of chatIds) {
        try {
          await telegram.sendMessage(chatId, message)
        } catch (error) {
          logger.error(`[Promo] Erro ao notificar chat ${chatId}: ${error}`)
        }
      }
    }
  }

  private formatNotification(item: RssItem): string {
    const isSmiles = this.isSmilesTransferBonus(item)

    let msg: string
    if (isSmiles) {
      msg = `🚨🎯 *BÔNUS LIVELO → SMILES!*\n\n`
      msg += `${item.title}\n\n`
      msg += `💡 _Você tem 150k Livelo. Com bônus de 80% = 270k Smiles (Japão ida+volta custa ~145k)_\n\n`
    } else {
      msg = `🎁 *PROMOÇÃO LIVELO*\n\n`
      msg += `${item.title}\n\n`
    }

    msg += `🔗 ${item.link}`
    return msg
  }

  getLastArticle(): RssItem | null {
    return this.lastArticle
  }

  getSeenCount(): number {
    return this.seenUrls.size
  }
}

let instance: PromoMonitorService | null = null

export function getPromoMonitorService(): PromoMonitorService {
  if (!instance) {
    instance = new PromoMonitorService()
  }
  return instance
}
