import { getGoogleAuthService } from './google-auth.service.js';
import type {
  GoogleCalendarEvent,
  GoogleCalendar,
  CreateCalendarEventOptions,
  ListCalendarEventsOptions,
  ParsedCalendarEvent,
} from '../types/google.js';
import { logger } from '../utils/logger.js';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { loadEnv } from '../utils/env.js';

loadEnv();

const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

class CalendarService {
  constructor(
    private workspaceId?: string,
    private accountEmail?: string | null,
    private forcedAccessToken?: string
  ) {}

  private async resolveAccessToken(): Promise<string> {
    if (this.forcedAccessToken) return this.forcedAccessToken;
    const authService = getGoogleAuthService(this.workspaceId, this.accountEmail || null);
    return await authService.getValidAccessToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.resolveAccessToken();
    
    const url = `${CALENDAR_API_URL}${endpoint}`;
    
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
      throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : (null as T);
  }

  /**
   * Lista calendários do usuário
   */
  async getCalendars(): Promise<GoogleCalendar[]> {
    const result = await this.request<{ items: GoogleCalendar[] }>('/users/me/calendarList');
    logger.info(`Calendar: ${result.items.length} calendários carregados`);
    return result.items;
  }

  /**
   * Busca calendário primário
   */
  async getPrimaryCalendar(): Promise<GoogleCalendar | null> {
    const calendars = await this.getCalendars();
    return calendars.find(c => c.primary) || null;
  }

  /**
   * Lista eventos de um calendário
   */
  async getEvents(options: ListCalendarEventsOptions = {}): Promise<GoogleCalendarEvent[]> {
    const {
      calendarId = 'primary',
      timeMin = new Date().toISOString(),
      timeMax,
      maxResults = 50,
      singleEvents = true,
      orderBy = 'startTime',
      q,
    } = options;

    const params = new URLSearchParams({
      timeMin,
      maxResults: String(maxResults),
      singleEvents: String(singleEvents),
      orderBy,
    });

    if (timeMax) params.set('timeMax', timeMax);
    if (q) params.set('q', q);

    const result = await this.request<{ items: GoogleCalendarEvent[] }>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
    );

