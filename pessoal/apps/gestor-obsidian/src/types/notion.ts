export interface NotionSearchResult {
  id: string
  title: string
  url: string
  type: 'page' | 'database'
  highlight?: string
  timestamp?: string
}

export interface NotionPage {
  id: string
  title: string
  url: string
  content: string
  properties?: Record<string, unknown>
}

export interface NotionDatabase {
  id: string
  title: string
  url: string
  description?: string
  properties: Record<string, NotionPropertySchema>
}

export interface NotionPropertySchema {
  id: string
  name: string
  type: string
}

export interface NotionSearchOptions {
  query: string
  pageUrl?: string
  dataSourceUrl?: string
  filters?: {
    created_date_range?: {
      start_date?: string
      end_date?: string
    }
    created_by_user_ids?: string[]
  }
}
