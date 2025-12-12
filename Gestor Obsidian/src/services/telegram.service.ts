import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';
import { getBrainService } from './brain.service.js';
import { getNotionService } from './notion.service.js';
import { getDailyDigestService } from './daily-digest.service.js';
import { logger } from '../utils/logger.js';

config();

// Notion MCP functions - will be set by external caller if available
let notionSearchFn: ((query: string) => Promise<string>) | null = null;
let notionFetchFn: ((id: string) => Promise<string>) | null = null;

export function setNotionFunctions(
  search: (query: string) => Promise<string>,
  fetch: (id: string) => Promise<string>
): void {
  notionSearchFn = search;
  notionFetchFn = fetch;
  logger.info('Notion functions registered');
}

class TelegramService {
  private bot: TelegramBot;
  private authorizedUsers: number[];

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN não configurado');
    }

    const authorizedIds = process.env.TELEGRAM_AUTHORIZED_USERS;
    this.authorizedUsers = authorizedIds 
      ? authorizedIds.split(',').map(id => parseInt(id.trim()))
      : [];

    this.bot = new TelegramBot(token, { polling: true });
    this.setupBrain();
    this.setupDailyDigest();
    this.setupHandlers();
    
    logger.info('Telegram bot iniciado');
  }

  private setupDailyDigest(): void {
    const digest = getDailyDigestService();
    
    // Configura função de envio
    digest.setSendMessage(async (chatId: number, message: string) => {
      await this.sendLongMessage(chatId, message);
    });

    // Carrega configurações salvas (se houver)
    const savedChats = process.env.DAILY_DIGEST_CHATS;
    if (savedChats) {
      const chatIds = savedChats.split(',').map(id => parseInt(id.trim()));
      for (const chatId of chatIds) {
        if (!isNaN(chatId)) {
          digest.addChat(chatId, 7, 0); // 7:00 por padrão
        }
      }
    }
    
    // Inicia os jobs
    digest.startJobs();
  }

  private setupBrain(): void {
    const brain = getBrainService();
    
    // Try to connect Notion
    const notion = getNotionService();
    if (notion) {
      brain.notionSearch = (query: string) => notion.search(query);
      brain.notionFetch = (id: string) => notion.getPage(id);
      logger.info('Notion conectado ao Brain');
    } else {
      logger.info('Notion não configurado (NOTION_API_KEY ausente)');
    }
  }

  private isAuthorized(userId: number): boolean {
    if (this.authorizedUsers.length === 0) return true;
    return this.authorizedUsers.includes(userId);
  }

  private setupHandlers(): void {
    // /start - apenas boas vindas
    this.bot.onText(/\/start/, async (msg) => {
      if (!this.isAuthorized(msg.from!.id)) {
        await this.bot.sendMessage(msg.chat.id, '⛔ Não autorizado.');
        return;
      }

      await this.bot.sendMessage(msg.chat.id, `
🧠 *Cortex - Seu Segundo Cérebro*

Oi ${msg.from?.first_name}! Sou o Cortex.

Pode conversar comigo naturalmente. Eu consigo:

📝 Criar e buscar notas no Obsidian
✅ Gerenciar tarefas no Todoist  
📘 Buscar informações no Notion
📅 Ver sua agenda no Google Calendar
📧 Verificar emails no Gmail
🔄 Integrar tudo (ex: ler Notion → criar nota)

*Comandos úteis:*
/resumo - Ativa resumo diário às 7h
/resumo 8:30 - Resumo em horário específico
/agora - Recebe o resumo agora
/limpar - Reseta a conversa

*Exemplos de conversa:*
• "o que tenho na agenda hoje?"
• "algum email importante não lido?"
• "qual meu próximo compromisso?"
• "cria uma tarefa pra revisar relatório"

Manda ver! 🚀
      `, { parse_mode: 'Markdown' });
    });

    // /limpar - reset conversation
    this.bot.onText(/\/limpar/, async (msg) => {
      if (!this.isAuthorized(msg.from!.id)) return;
      const brain = getBrainService();
      brain.clearConversation(msg.chat.id);
      await this.bot.sendMessage(msg.chat.id, '🧹 Conversa resetada! Começamos do zero.');
    });

    // /id - show user ID
    this.bot.onText(/\/id/, async (msg) => {
      await this.bot.sendMessage(msg.chat.id, `Seu ID: ${msg.from?.id}`);
    });

    // /resumo - ativa resumo diário
    this.bot.onText(/\/resumo(?:\s+(\d{1,2})(?::(\d{2}))?)?/, async (msg, match) => {
      if (!this.isAuthorized(msg.from!.id)) return;
      
      const hour = match?.[1] ? parseInt(match[1]) : 7;
      const minute = match?.[2] ? parseInt(match[2]) : 0;
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        await this.bot.sendMessage(msg.chat.id, '❌ Horário inválido. Use formato: /resumo HH:MM');
        return;
      }
      
      const digest = getDailyDigestService();
      digest.addChat(msg.chat.id, hour, minute);
      
      await this.bot.sendMessage(msg.chat.id, 
        `✅ *Resumo diário ativado!*\n\n` +
        `📅 Você receberá um resumo todos os dias às *${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}* com:\n` +
        `• Eventos do dia\n` +
        `• Tarefas pendentes\n` +
        `• Emails não lidos\n\n` +
        `_Use /semresumo para desativar_\n` +
        `_Use /agora para receber agora_`,
        { parse_mode: 'Markdown' }
      );
      
      logger.info(`Daily Digest: Ativado para chat ${msg.chat.id} às ${hour}:${minute}`);
    });

    // /semresumo - desativa resumo diário
    this.bot.onText(/\/semresumo/, async (msg) => {
      if (!this.isAuthorized(msg.from!.id)) return;
      
      const digest = getDailyDigestService();
      digest.removeChat(msg.chat.id);
      
      await this.bot.sendMessage(msg.chat.id, 
        '✅ Resumo diário desativado.\n\n_Use /resumo para reativar_',
        { parse_mode: 'Markdown' }
      );
    });

    // /agora - envia resumo imediatamente
    this.bot.onText(/\/agora/, async (msg) => {
      if (!this.isAuthorized(msg.from!.id)) return;
      
      await this.bot.sendChatAction(msg.chat.id, 'typing');
      
      try {
        const digest = getDailyDigestService();
        await digest.sendNow(msg.chat.id);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao gerar resumo: ${err}`);
      }
    });

    // ALL messages go to Brain
    this.bot.on('message', async (msg) => {
      // Skip commands
      if (!msg.text || msg.text.startsWith('/')) return;
      if (!this.isAuthorized(msg.from!.id)) {
        await this.bot.sendMessage(msg.chat.id, '⛔ Você não está autorizado. Use /id para ver seu ID.');
        return;
      }

      try {
        await this.bot.sendChatAction(msg.chat.id, 'typing');

        const brain = getBrainService();
        const response = await brain.chat(msg.chat.id, msg.text);

        // Send response, splitting if needed
        await this.sendLongMessage(msg.chat.id, response.message);

      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        logger.error(`Telegram error: ${err}`);
        await this.bot.sendMessage(msg.chat.id, 
          `😅 Tive um problema: ${err}\n\nTente de novo ou /limpar para resetar.`
        );
      }
    });

    this.bot.on('polling_error', (error) => {
      logger.error(`Polling error: ${error.message}`);
    });
  }

  private async sendLongMessage(chatId: number, text: string): Promise<void> {
    const maxLen = 4000;
    
    if (text.length <= maxLen) {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(async () => {
        // Fallback without markdown if it fails
        await this.bot.sendMessage(chatId, text);
      });
      return;
    }

    // Split message
    let remaining = text;
    while (remaining.length > 0) {
      let chunk: string;
      if (remaining.length <= maxLen) {
        chunk = remaining;
        remaining = '';
      } else {
        let breakPoint = remaining.lastIndexOf('\n\n', maxLen);
        if (breakPoint < maxLen * 0.3) breakPoint = remaining.lastIndexOf('\n', maxLen);
        if (breakPoint < maxLen * 0.3) breakPoint = remaining.lastIndexOf(' ', maxLen);
        if (breakPoint < maxLen * 0.3) breakPoint = maxLen;
        
        chunk = remaining.substring(0, breakPoint);
        remaining = remaining.substring(breakPoint).trim();
      }
      
      await this.bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(async () => {
        await this.bot.sendMessage(chatId, chunk);
      });
    }
  }

  stop(): void {
    this.bot.stopPolling();
  }
}

let instance: TelegramService | null = null;

export function startTelegramBot(): TelegramService {
  if (!instance) {
    instance = new TelegramService();
  }
  return instance;
}

export function stopTelegramBot(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
