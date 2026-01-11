import type { AgentTool } from '../types.js';
import { getCalendarService } from '../../services/calendar.service.js';
import { getGoogleAuthService } from '../../services/google-auth.service.js';

function googleAvailable(): boolean {
  try {
    return getGoogleAuthService().isAuthenticated();
  } catch {
    return false;
  }
}

export function createCalendarTodayTool(): AgentTool {
  return {
    name: 'CALENDAR_TODAY',
    description: 'Carrega eventos do Google Calendar de hoje',
    async execute(_params, ctx) {
      if (!googleAvailable()) {
        return 'Google não autenticado. Peça ao usuário para rodar: obsidian-manager google auth';
      }
      const calendar = getCalendarService();
      const events = await calendar.getTodayEvents();
      if (events.length === 0) return 'Nenhum evento para hoje! 🎉';

      const list = events.map(e => {
        const parsed = calendar.parseEvent(e);
        const time = parsed.isAllDay
          ? '📅 Dia inteiro'
          : `🕐 ${parsed.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const meet = parsed.meetLink ? ' 🔗' : '';
        return `• ${time} - ${parsed.title}${meet}`;
      }).join('\n');

      ctx.appendInternalData('CALENDAR_TODAY', list);
      return `📅 Eventos de hoje carregados (${events.length})`;
    },
  };
}

export function createCalendarWeekTool(): AgentTool {
  return {
    name: 'CALENDAR_WEEK',
    description: 'Carrega eventos do Google Calendar da semana',
    async execute(_params, ctx) {
      if (!googleAvailable()) return 'Google não autenticado';
      const calendar = getCalendarService();
      const events = await calendar.getWeekEvents();
      if (events.length === 0) return 'Semana livre! Nenhum evento nos próximos 7 dias.';

      const formatted = calendar.formatEventList(events);
      ctx.appendInternalData('CALENDAR_WEEK', formatted);
      return `📅 Eventos da semana carregados (${events.length})`;
    },
  };
}

export function createCalendarNextTool(): AgentTool {
  return {
    name: 'CALENDAR_NEXT',
    description: 'Retorna próximo evento do Google Calendar (texto pronto)',
    async execute() {
      if (!googleAvailable()) return 'Google não autenticado';
      const calendar = getCalendarService();
      const event = await calendar.getNextEvent();
      if (!event) return 'Nenhum próximo evento agendado.';

      const parsed = calendar.parseEvent(event);
      const time = parsed.isAllDay
        ? 'Dia inteiro'
        : parsed.start.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
      const meet = parsed.meetLink ? `\n🔗 Meet: ${parsed.meetLink}` : '';
      const location = parsed.location ? `\n📍 ${parsed.location}` : '';

      return `⏰ PRÓXIMO EVENTO:\n\n📌 ${parsed.title}\n🕐 ${time}${location}${meet}`;
    },
  };
}

export function createCalendarQuickTool(): AgentTool {
  return {
    name: 'CALENDAR_QUICK',
    description: 'Cria evento no Google Calendar via quickAdd (texto natural)',
    async execute(params) {
      if (!googleAvailable()) return 'Google não autenticado';
      const calendar = getCalendarService();
      const event = await calendar.quickAdd(params.text);
      return `✅ Evento criado: "${event.summary}"\n🔗 ${event.htmlLink}`;
    },
  };
}

