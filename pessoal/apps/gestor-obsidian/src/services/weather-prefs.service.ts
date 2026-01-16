import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getChatSettingsDbService } from './chat-settings-db.service.js'

loadEnv()

interface WeatherPrefsRow {
  location: string
  label?: string | null
  updatedAt: string
}

type WeatherPrefsFile = Record<string, WeatherPrefsRow>

class WeatherPrefsService {
  private filePath = path.join(os.homedir(), '.obsidian-manager', 'weather-prefs.json')

  private ensureDir(): void {
    const dir = path.dirname(this.filePath)
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    } catch {
      // ignore
    }
  }

  private readFile(): WeatherPrefsFile {
    try {
      if (!fs.existsSync(this.filePath)) return {}
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as WeatherPrefsFile
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  private writeFile(data: WeatherPrefsFile): void {
    try {
      this.ensureDir()
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch {
      // ignore
    }
  }

  async getDefaultLocation(
    chatId: number
  ): Promise<{ location: string; label?: string | null } | null> {
    // Prefer Supabase (cloud-first)
    try {
      const chatDb = getChatSettingsDbService()
      if (chatDb.enabled()) {
        const s = await chatDb.getOrCreate(chatId)
        const loc = (s.weather_location || '').trim()
        if (loc) return { location: loc, label: s.weather_location_label ?? null }
      }
    } catch {
      // ignore and fallback to file
    }

    const data = this.readFile()
    const row = data[String(chatId)]
    if (!row?.location) return null
    return { location: row.location, label: row.label ?? null }
  }

  async setDefaultLocation(
    chatId: number,
    input: { location: string; label?: string | null }
  ): Promise<void> {
    const location = (input.location || '').trim()
    const label = (input.label ?? null) ? String(input.label).trim() : null
    if (!location) throw new Error('location é obrigatório')

    // Prefer Supabase (cloud-first)
    const chatDb = getChatSettingsDbService()
    if (chatDb.enabled()) {
      try {
        await chatDb.setWeatherLocation(chatId, { location, label })
        return
      } catch (e) {
        // If DB schema isn't updated yet, fallback to file so it still works.
        logger.error(
          `WeatherPrefsService: fallback to file (${e instanceof Error ? e.message : String(e)})`
        )
      }
    }

    const data = this.readFile()
    data[String(chatId)] = { location, label, updatedAt: new Date().toISOString() }
    this.writeFile(data)
  }
}

let instance: WeatherPrefsService | null = null

export function getWeatherPrefsService(): WeatherPrefsService {
  if (!instance) instance = new WeatherPrefsService()
  return instance
}

export { WeatherPrefsService }
