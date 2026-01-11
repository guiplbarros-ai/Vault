import type { AgentTool } from '../types.js';
import { noteService } from '../../services/note.service.js';
import type { NoteType } from '../../types/index.js';

export function createCreateNoteTool(): AgentTool {
  return {
    name: 'CREATE_NOTE',
    description: 'Cria uma nota no Obsidian (via NoteService)',
    async execute(params) {
      const result = await noteService.processNote({
        content: params.content || '',
        type: (params.type as NoteType) || 'inbox',
        title: params.title,
      });
      const fileName = result.filePath.split('/').pop() || result.filePath;
      return `Nota criada: ${fileName}`;
    },
  };
}

