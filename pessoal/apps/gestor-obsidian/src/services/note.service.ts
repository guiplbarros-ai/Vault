import * as path from 'path'
import type { NoteCreateOptions, NoteResult, NoteType } from '../types/index.js'
import { NOTE_TYPE_CONFIG } from '../types/index.js'
import { getFormattedDate, getFormattedTime, getTimestampHeader } from '../utils/date.js'
import {
  createFrontmatter,
  serializeFrontmatter,
  updateFrontmatterTimestamp,
} from '../utils/frontmatter.js'
import { logger } from '../utils/logger.js'
import { classifierService } from './classifier.service.js'
import { getVaultService } from './vault.service.js'

class NoteService {
  /**
   * Gera o nome do arquivo baseado no tipo e título
   */
  generateFileName(type: NoteType, title: string): string {
    const config = NOTE_TYPE_CONFIG[type]
    const date = getFormattedDate()
    const time = getFormattedTime()

    // Sanitize title for filename
    const safeTitle = title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return config.filePattern
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{title}', safeTitle)
  }

  /**
   * Cria uma nova nota com frontmatter
   */
  createNote(
    folder: string,
    fileName: string,
    content: string,
    type: NoteType,
    title: string
  ): NoteResult {
    const vault = getVaultService()
    const config = NOTE_TYPE_CONFIG[type]

    // Create frontmatter
    const frontmatter = createFrontmatter(title, config.tagType)
    const frontmatterStr = serializeFrontmatter(frontmatter)

    // Build full note content
    const timestamp = getTimestampHeader()
    const fullContent = `${frontmatterStr}\n\n${timestamp}\n\n${content}\n`

    // Write file
    const relativePath = path.join(folder, fileName)
    vault.writeFile(relativePath, fullContent)

    logger.noteCreated(relativePath, type)

    return {
      success: true,
      action: 'created',
      filePath: vault.getFullPath(relativePath),
      message: `Nota criada: ${relativePath}`,
    }
  }

  /**
   * Atualiza uma nota existente (append com timestamp)
   */
  updateNote(relativePath: string, content: string): NoteResult {
    const vault = getVaultService()

    // Read existing content and update timestamp in frontmatter
    const existingContent = vault.readFile(relativePath)
    if (!existingContent) {
      throw new Error(`Arquivo não encontrado: ${relativePath}`)
    }

    // Update frontmatter timestamp
    const updatedContent = updateFrontmatterTimestamp(existingContent)

    // Add new content section
    const timestamp = getTimestampHeader()
    const newSection = `\n\n${timestamp}\n\n${content}\n`

    vault.writeFile(relativePath, updatedContent + newSection)

    logger.noteUpdated(relativePath)

    return {
      success: true,
      action: 'updated',
      filePath: vault.getFullPath(relativePath),
      message: `Nota atualizada: ${relativePath}`,
    }
  }

  /**
   * Encontra um arquivo existente por título parcial
   */
  findExistingNote(folder: string, titlePattern: string): string | null {
    const vault = getVaultService()

    // Escape special regex characters and create pattern
    const escaped = titlePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return vault.findFileByPattern(folder, escaped)
  }

  /**
   * Processa uma nota: cria nova ou atualiza existente
   */
  async processNote(options: NoteCreateOptions): Promise<NoteResult> {
    const vault = getVaultService()

    // Handle append to existing file
    if (options.appendTo) {
      if (!vault.fileExists(options.appendTo)) {
        throw new Error(`Arquivo não encontrado: ${options.appendTo}`)
      }
      return this.updateNote(options.appendTo, options.content)
    }

    // Force inbox if requested
    if (options.forceInbox) {
      return this.createInboxNote(options.content)
    }

    // Try to parse command from content
    let classification = classifierService.parseCommand(options.content)

    // If no command found, use provided type or fallback
    if (!classification) {
      if (options.type) {
        classification = classifierService.classifyByType(options.content, options.type)
      } else {
        // No type provided and no command - go to inbox
        return this.createInboxNote(options.content)
      }
    }

    // Use custom path if provided
    const folder = options.customPath || classification.folder

    // Determine title
    let title = options.title
    if (!title) {
      // Try to extract title based on type
      if (classification.type === 'livro') {
        title =
          classifierService.extractBookTitle(classification.content) ||
          classifierService.extractTitle(classification.content)
      } else if (classification.type === 'reuniao') {
        title =
          classifierService.extractMeetingTitle(classification.content) ||
          classifierService.extractTitle(classification.content)
      } else {
        title = classifierService.extractTitle(classification.content)
      }
    }

    // Check if note with similar title exists for non-dated types
    const nonDatedTypes: NoteType[] = ['livro', 'conceito', 'projeto']
    if (nonDatedTypes.includes(classification.type)) {
      const existing = this.findExistingNote(folder, title)
      if (existing) {
        return this.updateNote(existing, classification.content)
      }
    }

    // Generate filename and create note
    const fileName = this.generateFileName(classification.type, title)
    return this.createNote(folder, fileName, classification.content, classification.type, title)
  }

  /**
   * Cria nota no inbox (fallback)
   */
  createInboxNote(content: string): NoteResult {
    const config = NOTE_TYPE_CONFIG.inbox
    const title = classifierService.extractTitle(content, 30) || 'Chat'
    const fileName = this.generateFileName('inbox', title)

    return this.createNote(config.folder, fileName, content, 'inbox', title)
  }
}

export const noteService = new NoteService()
