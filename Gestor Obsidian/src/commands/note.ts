import { Command } from 'commander';
import type { NoteType } from '../types/index.js';
import { noteService } from '../services/note.service.js';
import { logger } from '../utils/logger.js';

const validTypes: NoteType[] = [
  'inbox', 'livro', 'conceito', 'projeto', 'prof', 'pessoal', 'reuniao', 'nota'
];

interface NoteCommandOptions {
  type?: string;
  title?: string;
  append?: string;
  inbox?: boolean;
  path?: string;
}

export function createNoteCommand(): Command {
  const noteCommand = new Command('note')
    .description('Cria ou atualiza uma nota no vault Obsidian')
    .argument('<content>', 'Conteúdo da nota (pode incluir #comando no início)')
    .option('-t, --type <type>', `Tipo da nota: ${validTypes.join(', ')}`)
    .option('-T, --title <title>', 'Título da nota (usado para nome do arquivo)')
    .option('-a, --append <file>', 'Arquivo existente para adicionar conteúdo')
    .option('-i, --inbox', 'Força criação no inbox')
    .option('-p, --path <path>', 'Caminho customizado dentro do vault')
    .action(async (content: string, options: NoteCommandOptions) => {
      try {
        // Validate type if provided
        if (options.type && !validTypes.includes(options.type as NoteType)) {
          console.error(`Tipo inválido: ${options.type}`);
          console.error(`Tipos válidos: ${validTypes.join(', ')}`);
          process.exit(1);
        }

        const result = await noteService.processNote({
          content,
          type: options.type as NoteType | undefined,
          title: options.title,
          appendTo: options.append,
          forceInbox: options.inbox,
          customPath: options.path
        });

        console.log(`✓ ${result.message}`);
        console.log(`  Caminho: ${result.filePath}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  return noteCommand;
}

