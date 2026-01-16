import * as fs from 'fs'
import * as path from 'path'
import { getFormattedDateTime } from './date.js'

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

class Logger {
  private logFile: string

  constructor() {
    this.logFile = path.join(process.cwd(), 'obsidian-manager.log')
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = getFormattedDateTime()
    return `[${timestamp}] [${level}] ${message}`
  }

  private write(level: LogLevel, message: string): void {
    const formatted = this.formatMessage(level, message)

    // Console output
    if (level === 'ERROR') {
      console.error(formatted)
    } else if (level === 'WARN') {
      console.warn(formatted)
    } else {
      console.log(formatted)
    }

    // File output
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

  noteCreated(filePath: string, type: string): void {
    this.info(`Nota criada: ${filePath} (tipo: ${type})`)
  }

  noteUpdated(filePath: string): void {
    this.info(`Nota atualizada: ${filePath}`)
  }

  classification(content: string, result: string): void {
    const preview = content.substring(0, 50).replace(/\n/g, ' ')
    this.info(`Classificação: "${preview}..." → ${result}`)
  }
}

export const logger = new Logger()
