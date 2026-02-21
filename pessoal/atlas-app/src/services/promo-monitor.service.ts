import { getTelegramService } from './telegram.service.js'
import { getRoutesDbService } from './routes-db.service.js'
import { validatePromotion, isPerplexityConfigured } from './perplexity.service.js'
import type { PromoValidation } from './perplexity.service.js'
import { logger } from '../utils/logger.js'

const FEEDS = [
  'https://www.melhoresdestinos.com.br/feed/',
  'https://passageirodeprimeira.com/feed/',
  'https://pontospravoar.com/feed/',
]

// Filter 1: Livelo transfer promos — "livelo" + transfer/bonus keyword (NÃO promos de consumo)
const REQUIRED_KEYWORD = 'livelo'
const TRANSFER_KEYWORDS = ['transferência', 'transferencia', 'transferir', 'bônus', 'bonus', 'milhas', 'smiles', 'latam pass', 'azul', 'tudo azul']

// Filter 2: Smiles transfer bonuses — "smiles" + transfer/bonus keyword
// NÃO inclui "milhas" (genérico demais — qualquer artigo Smiles menciona milhas)
const SMILES_KEYWORD = 'smiles'
const SMILES_BONUS_KEYWORDS = ['bônus', 'bonus', 'transferência', 'transferencia', 'livelo']

// Exclui promos de consumo/compras E promos de passagens por milhas (PPV)
const CONSUMPTION_KEYWORDS = [
  'por real', 'por r$', 'compras', 'compra de milhas', 'parceiros', 'cashback', 'shopping',
  'loja', 'gasto', 'marketplace', 'clube livelo', 'assinatura', 'assinantes',
  'passagens', 'passagem', 'a partir de', 'ida e volta', 'só de ida',
]

// Só notifica artigos publicados nos últimos 45 minutos
// (evita re-envio após deploy — cron roda a cada 30min)
const MAX_AGE_MS = (Number(process.env.ATLAS_PROMO_MAX_AGE_MIN) || 45) * 60 * 1000

const FETCH_TIMEOUT_MS = 15000

export interface RssItem {
  title: string
  link: string
  pubDate: Date
  description: string
}

/** Verifica se um artigo é sobre transferência de pontos (não consumo) */
export function isTransferPromo(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase()

  // Exclui promos de consumo (pontos por compras em lojas/parceiros)
  const isConsumption = CONSUMPTION_KEYWORDS.some(k => text.includes(k))
  if (isConsumption) return false

  // Filter 1: Livelo transfer promo (transferência entre programas)
  const hasLivelo = text.includes(REQUIRED_KEYWORD)
  const hasTransfer = TRANSFER_KEYWORDS.some(k => text.includes(k))

  // Filter 2: Smiles transfer bonus (may or may not mention Livelo)
  const hasSmiles = text.includes(SMILES_KEYWORD)
  const hasSmilesBonus = SMILES_BONUS_KEYWORDS.some(k => text.includes(k))

  return (hasLivelo && hasTransfer) || (hasSmiles && hasSmilesBonus)
}

/** Extrai conteúdo de uma tag XML (suporta CDATA) */
export function extractTag(xml: string, tag: string): string | null {
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

/** Parse RSS XML para array de RssItem */
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []

  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const pubDateStr = extractTag(block, 'pubDate')
    const description = extractTag(block, 'description')

    if (!title || !link) continue

    const pubDate = pubDateStr ? new Date(pubDateStr) : new Date()

    items.push({ title, link, pubDate, description: description || '' })
  }

  return items
}

/** Verifica se é especificamente um bônus de transferência Livelo→Smiles */
export function isSmilesTransfer(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase()
  const hasSmiles = text.includes(SMILES_KEYWORD)
  const hasTransfer = ['transferência', 'transferencia', 'livelo', 'bônus', 'bonus'].some(k => text.includes(k))
  return hasSmiles && hasTransfer
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
    return isTransferPromo(item.title, item.description)
  }

  private isSmilesTransferBonus(item: RssItem): boolean {
    return isSmilesTransfer(item.title, item.description)
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
      return parseRss(xml)
    } finally {
      clearTimeout(timeout)
    }
  }

  private async notifyAll(alerts: RssItem[]): Promise<void> {
    const telegram = getTelegramService()
    if (!telegram.enabled()) return

    // Busca todos os chats com rotas ativas
    const routes = await getRoutesDbService().getAllActiveRoutes()
    const chatIds = [...new Set(routes.map(r => r.chatId))]

    if (chatIds.length === 0) return

    for (const item of alerts) {
      // Validação via Perplexity (se configurado)
      let validation: PromoValidation | null = null
      if (isPerplexityConfigured()) {
        try {
          validation = await validatePromotion(item.title, item.link, item.description)
        } catch (error) {
          logger.warn(`[Promo] Erro na validação Perplexity: ${error}`)
        }
      }

      // Se Perplexity validou e diz que NÃO é transferência, bloqueia
      if (validation && !validation.isValid) {
        logger.info(`[Promo] BLOQUEADO por Perplexity: "${item.title}" → ${validation.summary}`)
        if (validation.correction) {
          logger.info(`[Promo] Correção: ${validation.correction}`)
        }
        continue
      }

      const message = this.formatNotification(item, validation)
      logger.info(`[Promo] Notificando ${chatIds.length} chat(s): ${item.title}${validation ? ' (✅ validado)' : ''}`)

      for (const chatId of chatIds) {
        try {
          await telegram.sendMessage(chatId, message)
        } catch (error) {
          logger.error(`[Promo] Erro ao notificar chat ${chatId}: ${error}`)
        }
      }
    }
  }

  private formatNotification(item: RssItem, validation?: PromoValidation | null): string {
    const isSmiles = this.isSmilesTransferBonus(item)

    let msg: string
    if (isSmiles) {
      msg = `🚨🎯 *BÔNUS LIVELO → SMILES!*\n\n`
      msg += `${item.title}\n\n`
    } else {
      msg = `🎁 *PROMOÇÃO LIVELO*\n\n`
      msg += `${item.title}\n\n`
    }

    if (validation) {
      msg += `📋 _${validation.summary}_\n\n`
    }

    msg += `🔗 ${item.link}`

    if (validation) {
      msg += `\n\n✅ _Verificado via Perplexity_`
    }

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
