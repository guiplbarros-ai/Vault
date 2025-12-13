import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';
import { getBrainService, type BrainService } from './brain.service.js';
import { getNotionService } from './notion.service.js';
import { getDailyDigestService } from './daily-digest.service.js';
import { noteService } from './note.service.js';
import { getTodoistService } from './todoist.service.js';
import { getVaultService } from './vault.service.js';
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
  private brain: BrainService | null = null;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN não configurado');
    }

    const authorizedIds = process.env.TELEGRAM_AUTHORIZED_USERS;
    this.authorizedUsers = authorizedIds 
      ? authorizedIds
          .split(',')
          .map(id => parseInt(id.trim(), 10))
          .filter(n => Number.isFinite(n))
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
    try {
      const brain = getBrainService();
      this.brain = brain;
      
      // Try to connect Notion
      const notion = getNotionService();
      if (notion) {
        brain.notionSearch = (query: string) => notion.search(query);
        brain.notionFetch = (id: string) => notion.getPage(id);
        logger.info('Notion conectado ao Brain');
      } else {
        logger.info('Notion não configurado (NOTION_API_KEY ausente)');
      }
    } catch (error) {
      // OPENAI_API_KEY (ou outra dependência do Brain) pode não estar configurada.
      // O bot deve continuar funcionando em "modo comandos".
      const msg = error instanceof Error ? error.message : 'Erro ao iniciar Brain';
      this.brain = null;
      logger.warn(`Brain indisponível: ${msg}`);
    }
  }

  private isAuthorized(userId: number): boolean {
    if (this.authorizedUsers.length === 0) return true;
    return this.authorizedUsers.includes(userId);
  }

  private async ensureAuthorized(msg: TelegramBot.Message): Promise<boolean> {
    const userId = msg.from?.id;
    if (!userId) return true;
    if (this.isAuthorized(userId)) return true;
    await this.bot.sendMessage(msg.chat.id, '⛔ Você não está autorizado. Use /id para ver seu ID.');
    return false;
  }

  private setupHandlers(): void {
    // /help - show commands
    this.bot.onText(/\/help/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return;
      await this.sendLongMessage(msg.chat.id, `
🤖 *Comandos do Cortex*

*Notas (Obsidian):*
/nota <texto> - Salva no Inbox
/livro <texto> - Nota de livro
/conceito <texto> - Nota de conceito
/projeto <texto> - Nota de projeto
/prof <texto> - Nota profissional
/pessoal <texto> - Nota pessoal
/reuniao <texto> - Nota de reunião
/buscar <termo> - Buscar notas no vault

*Todoist:*
/tarefas - Lista tarefas de hoje (e atrasadas)
/tarefa <texto> - Cria uma tarefa
/concluir <id> - Conclui uma tarefa

*Resumo diário:*
/resumo - Ativa resumo diário às 7h
/resumo HH:MM - Ativa em horário específico
/semresumo - Desativa
/agora - Envia o resumo agora

*Utilitários:*
/id - Mostra seu user ID
/limpar - Reseta a conversa (modo IA)
      `.trim(),);
    });

    // /start - apenas boas vindas
    this.bot.onText(/\/start/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return;

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
      if (!(await this.ensureAuthorized(msg))) return;
      if (!this.brain) {
        await this.bot.sendMessage(msg.chat.id, '🧹 Ok! (Modo IA está desativado; nada para limpar).');
        return;
      }
      this.brain.clearConversation(msg.chat.id);
      await this.bot.sendMessage(msg.chat.id, '🧹 Conversa resetada! Começamos do zero.');
    });

    // /id - show user ID
    this.bot.onText(/\/id/, async (msg) => {
      await this.bot.sendMessage(msg.chat.id, `Seu ID: ${msg.from?.id}`);
    });

    // ==================== OBSIDIAN COMMANDS ====================

    const saveNote = async (msg: TelegramBot.Message, type: 'inbox'|'livro'|'conceito'|'projeto'|'prof'|'pessoal'|'reuniao', text: string) => {
      if (!(await this.ensureAuthorized(msg))) return;
      const content = text.trim();
      if (!content) {
        await this.bot.sendMessage(msg.chat.id, '❌ Envie o texto. Ex: /nota Minha ideia...');
        return;
      }

      try {
        const result = await noteService.processNote({
          content,
          type,
          forceInbox: type === 'inbox',
        });

        const fileName = result.filePath.split('/').pop() || result.filePath;
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Salvo no Obsidian: ${fileName}`,
        );
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        logger.error(`Telegram note error: ${err}`);
        await this.bot.sendMessage(msg.chat.id, `❌ Não consegui salvar a nota: ${err}`);
      }
    };

    // /nota
    this.bot.onText(/\/nota(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'inbox', match?.[1] || '');
    });
    this.bot.onText(/\/livro(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'livro', match?.[1] || '');
    });
    this.bot.onText(/\/conceito(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'conceito', match?.[1] || '');
    });
    this.bot.onText(/\/projeto(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'projeto', match?.[1] || '');
    });
    this.bot.onText(/\/prof(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'prof', match?.[1] || '');
    });
    this.bot.onText(/\/pessoal(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'pessoal', match?.[1] || '');
    });
    this.bot.onText(/\/reuniao(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'reuniao', match?.[1] || '');
    });

    // /buscar <termo>
    this.bot.onText(/\/buscar(?:\s+(.+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return;
      const query = (match?.[1] || '').trim();
      if (!query) {
        await this.bot.sendMessage(msg.chat.id, '❌ Use: /buscar <termo>');
        return;
      }

      try {
        const vault = getVaultService();
        const results = this.searchVault(vault, query).slice(0, 10);
        if (results.length === 0) {
          await this.bot.sendMessage(msg.chat.id, `🔎 Não encontrei notas para "${query}".`);
          return;
        }
        const lines = results.map(p => `• ${p}`).join('\n');
        await this.sendLongMessage(msg.chat.id, `🔎 Encontrei ${results.length} resultado(s):\n\n${lines}`);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        logger.error(`Telegram search error: ${err}`);
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao buscar: ${err}`);
      }
    });

    // ==================== TODOIST COMMANDS ====================

    // /tarefas
    this.bot.onText(/\/tarefas\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return;
      try {
        const todoist = getTodoistService();
        const tasks = await todoist.getTasks('today | overdue');
        if (tasks.length === 0) {
          await this.bot.sendMessage(msg.chat.id, '✅ Nenhuma tarefa para hoje! 🎉');
          return;
        }
        const list = tasks
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 15)
          .map(t => {
            const p = t.priority > 1 ? ` [P${5 - t.priority}]` : '';
            const d = t.due ? ` 📅 ${t.due.string}` : '';
            return `• ${t.content}${p}${d}\n  id: ${t.id}`;
          })
          .join('\n');
        await this.sendLongMessage(msg.chat.id, `📋 *Tarefas de hoje*\n\n${list}`);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        logger.error(`Telegram todoist list error: ${err}`);
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao listar tarefas: ${err}`);
      }
    });

    // /tarefa <texto>
    this.bot.onText(/\/tarefa(?:\s+([\s\S]+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return;
      const content = (match?.[1] || '').trim();
      if (!content) {
        await this.bot.sendMessage(msg.chat.id, '❌ Use: /tarefa <descrição>');
        return;
      }
      try {
        const todoist = getTodoistService();
        const task = await todoist.createTask({ content });
        await this.bot.sendMessage(msg.chat.id, `✅ Tarefa criada: "${task.content}"\nID: ${task.id}`);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        logger.error(`Telegram todoist create error: ${err}`);
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao criar tarefa: ${err}`);
      }
    });

    // /concluir <id>
    this.bot.onText(/\/concluir(?:\s+(\S+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return;
      const id = (match?.[1] || '').trim();
      if (!id) {
        await this.bot.sendMessage(msg.chat.id, '❌ Use: /concluir <id>');
        return;
      }
      try {
        const todoist = getTodoistService();
        await todoist.completeTask(id);
        await this.bot.sendMessage(msg.chat.id, `✅ Tarefa concluída: ${id}`);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro';
        logger.error(`Telegram todoist complete error: ${err}`);
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao concluir: ${err}`);
      }
    });

    // /resumo - ativa resumo diário
    this.bot.onText(/\/resumo(?:\s+(\d{1,2})(?::(\d{2}))?)?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return;
      
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
      if (!(await this.ensureAuthorized(msg))) return;
      
      const digest = getDailyDigestService();
      digest.removeChat(msg.chat.id);
      
      await this.bot.sendMessage(msg.chat.id, 
        '✅ Resumo diário desativado.\n\n_Use /resumo para reativar_',
        { parse_mode: 'Markdown' }
      );
    });

    // /agora - envia resumo imediatamente
    this.bot.onText(/\/agora/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return;
      
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
      if (msg.text) {
        // log leve para diagnosticar "não responde"
        logger.info(`Telegram msg recebida chat=${msg.chat.id} from=${msg.from?.id} text=${msg.text.startsWith('/') ? '[command]' : '[text]'}`);
      }

      // Skip commands
      if (!msg.text || msg.text.startsWith('/')) return;
      if (!(await this.ensureAuthorized(msg))) return;

      try {
        await this.bot.sendChatAction(msg.chat.id, 'typing');

        if (!this.brain) {
          await this.bot.sendMessage(
            msg.chat.id,
            '🧠 Modo IA está desativado (OPENAI_API_KEY não configurada).\n\nUse /help para ver os comandos disponíveis.',
          );
          return;
        }

        const response = await this.brain.chat(msg.chat.id, msg.text);

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
      const e = error as any;
      const code = e?.code ? `code=${e.code}` : '';
      const status = e?.response?.statusCode ? `status=${e.response.statusCode}` : '';
      const body = e?.response?.body ? `body=${JSON.stringify(e.response.body)}` : '';
      logger.error(`Polling error: ${code} ${status} ${error.message} ${body}`.trim());
    });
  }

  private searchVault(vault: ReturnType<typeof getVaultService>, query: string): string[] {
    const results: string[] = [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return results;
    
    const search = (folder: string) => {
      try {
        for (const f of vault.listFiles(folder)) {
          const filePath = `${folder}/${f}`;
          const fileName = f.toLowerCase();
          
          // Filename match (any term)
          if (terms.some(t => fileName.includes(t))) {
            results.push(filePath);
            continue;
          }
          
          // Content match (all terms) for .md files
          if (f.endsWith('.md')) {
            const content = vault.readFile(filePath);
            if (content) {
              const contentLower = content.toLowerCase();
              if (terms.every(t => contentLower.includes(t))) {
                results.push(filePath);
              }
            }
          }
        }
        for (const sub of vault.listFolders(folder)) {
          search(`${folder}/${sub}`);
        }
      } catch {
        // ignore errors (missing folders, permission, etc.)
      }
    };
    
    ['00-INBOX', '10-AREAS', '20-RESOURCES', '30-PROJECTS'].forEach(search);
    return results;
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
