import { ToolRegistry } from './tool-registry.js';
import { createCreateNoteTool } from './tools/create-note.tool.js';
import { createSearchVaultTool, createReadNoteTool } from './tools/vault.tools.js';
import { createCreateTaskTool, createListTasksTool, createCompleteTaskTool } from './tools/todoist.tools.js';
import { createNotionSearchTool, createNotionFetchTool } from './tools/notion.tools.js';
import { createCalendarTodayTool, createCalendarWeekTool, createCalendarNextTool, createCalendarQuickTool } from './tools/calendar.tools.js';
import { createGmailUnreadTool, createGmailImportantTool, createGmailSearchTool, createGmailReadTool } from './tools/gmail.tools.js';

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Obsidian
  registry.register(createCreateNoteTool());
  registry.register(createSearchVaultTool());
  registry.register(createReadNoteTool());

  // Todoist
  registry.register(createCreateTaskTool());
  registry.register(createListTasksTool());
  registry.register(createCompleteTaskTool());

  // Notion (functions can be missing at runtime)
  registry.register(createNotionSearchTool());
  registry.register(createNotionFetchTool());

  // Google Calendar
  registry.register(createCalendarTodayTool());
  registry.register(createCalendarWeekTool());
  registry.register(createCalendarNextTool());
  registry.register(createCalendarQuickTool());

  // Gmail
  registry.register(createGmailUnreadTool());
  registry.register(createGmailImportantTool());
  registry.register(createGmailSearchTool());
  registry.register(createGmailReadTool());

  return registry;
}

