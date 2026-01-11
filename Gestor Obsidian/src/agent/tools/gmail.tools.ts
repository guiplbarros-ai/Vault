import type { AgentTool } from '../types.js';
import { getGmailService } from '../../services/gmail.service.js';
import { getGoogleAuthService } from '../../services/google-auth.service.js';

function googleAvailable(): boolean {
  try {
    return getGoogleAuthService().isAuthenticated();
  } catch {
    return false;
  }
}

export function createGmailUnreadTool(): AgentTool {
  return {
    name: 'GMAIL_UNREAD',
    description: 'Carrega emails não lidos (resumo)',
    async execute(params, ctx) {
      if (!googleAvailable()) return 'Google não autenticado';
      const gmail = getGmailService();
      const max = params.max ? parseInt(params.max, 10) : 10;
      const messageRefs = await gmail.getUnreadMessages(max);

      if (messageRefs.length === 0) return '✨ Inbox zero! Nenhum email não lido.';

      const messages: string[] = [];
      for (const ref of messageRefs.slice(0, 10)) {
        const msg = await gmail.getMessage(ref.id);
        const parsed = gmail.parseMessage(msg);
        const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from;
        messages.push(`• ${fromName.slice(0, 25)} - ${parsed.subject.slice(0, 40)}`);
      }

      const list = messages.join('\n');
      ctx.appendInternalData('GMAIL_UNREAD', list);
      return `📬 Emails não lidos carregados (${messageRefs.length})`;
    },
  };
}

export function createGmailImportantTool(): AgentTool {
  return {
    name: 'GMAIL_IMPORTANT',
    description: 'Lista emails importantes não lidos (texto pronto)',
    async execute() {
      if (!googleAvailable()) return 'Google não autenticado';
      const gmail = getGmailService();
      const messageRefs = await gmail.getImportantUnread(10);

      if (messageRefs.length === 0) return '✨ Nenhum email importante não lido!';

      const messages: string[] = [];
      for (const ref of messageRefs) {
        const msg = await gmail.getMessage(ref.id);
        const parsed = gmail.parseMessage(msg);
        const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from;
        messages.push(`⭐ ${fromName.slice(0, 25)} - ${parsed.subject.slice(0, 40)}`);
      }

      const list = messages.join('\n');
      return `📧 EMAILS IMPORTANTES NÃO LIDOS (${messageRefs.length}):\n\n${list}`;
    },
  };
}

export function createGmailSearchTool(): AgentTool {
  return {
    name: 'GMAIL_SEARCH',
    description: 'Busca emails no Gmail (salva resumo em contexto interno)',
    async execute(params, ctx) {
      if (!googleAvailable()) return 'Google não autenticado';
      const gmail = getGmailService();
      const max = params.max ? parseInt(params.max, 10) : 10;
      const messages = await gmail.search(params.query, max);

      if (messages.length === 0) return `Nenhum email encontrado para: "${params.query}"`;

      const list = messages.map(msg => {
        const parsed = gmail.parseMessage(msg);
        const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from;
        return `• ${fromName.slice(0, 20)} - ${parsed.subject.slice(0, 35)}`;
      }).join('\n');

      ctx.appendInternalData(`GMAIL_SEARCH("${params.query}")`, list);
      return `🔍 Busca no Gmail carregada (${messages.length})`;
    },
  };
}

export function createGmailReadTool(): AgentTool {
  return {
    name: 'GMAIL_READ',
    description: 'Lê email por id (salva conteúdo em contexto interno)',
    async execute(params, ctx) {
      if (!googleAvailable()) return 'Google não autenticado';
      const gmail = getGmailService();
      const message = await gmail.getMessage(params.id);
      const parsed = gmail.parseMessage(message);

      const content = `
De: ${parsed.from}
Para: ${parsed.to.join(', ')}
Assunto: ${parsed.subject}
Data: ${parsed.date.toLocaleString('pt-BR')}

${parsed.body.slice(0, 2000)}${parsed.body.length > 2000 ? '\n\n[...truncado]' : ''}
      `.trim();

      ctx.appendInternalData(`GMAIL_READ("${params.id}")`, content);
      return `📧 Email carregado`;
    },
  };
}