    logger.info(`Calendar: ${result.items?.length || 0} eventos carregados`);
    return result.items || [];
  }

  /**
   * Busca eventos de hoje
   */
  async getTodayEvents(calendarId: string = 'primary'): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    return this.getEvents({
      calendarId,
      timeMin: todayStart.toISOString(),
      timeMax: todayEnd.toISOString(),
    });
  }

  /**
   * Busca eventos da semana
   */
  async getWeekEvents(calendarId: string = 'primary'): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const weekEnd = addDays(now, 7);

    return this.getEvents({
      calendarId,
      timeMin: startOfDay(now).toISOString(),
      timeMax: endOfDay(weekEnd).toISOString(),
    });
  }

  /**
   * Busca um evento específico por ID
   */
  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
    return this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    );
  }

  /**
   * Cria um novo evento
   */
  async createEvent(
    options: CreateCalendarEventOptions,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent> {
    const eventData: Partial<GoogleCalendarEvent> = {
      summary: options.summary,
      description: options.description,
      location: options.location,
      start: options.start,
      end: options.end,
    };

    if (options.attendees) {
      eventData.attendees = options.attendees.map(email => ({
        email,
        responseStatus: 'needsAction',
      }));
    }

    if (options.reminders) {
      eventData.reminders = {
        useDefault: false,
        overrides: options.reminders,
      };
    }

    let endpoint = `/calendars/${encodeURIComponent(calendarId)}/events`;
    
    // Se quiser criar com Google Meet
    if (options.conferenceData) {
      endpoint += '?conferenceDataVersion=1';
      (eventData as any).conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const event = await this.request<GoogleCalendarEvent>(endpoint, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });

    logger.info(`Calendar: Evento criado - "${event.summary}" (ID: ${event.id})`);
    return event;
  }

  /**
   * Atualiza um evento existente
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CreateCalendarEventOptions>,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent> {
    const event = await this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );

    logger.info(`Calendar: Evento atualizado - "${event.summary}"`);
    return event;
  }

  /**
   * Deleta um evento
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE' }
    );

    logger.info(`Calendar: Evento deletado (ID: ${eventId})`);
  }

  /**
   * Busca próximo evento
   */
  async getNextEvent(calendarId: string = 'primary'): Promise<GoogleCalendarEvent | null> {
    const events = await this.getEvents({
      calendarId,
      maxResults: 1,
      timeMin: new Date().toISOString(),
    });

    return events[0] || null;
  }

  /**
   * Converte evento para formato parsed
   */
  parseEvent(event: GoogleCalendarEvent): ParsedCalendarEvent {
    const isAllDay = !!event.start.date && !event.start.dateTime;
    
    const start = isAllDay
      ? parseISO(event.start.date!)
      : parseISO(event.start.dateTime!);
    
    const end = isAllDay
      ? parseISO(event.end.date!)
      : parseISO(event.end.dateTime!);

    const meetEntry = event.conferenceData?.entryPoints?.find(
      e => e.entryPointType === 'video'
    );

    return {
      id: event.id,
      title: event.summary,
      description: event.description,
      location: event.location,
      start,
      end,
      isAllDay,
      status: event.status,
      link: event.htmlLink,
      attendees: event.attendees?.map(a => a.email) || [],
      hasMeetLink: !!meetEntry,
      meetLink: meetEntry?.uri,
    };
  }

  /**
   * Formata evento para exibição no terminal
   */
  formatEvent(event: GoogleCalendarEvent): string {
    const parsed = this.parseEvent(event);
    
    let timeStr: string;
    if (parsed.isAllDay) {
      timeStr = '📅 Dia inteiro';
    } else {
      timeStr = `🕐 ${format(parsed.start, 'HH:mm')} - ${format(parsed.end, 'HH:mm')}`;
    }

    const location = parsed.location ? `\n   📍 ${parsed.location}` : '';
    const meet = parsed.meetLink ? `\n   🔗 ${parsed.meetLink}` : '';
    const attendees = parsed.attendees.length > 0 
      ? `\n   👥 ${parsed.attendees.slice(0, 3).join(', ')}${parsed.attendees.length > 3 ? '...' : ''}`
      : '';

    return `• ${parsed.title}\n   ${timeStr}${location}${meet}${attendees}`;
  }

  /**
   * Formata lista de eventos por data
   */
  formatEventList(events: GoogleCalendarEvent[]): string {
    if (events.length === 0) {
      return 'Nenhum evento encontrado.';
    }

    const grouped = new Map<string, GoogleCalendarEvent[]>();
    
    for (const event of events) {
      const parsed = this.parseEvent(event);
      const dateKey = format(parsed.start, 'yyyy-MM-dd');
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    }

    const lines: string[] = [];
    
    for (const [dateKey, dateEvents] of grouped) {
      const date = parseISO(dateKey);
      lines.push(`\n📆 ${format(date, "EEEE, dd 'de' MMMM")}`);
      lines.push('─'.repeat(30));
      
      for (const event of dateEvents) {
        lines.push(this.formatEvent(event));
      }
    }

    return lines.join('\n');
  }

  /**
   * Cria evento rápido a partir de texto natural
   * Ex: "Reunião com João amanhã às 14h"
   */
  async quickAdd(text: string, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
    const result = await this.request<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?text=${encodeURIComponent(text)}`,
      { method: 'POST' }
    );

    logger.info(`Calendar: Quick Add - "${result.summary}"`);
    return result;
  }
}

export function getCalendarService(workspaceId?: string, accountEmail?: string | null, forcedAccessToken?: string): CalendarService {
  return new CalendarService(workspaceId, accountEmail || null, forcedAccessToken);
}

export { CalendarService };
