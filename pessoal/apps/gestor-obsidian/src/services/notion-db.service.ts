import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'

loadEnv()

type NotionQueryResponse = {
  results: Array<{
    id: string
    properties?: Record<string, unknown>
  }>
  has_more: boolean
  next_cursor: string | null
}

/**
 * Service focado em automação com Database (Notion API).
 *
 * Requer:
 * - NOTION_API_KEY (token da integração)
 * - A database compartilhada com essa integração (Share → Invite)
 */
class NotionDbService {
  private apiKey: string
  private baseUrl = 'https://api.notion.com/v1'
  private version = '2025-09-03'

  constructor(apiKey?: string) {
    const key = (apiKey || process.env.NOTION_API_KEY || '').trim()
    if (!key) throw new Error('NOTION_API_KEY não configurado')
    this.apiKey = key
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': this.version,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Notion API error: ${response.status} - ${error}`)
    }

    return (await response.json()) as T
  }

  async queryDatabase(
    databaseId: string,
    body: Record<string, unknown>
  ): Promise<NotionQueryResponse> {
    return this.request<NotionQueryResponse>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async findPageByRichText(
    databaseId: string,
    propertyName: string,
    value: string
  ): Promise<{ id: string } | null> {
    const res = await this.queryDatabase(databaseId, {
      page_size: 1,
      filter: {
        property: propertyName,
        rich_text: { equals: value },
      },
    })
    return res.results[0] ? { id: res.results[0].id } : null
  }

  async createPage(
    databaseId: string,
    properties: Record<string, unknown>
  ): Promise<{ id: string; url?: string }> {
    const created = await this.request<{ id: string; url?: string }>(`/pages`, {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    })
    return created
  }

  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<void> {
    await this.request(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    })
  }

  /**
   * Upsert (Sheets -> Notion) usando uma coluna estável do Sheets.
   */
  async upsertBySheetsId(params: {
    databaseId: string
    sheetIdPropertyName: string // ex: "ID (Sheets)"
    sheetRowId: string
    properties: Record<string, unknown>
  }): Promise<'created' | 'updated'> {
    const existing = await this.findPageByRichText(
      params.databaseId,
      params.sheetIdPropertyName,
      params.sheetRowId
    )
    if (!existing) {
      await this.createPage(params.databaseId, params.properties)
      logger.info(`Notion upsert: created (sheet_id=${params.sheetRowId})`)
      return 'created'
    }

    await this.updatePage(existing.id, params.properties)
    logger.info(`Notion upsert: updated (sheet_id=${params.sheetRowId})`)
    return 'updated'
  }
}

const notionDbInstances = new Map<string, NotionDbService>()

function keyForWorkspace(workspaceId?: 'pessoal' | 'freelaw'): string {
  if (workspaceId === 'freelaw')
    return (process.env.NOTION_API_KEY_FREELAW || process.env.NOTION_API_KEY || '').trim()
  if (workspaceId === 'pessoal')
    return (process.env.NOTION_API_KEY_PESSOAL || process.env.NOTION_API_KEY || '').trim()
  return (process.env.NOTION_API_KEY || '').trim()
}

export function getNotionDbService(workspaceId?: 'pessoal' | 'freelaw'): NotionDbService | null {
  const key = keyForWorkspace(workspaceId)
  if (!key) return null
  const cacheKey = `${workspaceId || 'default'}:${key.slice(0, 6)}`
  if (!notionDbInstances.has(cacheKey)) {
    notionDbInstances.set(cacheKey, new NotionDbService(key))
  }
  return notionDbInstances.get(cacheKey)!
}

export { NotionDbService }
