import { getGoogleAuthService } from './google-auth.service.js';
import type {
  GmailMessage,
  GmailThread,
  GmailLabel,
  ListMessagesOptions,
  SendEmailOptions,
  ParsedEmail,
} from '../types/google.js';
import { logger } from '../utils/logger.js';
import { format } from 'date-fns';
import { loadEnv } from '../utils/env.js';

loadEnv();

const GMAIL_API_URL = 'https://www.googleapis.com/gmail/v1';

class GmailService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const authService = getGoogleAuthService();
    const accessToken = await authService.getValidAccessToken();
    
    const url = `${GMAIL_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : (null as T);
  }

  /**
   * Lista labels do Gmail
   */
  async getLabels(): Promise<GmailLabel[]> {
    const result = await this.request<{ labels: GmailLabel[] }>('/users/me/labels');
    return result.labels;
  }

  /**
   * Busca label por nome
   */
  async getLabelByName(name: string): Promise<GmailLabel | null> {
    const labels = await this.getLabels();
    return labels.find(l => l.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Lista mensagens com opções de filtro
   */
  async listMessages(options: ListMessagesOptions = {}): Promise<{ id: string; threadId: string }[]> {
    const {
      maxResults = 20,
      q,
      labelIds,
      includeSpamTrash = false,
      pageToken,
    } = options;

    const params = new URLSearchParams({
      maxResults: String(maxResults),
      includeSpamTrash: String(includeSpamTrash),
    });

    if (q) params.set('q', q);
    if (labelIds) params.set('labelIds', labelIds.join(','));
    if (pageToken) params.set('pageToken', pageToken);

    const result = await this.request<{
      messages: { id: string; threadId: string }[];
      nextPageToken?: string;
    }>(`/users/me/messages?${params.toString()}`);

    return result.messages || [];
  }

  /**
   * Busca uma mensagem completa por ID
   */
  async getMessage(messageId: string, format: 'full' | 'metadata' | 'minimal' = 'full'): Promise<GmailMessage> {
    return this.request<GmailMessage>(
      `/users/me/messages/${messageId}?format=${format}`
    );
  }

  /**
   * Busca uma thread completa por ID
   */
  async getThread(threadId: string): Promise<GmailThread> {
    return this.request<GmailThread>(`/users/me/threads/${threadId}`);
  }

  /**
   * Busca emails não lidos
   */
  async getUnreadMessages(maxResults: number = 20): Promise<{ id: string; threadId: string }[]> {
    return this.listMessages({
      maxResults,
      q: 'is:unread',
    });
  }

  /**
   * Busca emails importantes não lidos
   */
  async getImportantUnread(maxResults: number = 10): Promise<{ id: string; threadId: string }[]> {
    return this.listMessages({
      maxResults,
      q: 'is:unread is:important',
    });
  }

  /**
   * Busca emails de hoje
   */
  async getTodayMessages(maxResults: number = 50): Promise<{ id: string; threadId: string }[]> {
    const today = format(new Date(), 'yyyy/MM/dd');
    return this.listMessages({
      maxResults,
      q: `after:${today}`,
    });
  }

  /**
   * Marca mensagem como lida
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    });
    logger.info(`Gmail: Mensagem ${messageId} marcada como lida`);
  }

  /**
   * Marca mensagem como não lida
   */
  async markAsUnread(messageId: string): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: ['UNREAD'],
      }),
    });
    logger.info(`Gmail: Mensagem ${messageId} marcada como não lida`);
  }

  /**
   * Arquiva uma mensagem (remove da Inbox)
   */
  async archive(messageId: string): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['INBOX'],
      }),
    });
    logger.info(`Gmail: Mensagem ${messageId} arquivada`);
  }

  /**
   * Move para lixeira
   */
  async trash(messageId: string): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/trash`, {
      method: 'POST',
    });
    logger.info(`Gmail: Mensagem ${messageId} movida para lixeira`);
  }

  /**
   * Adiciona label a uma mensagem
   */
  async addLabel(messageId: string, labelId: string): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: [labelId],
      }),
    });
    logger.info(`Gmail: Label adicionada à mensagem ${messageId}`);
  }

  /**
   * Envia um email
   */
  async sendEmail(options: SendEmailOptions): Promise<GmailMessage> {
    const { to, subject, body, cc, bcc, isHtml = false, replyTo, threadId } = options;
    
    // Constrói os headers do email
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const headers = [
      `To: ${toAddresses}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
    ];

    if (cc) {
      const ccAddresses = Array.isArray(cc) ? cc.join(', ') : cc;
      headers.push(`Cc: ${ccAddresses}`);
    }

    if (bcc) {
      const bccAddresses = Array.isArray(bcc) ? bcc.join(', ') : bcc;
      headers.push(`Bcc: ${bccAddresses}`);
    }

    if (replyTo) {
      headers.push(`Reply-To: ${replyTo}`);
    }

    // Monta o email completo
    const email = `${headers.join('\r\n')}\r\n\r\n${body}`;
    
    // Codifica em base64 URL-safe
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: { raw: string; threadId?: string } = {
      raw: encodedEmail,
    };

    if (threadId) {
      requestBody.threadId = threadId;
    }

    const result = await this.request<GmailMessage>('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    logger.info(`Gmail: Email enviado - "${subject}" para ${toAddresses}`);
    return result;
  }

  /**
   * Cria um rascunho
   */
  async createDraft(options: SendEmailOptions): Promise<{ id: string; message: GmailMessage }> {
    const { to, subject, body, cc, isHtml = false } = options;
    
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const headers = [
      `To: ${toAddresses}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
    ];

    if (cc) {
      const ccAddresses = Array.isArray(cc) ? cc.join(', ') : cc;
      headers.push(`Cc: ${ccAddresses}`);
    }

    const email = `${headers.join('\r\n')}\r\n\r\n${body}`;
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await this.request<{ id: string; message: GmailMessage }>('/users/me/drafts', {
      method: 'POST',
      body: JSON.stringify({
        message: { raw: encodedEmail },
      }),
    });

    logger.info(`Gmail: Rascunho criado - "${subject}"`);
    return result;
  }

  /**
   * Obtém o perfil do usuário
   */
  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
    return this.request('/users/me/profile');
  }

  /**
   * Extrai headers de uma mensagem
   */
  private getHeader(message: GmailMessage, headerName: string): string {
    const header = message.payload.headers.find(
      h => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value || '';
  }

  /**
   * Decodifica corpo da mensagem
   */
  private decodeBody(payload: GmailMessage['payload']): string {
    // Se o corpo está diretamente no payload
    if (payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Se tem parts (multipart)
    if (payload.parts) {
      // Tenta encontrar text/plain primeiro, depois text/html
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }

      const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
      if (htmlPart?.body.data) {
        // Simples remoção de tags HTML
        const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        return html.replace(/<[^>]*>/g, '').trim();
      }

      // Verifica parts aninhados (multipart/alternative dentro de multipart/mixed)
      for (const part of payload.parts) {
        if (part.parts) {
          const nestedBody = this.decodeBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return '';
  }

  /**
   * Converte mensagem para formato parsed
   */
  parseMessage(message: GmailMessage): ParsedEmail {
    const from = this.getHeader(message, 'From');
    const to = this.getHeader(message, 'To').split(',').map(e => e.trim());
    const cc = this.getHeader(message, 'Cc');
    const subject = this.getHeader(message, 'Subject');
    const dateStr = this.getHeader(message, 'Date');
    
    const hasAttachments = message.payload.parts?.some(
      p => p.filename && p.filename.length > 0
    ) || false;

    return {
      id: message.id,
      threadId: message.threadId,
      from,
      to,
      cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
      subject,
      date: dateStr ? new Date(dateStr) : new Date(parseInt(message.internalDate)),
      snippet: message.snippet,
      body: this.decodeBody(message.payload),
      isUnread: message.labelIds.includes('UNREAD'),
      hasAttachments,
      labels: message.labelIds,
    };
  }

  /**
   * Formata email para exibição
   */
  formatEmail(message: GmailMessage): string {
    const parsed = this.parseMessage(message);
    
    const unread = parsed.isUnread ? '📬' : '📭';
    const attachment = parsed.hasAttachments ? ' 📎' : '';
    const dateStr = format(parsed.date, 'dd/MM HH:mm');
    
    // Extrai nome do remetente se disponível
    const fromMatch = parsed.from.match(/^([^<]+)/);
    const fromName = fromMatch ? fromMatch[1].trim() : parsed.from;
    
    return `${unread} ${dateStr} | ${fromName.slice(0, 20).padEnd(20)} | ${parsed.subject.slice(0, 40)}${attachment}`;
  }

  /**
   * Formata lista de emails
   */
  formatEmailList(messages: GmailMessage[]): string {
    if (messages.length === 0) {
      return 'Nenhum email encontrado.';
    }

    return messages.map(m => this.formatEmail(m)).join('\n');
  }

  /**
   * Formata email completo para leitura
   */
  formatFullEmail(message: GmailMessage): string {
    const parsed = this.parseMessage(message);
    
    const lines = [
      `═══════════════════════════════════════════════════`,
      `📧 ${parsed.subject}`,
      `═══════════════════════════════════════════════════`,
      `De: ${parsed.from}`,
      `Para: ${parsed.to.join(', ')}`,
    ];

    if (parsed.cc?.length) {
      lines.push(`Cc: ${parsed.cc.join(', ')}`);
    }

    lines.push(`Data: ${format(parsed.date, "dd/MM/yyyy 'às' HH:mm")}`);
    
    if (parsed.hasAttachments) {
      lines.push(`📎 Este email contém anexos`);
    }

    lines.push('───────────────────────────────────────────────────');
    lines.push('');
    lines.push(parsed.body.slice(0, 2000) + (parsed.body.length > 2000 ? '\n\n[...mensagem truncada]' : ''));
    lines.push('');
    lines.push(`═══════════════════════════════════════════════════`);

    return lines.join('\n');
  }

  /**
   * Busca emails por query do Gmail
   * Queries: https://support.google.com/mail/answer/7190
   */
  async search(query: string, maxResults: number = 20): Promise<GmailMessage[]> {
    const messageRefs = await this.listMessages({ q: query, maxResults });
    
    const messages: GmailMessage[] = [];
    for (const ref of messageRefs) {
      const message = await this.getMessage(ref.id);
      messages.push(message);
    }

    logger.info(`Gmail: ${messages.length} emails encontrados para "${query}"`);
    return messages;
  }
}

// Singleton
let gmailInstance: GmailService | null = null;

export function getGmailService(): GmailService {
  if (!gmailInstance) {
    gmailInstance = new GmailService();
  }
  return gmailInstance;
}

export { GmailService };
