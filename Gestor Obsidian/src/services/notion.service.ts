import { logger } from '../utils/logger.js';
import { loadEnv } from '../utils/env.js';

loadEnv();

interface NotionSearchResult {
  id: string;
  title: string;
  type: 'page' | 'database';
  url: string;
}

type NotionSortTimestamp = 'last_edited_time' | 'created_time';
type NotionSortDirection = 'ascending' | 'descending';

interface NotionSearchOptions {
  pageSize?: number;
  sort?: {
    timestamp: NotionSortTimestamp;
    direction: NotionSortDirection;
  };
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

type NotionRichText = Array<{ plain_text: string }>;

type NotionSearchApiResult = {
  results: Array<{
    id: string;
    object: 'page' | 'database';
    url: string;
    // page objects often expose properties; databases have title
    properties?: Record<string, unknown>;
    title?: NotionRichText;
  }>;
};

class NotionService {
  private apiKey: string;
  private baseUrl = 'https://api.notion.com/v1';
  private version = '2022-06-28';

  constructor() {
    const key = process.env.NOTION_API_KEY;
    if (!key) {
      throw new Error('NOTION_API_KEY não configurado');
    }
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': this.version,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  private extractTitleFromProperties(props?: Record<string, unknown>): string {
    if (!props) return 'Sem título';

    // Try "title" property
    if (props.title) {
      const titleProp = props.title as { title?: NotionRichText };
      const t = titleProp.title?.[0]?.plain_text;
      if (t) return t;
    }

    // Try "Name" (common default title property name)
    if (props.Name) {
      const nameProp = props.Name as { title?: NotionRichText };
      const t = nameProp.title?.[0]?.plain_text;
      if (t) return t;
    }

    // Try to find any title-like property
    for (const value of Object.values(props)) {
      const maybe = value as { title?: NotionRichText };
      const t = maybe?.title?.[0]?.plain_text;
      if (t) return t;
    }

    return 'Sem título';
  }

  async searchResults(query: string, options: NotionSearchOptions = {}): Promise<NotionSearchResult[]> {
    try {
      const pageSize = options.pageSize ?? 10;
      const body: Record<string, unknown> = { page_size: pageSize };
      const trimmed = query.trim();
      if (trimmed) body.query = trimmed;
      if (options.sort) body.sort = options.sort;

      const result = await this.request<NotionSearchApiResult>('/search', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const mapped: NotionSearchResult[] = result.results.map((item) => {
        const type = item.object === 'database' ? 'database' : 'page';
        const title =
          type === 'database'
            ? item.title?.[0]?.plain_text || 'Sem título'
            : this.extractTitleFromProperties(item.properties);
        return { id: item.id, title, type, url: item.url };
      });

      logger.info(`Notion search: "${trimmed || '[sem query]'}" → ${mapped.length} resultados`);
      return mapped;
    } catch (error) {
      logger.error(`Notion search error: ${error}`);
      throw error;
    }
  }

  async search(query: string, options: NotionSearchOptions = {}): Promise<string> {
    const trimmed = query.trim();
    const results = await this.searchResults(trimmed, options);
    if (results.length === 0) {
      return trimmed ? `Nenhum resultado para "${trimmed}"` : 'Nenhum resultado.';
    }

    return results
      .map((item, i) => {
        const typeIcon = item.type === 'database' ? '📊' : '📄';
        return `${i + 1}. ${typeIcon} ${item.title}\n   ID: ${item.id}\n   URL: ${item.url}`;
      })
      .join('\n\n');
  }

  async recent(pageSize: number = 10): Promise<string> {
    const results = await this.searchResults('', {
      pageSize,
      sort: { timestamp: 'last_edited_time', direction: 'descending' },
    });

    if (results.length === 0) return 'Nenhuma página encontrada.';
    return results
      .map((item, i) => {
        const typeIcon = item.type === 'database' ? '📊' : '📄';
        return `${i + 1}. ${typeIcon} ${item.title}\n   ID: ${item.id}\n   URL: ${item.url}`;
      })
      .join('\n\n');
  }

  async getPage(pageId: string): Promise<string> {
    try {
      // Clean the page ID
      const cleanId = pageId.replace(/-/g, '').replace(/https:\/\/.*notion\.so\/.*?([a-f0-9]{32}).*/, '$1');
      
      // Get page metadata
      const page = await this.request<{properties: Record<string, unknown>}>(`/pages/${cleanId}`);
      
      // Get page blocks (content)
      const blocks = await this.request<{results: NotionBlock[]}>(`/blocks/${cleanId}/children?page_size=100`);
      
      // Extract title
      const title = this.extractTitleFromProperties(page.properties) || 'Página do Notion';

      // Convert blocks to text
      const content = this.blocksToText(blocks.results);
      
      logger.info(`Notion fetch: ${cleanId} → ${content.length} chars`);
      return `# ${title}\n\n${content}`;
    } catch (error) {
      logger.error(`Notion fetch error: ${error}`);
      throw error;
    }
  }

  private blocksToText(blocks: NotionBlock[]): string {
    return blocks.map(block => {
      const type = block.type;
      const content = block[type] as {rich_text?: Array<{plain_text: string}>; text?: Array<{plain_text: string}>; children?: NotionBlock[]};
      
      const getText = (richText: Array<{plain_text: string}> | undefined) => 
        richText?.map(t => t.plain_text).join('') || '';

      switch (type) {
        case 'paragraph':
          return getText(content.rich_text);
        case 'heading_1':
          return `# ${getText(content.rich_text)}`;
        case 'heading_2':
          return `## ${getText(content.rich_text)}`;
        case 'heading_3':
          return `### ${getText(content.rich_text)}`;
        case 'bulleted_list_item':
          return `• ${getText(content.rich_text)}`;
        case 'numbered_list_item':
          return `1. ${getText(content.rich_text)}`;
        case 'to_do':
          const checked = (block[type] as {checked?: boolean}).checked ? '✅' : '⬜';
          return `${checked} ${getText(content.rich_text)}`;
        case 'toggle':
          return `▸ ${getText(content.rich_text)}`;
        case 'code':
          return `\`\`\`\n${getText(content.rich_text)}\n\`\`\``;
        case 'quote':
          return `> ${getText(content.rich_text)}`;
        case 'divider':
          return '---';
        case 'callout':
          return `💡 ${getText(content.rich_text)}`;
        default:
          return getText(content.rich_text) || '';
      }
    }).filter(t => t).join('\n\n');
  }
}

let notionInstance: NotionService | null = null;

export function getNotionService(): NotionService | null {
  if (!process.env.NOTION_API_KEY) return null;
  if (!notionInstance) {
    try {
      notionInstance = new NotionService();
    } catch {
      return null;
    }
  }
  return notionInstance;
}

export { NotionService };

