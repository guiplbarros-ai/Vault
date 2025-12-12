import { config } from 'dotenv';
import { logger } from '../utils/logger.js';

config();

interface NotionSearchResult {
  id: string;
  title: string;
  type: 'page' | 'database';
  url: string;
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

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

  async search(query: string): Promise<string> {
    try {
      const result = await this.request<{results: Array<{id: string; properties?: Record<string, unknown>; title?: Array<{plain_text: string}>; object: string; url: string}>}>('/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          page_size: 10
        }),
      });

      if (result.results.length === 0) {
        return `Nenhum resultado para "${query}"`;
      }

      const formatted = result.results.map((item, i) => {
        let title = 'Sem título';
        
        // Try to get title from different places
        if (item.properties?.title) {
          const titleProp = item.properties.title as {title?: Array<{plain_text: string}>};
          if (titleProp.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
        } else if (item.properties?.Name) {
          const nameProp = item.properties.Name as {title?: Array<{plain_text: string}>};
          if (nameProp.title?.[0]?.plain_text) {
            title = nameProp.title[0].plain_text;
          }
        }

        const type = item.object === 'database' ? '📊' : '📄';
        return `${i + 1}. ${type} ${title}\n   ID: ${item.id}`;
      }).join('\n\n');

      logger.info(`Notion search: "${query}" → ${result.results.length} resultados`);
      return formatted;
    } catch (error) {
      logger.error(`Notion search error: ${error}`);
      throw error;
    }
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
      let title = 'Página do Notion';
      const props = page.properties;
      if (props.title) {
        const t = props.title as {title?: Array<{plain_text: string}>};
        title = t.title?.[0]?.plain_text || title;
      } else if (props.Name) {
        const n = props.Name as {title?: Array<{plain_text: string}>};
        title = n.title?.[0]?.plain_text || title;
      }

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

