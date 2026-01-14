#!/usr/bin/env node

import { Command } from 'commander';
import { loadEnv } from './utils/env.js';
import { createNoteCommand } from './commands/note.js';
import { createTodoistCommand } from './commands/todoist.js';
import { createNotionCommand } from './commands/notion.js';
import { createTelegramCommand } from './commands/telegram.js';
import { createAgentCommand } from './commands/agent.js';
import { createGoogleCommand } from './commands/google.js';
import { createCalendarCommand } from './commands/calendar.js';
import { createGmailCommand } from './commands/gmail.js';
import { createFinancasCommand } from './commands/financas.js';
import { createSheetsCommand } from './commands/sheets.js';
import { createMigrateCommand } from './commands/migrate.js';
import { createPolymarketCommand } from './commands/polymarket.js';

// Load environment variables
loadEnv();

const program = new Command();

program
  .name('obsidian-manager')
  .description('CLI para gerenciar notas no Obsidian, tarefas no Todoist, Notion, Google Calendar e Gmail')
  .version('1.0.0');

// Register commands
program.addCommand(createNoteCommand());
program.addCommand(createTodoistCommand());
program.addCommand(createNotionCommand());
program.addCommand(createTelegramCommand());
program.addCommand(createAgentCommand());
program.addCommand(createGoogleCommand());
program.addCommand(createCalendarCommand());
program.addCommand(createGmailCommand());
program.addCommand(createFinancasCommand());
program.addCommand(createSheetsCommand());
program.addCommand(createMigrateCommand());
program.addCommand(createPolymarketCommand());

// Parse arguments
program.parse();

