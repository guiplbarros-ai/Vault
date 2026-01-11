import cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getTodoistService } from './todoist.service.js';
import { getCalendarService } from './calendar.service.js';
import { getGmailService } from './gmail.service.js';
import { getGoogleAuthService } from './google-auth.service.js';
import { logger } from '../utils/logger.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { loadEnv } from '../utils/env.js';

loadEnv();

interface DigestConfig {
  id: string;
  chatId: number;
  cronExpression: string; // Ex: '0 7 * * *' = 7h todos os dias
  enabled: boolean;
}

type SendMessageFn = (chatId: number, message: string) => Promise<void>;

class DailyDigestService {
  private configs: DigestConfig[] = [];
  private jobs: cron.ScheduledTask[] = [];
  private sendMessage: SendMessageFn | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.obsidian-manager', 'daily-digest.json');
    this.loadConfigs();
  }

  /**
   * Configura a função de envio de mensagem (do Telegram)
   */
  setSendMessage(fn: SendMessageFn): void {
    this.sendMessage = fn;
    logger.info('Daily Digest: Função de envio configurada');
  }

  private ensureConfigDir(): void {
    const dir = path.dirname(this.configPath);
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private loadConfigs(): void {
    try {
      if (!fs.existsSync(this.configPath)) return;
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as DigestConfig[];
      if (Array.isArray(parsed)) {
        // Basic validation
        this.configs = parsed
          .filter(c => typeof c?.chatId === 'number' && typeof c?.cronExpression === 'string')
          .map(c => ({
            id: c.id || `${c.chatId}:${c.cronExpression}`,
            chatId: c.chatId,
            cronExpression: c.cronExpression,
            enabled: c.enabled !== false,
          }));
        logger.info(`Daily Digest: Config carregada (${this.configs.length} schedule(s))`);
      }
    } catch (error) {
      logger.error(`Daily Digest: Falha ao carregar config (${error instanceof Error ? error.message : 'erro'})`);
    }
  }

  private saveConfigs(): void {
    try {
      this.ensureConfigDir();
      fs.writeFileSync(this.configPath, JSON.stringify(this.configs, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Daily Digest: Falha ao salvar config (${error instanceof Error ? error.message : 'erro'})`);
    }
  }

  private makeId(chatId: number, cronExpression: string): string {
    return `${chatId}:${cronExpression}`;
  }

  /**
   * Define UM horário (substitui os anteriores) para um chat
   */
  addChat(chatId: number, hour: number = 7, minute: number = 0): void {
    const cronExpression = `${minute} ${hour} * * *`;
    
    // Remove configs existentes do chat (substitui)
    this.configs = this.configs.filter(c => c.chatId !== chatId);
    
    this.configs.push({
      id: this.makeId(chatId, cronExpression),
      chatId,
      cronExpression,
      enabled: true,
    });

    logger.info(`Daily Digest: Chat ${chatId} configurado para ${hour}:${minute.toString().padStart(2, '0')}`);
    
    // Reinicia os jobs
    this.saveConfigs();
    this.startJobs();
  }

  /**
   * Adiciona MAIS UM horário para um chat (sem remover os existentes)
   */
  addSchedule(chatId: number, hour: number, minute: number): void {
    const cronExpression = `${minute} ${hour} * * *`;
    const id = this.makeId(chatId, cronExpression);
    if (this.configs.some(c => c.id === id)) return;

    this.configs.push({ id, chatId, cronExpression, enabled: true });
    this.saveConfigs();
    this.startJobs();
    logger.info(`Daily Digest: Schedule adicionado para chat ${chatId} - ${hour}:${minute.toString().padStart(2, '0')}`);
  }

  /**
   * Ativa modo proativo padrão: 07:00 e 18:00
   */
  enableProactiveDefaults(chatId: number): void {
    // Não remove: só garante que exista
    this.addSchedule(chatId, 7, 0);
    this.addSchedule(chatId, 18, 0);
  }

  /**
   * Remove um chat do resumo diário
   */
  removeChat(chatId: number): void {
    this.configs = this.configs.filter(c => c.chatId !== chatId);
    this.saveConfigs();
    this.startJobs();
    logger.info(`Daily Digest: Chat ${chatId} removido`);
  }

  getSchedulesForChat(chatId: number): DigestConfig[] {
    return this.configs
      .filter(c => c.chatId === chatId && c.enabled)
      .slice()
      .sort((a, b) => a.cronExpression.localeCompare(b.cronExpression));
  }

  /**
   * Inicia os jobs de agendamento
   */
  startJobs(): void {
    // Para todos os jobs existentes
    this.jobs.forEach(job => job.stop());
    this.jobs = [];

    // Cria novos jobs para cada config
    for (const config of this.configs) {
      if (!config.enabled) continue;

      const job = cron.schedule(config.cronExpression, async () => {
        logger.info(`Daily Digest: Executando para chat ${config.chatId}`);
        await this.sendDigest(config.chatId);
      }, {
        timezone: 'America/Sao_Paulo'
      });

      this.jobs.push(job);
      logger.info(`Daily Digest: Job agendado - ${config.cronExpression} (America/Sao_Paulo)`);
    }
  }

  /**
   * Para todos os jobs
   */
  stopJobs(): void {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    logger.info('Daily Digest: Todos os jobs parados');
  }

  /**
   * Gera e envia o resumo diário
   */
  async sendDigest(chatId: number): Promise<void> {
    if (!this.sendMessage) {
      logger.error('Daily Digest: Função de envio não configurada');
      return;
    }

    try {
      const digest = await this.generateDigest();
      await this.sendMessage(chatId, digest);
      logger.info(`Daily Digest: Enviado para chat ${chatId}`);
    } catch (error) {
      logger.error(`Daily Digest erro: ${error instanceof Error ? error.message : 'Erro'}`);
    }
  }

  /**
   * Gera o conteúdo do resumo diário
   */
  async generateDigest(): Promise<string> {
    const today = new Date();
    const dateStr = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });
    
    const sections: string[] = [
      `☀️ *Bom dia! Seu resumo de ${dateStr}*\n`,
    ];

    // ==================== EVENTOS DO DIA ====================
    try {
      const auth = getGoogleAuthService();
      if (auth.isAuthenticated()) {
        const calendar = getCalendarService();
        const events = await calendar.getTodayEvents();
        
        if (events.length > 0) {
          sections.push('📅 *AGENDA DE HOJE*\n');
          
          for (const event of events.slice(0, 8)) {
            const parsed = calendar.parseEvent(event);
            const time = parsed.isAllDay 
              ? '📆 Dia inteiro' 
              : `🕐 ${format(parsed.start, 'HH:mm')}`;
            const meet = parsed.meetLink ? ' 🔗' : '';
            sections.push(`${time} - ${parsed.title}${meet}`);
          }
          
          if (events.length > 8) {
            sections.push(`_... e mais ${events.length - 8} evento(s)_`);
          }
          sections.push('');
        } else {
          sections.push('📅 *AGENDA*: Dia livre! Nenhum evento. 🎉\n');
        }
      }
    } catch (error) {
      logger.error(`Digest Calendar error: ${error}`);
    }

    // ==================== TAREFAS DO DIA ====================
    try {
      const todoist = getTodoistService();
      const tasks = await todoist.getTasks('today | overdue');
      
      if (tasks.length > 0) {
        sections.push('✅ *TAREFAS PARA HOJE*\n');
        
        // Ordena por prioridade
        const sorted = tasks.sort((a, b) => b.priority - a.priority);
        
        for (const task of sorted.slice(0, 8)) {
          const priority = task.priority > 1 ? ` [P${5 - task.priority}]` : '';
          const overdue = task.due?.date && new Date(task.due.date) < today ? ' ⚠️' : '';
          sections.push(`• ${task.content}${priority}${overdue}`);
        }
        
        if (tasks.length > 8) {
          sections.push(`_... e mais ${tasks.length - 8} tarefa(s)_`);
        }
        sections.push('');
      } else {
        sections.push('✅ *TAREFAS*: Nenhuma tarefa pendente! 🎉\n');
      }
    } catch (error) {
      logger.error(`Digest Todoist error: ${error}`);
      sections.push('✅ *TAREFAS*: _Não foi possível carregar_\n');
    }

    // ==================== EMAILS NÃO LIDOS ====================
    try {
      const auth = getGoogleAuthService();
      if (auth.isAuthenticated()) {
        const gmail = getGmailService();
        
        // Emails importantes primeiro
        const important = await gmail.getImportantUnread(5);
        const unread = await gmail.getUnreadMessages(10);
        
        if (important.length > 0 || unread.length > 0) {
          sections.push('📧 *EMAILS NÃO LIDOS*\n');
          
          if (important.length > 0) {
            sections.push('⭐ _Importantes:_');
            for (const ref of important.slice(0, 3)) {
              const msg = await gmail.getMessage(ref.id);
              const parsed = gmail.parseMessage(msg);
              const from = parsed.from.match(/^([^<]+)/)?.[1]?.trim().slice(0, 20) || 'Desconhecido';
              sections.push(`• ${from}: ${parsed.subject.slice(0, 35)}`);
            }
            sections.push('');
          }
          
          const totalUnread = unread.length;
          if (totalUnread > important.length) {
            sections.push(`📬 Total não lidos: ${totalUnread} email(s)`);
          }
          sections.push('');
        } else {
          sections.push('📧 *EMAILS*: Inbox zero! ✨\n');
        }
      }
    } catch (error) {
      logger.error(`Digest Gmail error: ${error}`);
    }

    // ==================== RODAPÉ ====================
    sections.push('───────────────────');
    sections.push('_Responda com qualquer pergunta!_');

    return sections.join('\n');
  }

  /**
   * Envia resumo manualmente (para teste)
   */
  async sendNow(chatId: number): Promise<string> {
    const digest = await this.generateDigest();
    if (this.sendMessage) {
      await this.sendMessage(chatId, digest);
    }
    return digest;
  }

  /**
   * Retorna status do serviço
   */
  getStatus(): { chats: number; nextRun?: string } {
    return {
      chats: this.configs.filter(c => c.enabled).length,
    };
  }
}

// Singleton
let digestInstance: DailyDigestService | null = null;

export function getDailyDigestService(): DailyDigestService {
  if (!digestInstance) {
    digestInstance = new DailyDigestService();
  }
  return digestInstance;
}

export { DailyDigestService };
