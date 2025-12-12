import type { ClassificationResult, NoteType } from '../types/index.js';
import { COMMAND_MAP, NOTE_TYPE_CONFIG } from '../types/index.js';
import { logger } from '../utils/logger.js';

class ClassifierService {
  /**
   * Extrai comando #tag do início do conteúdo
   * Retorna null se nenhum comando for encontrado
   */
  parseCommand(content: string): ClassificationResult | null {
    const trimmed = content.trim();
    
    // Check for command at the start
    for (const [command, type] of Object.entries(COMMAND_MAP)) {
      if (trimmed.toLowerCase().startsWith(command)) {
        const cleanContent = trimmed.slice(command.length).trim();
        const config = NOTE_TYPE_CONFIG[type];
        
        logger.classification(content, `comando ${command} → ${config.folder}`);
        
        return {
          type,
          content: cleanContent,
          folder: config.folder
        };
      }
    }

    return null;
  }

  /**
   * Classifica o conteúdo usando o tipo fornecido
   */
  classifyByType(content: string, type: NoteType): ClassificationResult {
    const config = NOTE_TYPE_CONFIG[type];
    
    logger.classification(content, `tipo ${type} → ${config.folder}`);
    
    return {
      type,
      content: content.trim(),
      folder: config.folder
    };
  }

  /**
   * Fallback para inbox quando não há classificação
   */
  fallbackToInbox(content: string): ClassificationResult {
    const config = NOTE_TYPE_CONFIG.inbox;
    
    logger.classification(content, `fallback → ${config.folder}`);
    
    return {
      type: 'inbox',
      content: content.trim(),
      folder: config.folder
    };
  }

  /**
   * Extrai um título do conteúdo (primeira linha ou primeiras palavras)
   */
  extractTitle(content: string, maxLength: number = 50): string {
    const firstLine = content.split('\n')[0].trim();
    
    // Remove markdown headers
    const cleaned = firstLine.replace(/^#+\s*/, '');
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Truncate at word boundary
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.6) {
      return truncated.substring(0, lastSpace);
    }
    
    return truncated;
  }

  /**
   * Extrai título de livro do conteúdo
   * Procura por padrões como "Livro X", "livro 'X'", etc.
   */
  extractBookTitle(content: string): string | null {
    // Pattern: quotes, aspas, etc.
    const patterns = [
      /"([^"]+)"/,           // "Título"
      /'([^']+)'/,           // 'Título'
      /"([^"]+)"/,           // "Título" (smart quotes)
      /livro\s+(.+?)(?:\.|,|:|$)/i,  // livro X...
      /cap[ítulo]*\.?\s*\d+\s+(?:de\s+)?["']?([^"'.,]+)/i  // cap N de X
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extrai nome de reunião do conteúdo
   */
  extractMeetingTitle(content: string): string | null {
    const patterns = [
      /reuni[ãa]o\s+(?:com\s+)?(?:o\s+|a\s+)?(.+?)(?:\.|,|:|$)/i,
      /meeting\s+(?:with\s+)?(.+?)(?:\.|,|:|$)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 50);
      }
    }

    return null;
  }
}

export const classifierService = new ClassifierService();

