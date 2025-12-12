export type NoteType = 
  | 'inbox'
  | 'livro'
  | 'conceito'
  | 'projeto'
  | 'prof'
  | 'pessoal'
  | 'reuniao'
  | 'nota';

export interface NoteConfig {
  type: NoteType;
  folder: string;
  filePattern: string;
  tagType: string;
}

export interface ClassificationResult {
  type: NoteType;
  content: string;
  folder: string;
}

export interface NoteFrontmatter {
  title: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  source: string;
}

export interface NoteCreateOptions {
  content: string;
  type?: NoteType;
  title?: string;
  appendTo?: string;
  forceInbox?: boolean;
  customPath?: string;
}

export interface NoteResult {
  success: boolean;
  action: 'created' | 'updated';
  filePath: string;
  message: string;
}

export const NOTE_TYPE_CONFIG: Record<NoteType, NoteConfig> = {
  inbox: {
    type: 'inbox',
    folder: '00-INBOX',
    filePattern: '{date} {time} Inbox - Chat.md',
    tagType: 'inbox'
  },
  livro: {
    type: 'livro',
    folder: '20-RESOURCES/Livros',
    filePattern: 'Livro - {title}.md',
    tagType: 'tipo/livro'
  },
  conceito: {
    type: 'conceito',
    folder: '20-RESOURCES/Conceitos',
    filePattern: 'Conceito - {title}.md',
    tagType: 'tipo/conceito'
  },
  projeto: {
    type: 'projeto',
    folder: '30-PROJECTS',
    filePattern: 'Projeto - {title}.md',
    tagType: 'tipo/projeto'
  },
  prof: {
    type: 'prof',
    folder: '10-AREAS/Profissional',
    filePattern: '{date} Nota - {title}.md',
    tagType: 'area/profissional'
  },
  pessoal: {
    type: 'pessoal',
    folder: '10-AREAS/Pessoal',
    filePattern: '{date} Nota - {title}.md',
    tagType: 'area/pessoal'
  },
  reuniao: {
    type: 'reuniao',
    folder: '10-AREAS/Profissional',
    filePattern: '{date} Reunião - {title}.md',
    tagType: 'tipo/reuniao'
  },
  nota: {
    type: 'nota',
    folder: '00-INBOX',
    filePattern: '{date} Nota - {title}.md',
    tagType: 'tipo/nota'
  }
};

export const COMMAND_MAP: Record<string, NoteType> = {
  '#inbox': 'inbox',
  '#livro': 'livro',
  '#conceito': 'conceito',
  '#projeto': 'projeto',
  '#prof': 'prof',
  '#pessoal': 'pessoal',
  '#reuniao': 'reuniao',
  '#nota': 'nota'
};

