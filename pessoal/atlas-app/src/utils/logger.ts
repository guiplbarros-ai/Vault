import * as fs from 'node:fs'
import * as path from 'node:path'
import { getFormattedDateTime } from './date.js'

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

class Logger {
  private logFile: string

  constructor() {
    this.logFile = path.join(process.cwd(), 'atlas.log')
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = getFormattedDateTime()
    return `[${timestamp}] [${level}] ${message}`
  }

  private write(level: LogLevel, message: string): void {
    const formatted = this.formatMessage(level, message)

    if (level === 'ERROR') {
      console.error(formatted)
    } else if (level === 'WARN') {
      console.warn(formatted)
    } else {
      console.log(formatted)
    }

    try {
      fs.appendFileSync(this.logFile, formatted + '\n')
    } catch {
      // Silently fail if we can't write to log file
    }
  }

  info(message: string): void {
    this.write('INFO', message)
  }

  warn(message: string): void {
    this.write('WARN', message)
  }

  error(message: string): void {
    this.write('ERROR', message)
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      this.write('DEBUG', message)
    }
  }

  flightSearch(origin: string, destination: string, date: string): void {
    this.info(`Buscando voos: ${origin} -> ${destination} em ${date}`)
  }

  priceAlert(route: string, oldPrice: number, newPrice: number): void {
    const change = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1)
    this.info(`Alerta de preco: ${route} - R$${oldPrice} -> R$${newPrice} (${change}%)`)
  }

  apiCall(provider: string, endpoint: string): void {
    this.debug(`API call: ${provider} - ${endpoint}`)
  }
}

export const logger = new Logger()
