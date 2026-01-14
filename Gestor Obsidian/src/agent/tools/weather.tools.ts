import type { AgentTool } from '../types.js';
import { getWeatherService, weatherCodeToPt } from '../../services/weather.service.js';
import { getWeatherPrefsService } from '../../services/weather-prefs.service.js';
import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

async function getChatTimezone(chatId: number): Promise<string> {
  const chatDb = getChatSettingsDbService();
  if (!chatDb.enabled()) return 'America/Sao_Paulo';
  try {
    const s = await chatDb.getOrCreate(chatId);
    return (s.timezone || 'America/Sao_Paulo').trim();
  } catch {
    return 'America/Sao_Paulo';
  }
}

function fmtTempC(v?: number): string {
  if (v === undefined) return '—';
  return `${Math.round(v)}°C`;
}

function fmtPct(v?: number): string {
  if (v === undefined) return '—';
  return `${Math.round(v)}%`;
}

function fmtUv(v?: number): string {
  if (v === undefined) return '—';
  return String(Math.round(v));
}

export function createWeatherForecastTool(): AgentTool {
  return {
    name: 'WEATHER_FORECAST',
    description: 'Lê a previsão do tempo (Tomorrow.io) para uma localização (lat,lon ou texto)',
    async execute(params, ctx) {
      const weather = getWeatherService();
      const prefs = getWeatherPrefsService();
      const tz = await getChatTimezone(ctx.chatId);

      const explicitLocation = (params.location || '').trim();
      const stored = explicitLocation ? null : await prefs.getDefaultLocation(ctx.chatId);
      const location = explicitLocation || stored?.location || weather.defaultLocation();
      const hours = Math.max(1, Math.min(24, parseInt((params.hours || '8').trim(), 10) || 8));
      const days = Math.max(1, Math.min(5, parseInt((params.days || '1').trim(), 10) || 1));

      if (!weather.enabled()) {
        return 'Previsão do tempo indisponível: TOMORROW_API_KEY não configurado.';
      }

      const fc = await weather.getForecast({ location });
      const label = stored?.label || fc.resolvedName || fc.requestedLocation;

      const daily = fc.daily.slice(0, days);
      const hourly = fc.hourly.slice(0, hours);

      const lines: string[] = [];
      lines.push(`🌦️ Previsão do tempo — ${label}`);

      if (daily.length) {
        lines.push('');
        lines.push('Hoje / próximos dias:');
        for (const d of daily) {
          const when = toZonedTime(d.time, tz);
          const day = format(when, 'dd/MM (EEE)');
          const desc = weatherCodeToPt(d.weatherCode);
          lines.push(
            `- ${day}: ${desc} — mín ${fmtTempC(d.temperatureMinC)} / máx ${fmtTempC(d.temperatureMaxC)} — chuva ${fmtPct(d.precipitationProbabilityAvg)} — UV máx ${fmtUv(d.uvIndexMax)}`,
          );
        }
      }

      if (hourly.length) {
        lines.push('');
        lines.push(`Próximas ${hours}h:`);
        for (const h of hourly) {
          const when = toZonedTime(h.time, tz);
          const time = format(when, 'HH:mm');
          const desc = weatherCodeToPt(h.weatherCode);
          lines.push(`- ${time}: ${fmtTempC(h.temperatureC)} — ${desc} — chuva ${fmtPct(h.precipitationProbability)} — UV ${fmtUv(h.uvIndex)}`);
        }
      }

      const output = lines.join('\n');
      ctx.appendInternalData('WEATHER_FORECAST', output, 6500);
      return `Previsão do tempo carregada (${label})`;
    },
  };
}

export function createWeatherSetDefaultLocationTool(): AgentTool {
  return {
    name: 'WEATHER_SET_DEFAULT_LOCATION',
    description: 'Define a localização padrão (por chat) para previsões do tempo e report diário',
    async execute(params, ctx) {
      const prefs = getWeatherPrefsService();
      const location = (params.location || '').trim();
      const label = (params.label || '').trim() || null;
      if (!location) return 'Faltou `location` (ex.: "Belo Horizonte, MG" ou "-19.9167,-43.9345").';
      await prefs.setDefaultLocation(ctx.chatId, { location, label });
      return `Localização padrão de tempo salva: ${label || location}`;
    },
  };
}

