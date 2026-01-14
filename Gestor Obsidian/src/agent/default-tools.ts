import { ToolRegistry } from './tool-registry.js';
import { createCreateNoteTool } from './tools/create-note.tool.js';
import { createSearchVaultTool, createReadNoteTool } from './tools/vault.tools.js';
import {
  createCreateTaskTool,
  createListTasksTool,
  createCompleteTaskTool,
  createReopenTaskTool,
  createDeleteTaskTool,
  createGetTaskTool,
  createListProjectsTool,
  createListLabelsTool,
  createAddCommentTool,
  createUpdateTaskTool,
  createTodoistTasksForPersonTool,
} from './tools/todoist.tools.js';
import { createNotionSearchTool, createNotionFetchTool } from './tools/notion.tools.js';
import {
  createCalendarTodayTool,
  createCalendarWeekTool,
  createCalendarNextTool,
  createCalendarQuickTool,
  createCalendarListCalendarsTool,
  createCalendarSearchTool,
  createCalendarGetEventTool,
  createCalendarDayTool,
  createCalendarInvestigateTool,
  createCalendarCreateTool,
  createCalendarUpdateTool,
  createCalendarDeleteTool,
} from './tools/calendar.tools.js';
import {
  createGmailUnreadTool,
  createGmailImportantTool,
  createGmailSearchTool,
  createGmailReadTool,
  createGmailMarkReadTool,
  createGmailListLabelsTool,
  createGmailAddLabelTool,
  createGmailRemoveLabelTool,
  createGmailArchiveTool,
  createGmailTrashTool,
  createGmailMarkUnreadTool,
  createGmailSendTool,
  createGmailDraftTool,
  createGmailReplyTool,
  createGmailForwardTool,
} from './tools/gmail.tools.js';
import { createGoogleListAccountsTool, createGoogleSetAccountTool } from './tools/google.tools.js';
import {
  createDriveListTool,
  createDriveCreateFolderTool,
  createDriveRenameTool,
  createDriveMoveTool,
  createDriveReadTextTool,
  createDriveCleanEmptyFoldersTool,
  createDriveOrganizeAlluTool,
} from './tools/drive.tools.js';
import { createWeatherForecastTool, createWeatherSetDefaultLocationTool } from './tools/weather.tools.js';
import { createSupermemoryAddTool, createSupermemorySearchTool } from './tools/supermemory.tools.js';
import { createPeopleUpsertTool, createPeopleSearchTool } from './tools/people.tools.js';
import {
  createPolymarketSearchTool,
  createPolymarketGetMarketTool,
  createPolymarketCaptureMarketTool,
} from './tools/polymarket.tools.js';

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
  registry.register(createReopenTaskTool());
  registry.register(createDeleteTaskTool());
  registry.register(createGetTaskTool());
  registry.register(createListProjectsTool());
  registry.register(createListLabelsTool());
  registry.register(createAddCommentTool());
  registry.register(createUpdateTaskTool());
  registry.register(createTodoistTasksForPersonTool());

  // Notion (functions can be missing at runtime)
  registry.register(createNotionSearchTool());
  registry.register(createNotionFetchTool());

  // Google Calendar
  registry.register(createCalendarTodayTool());
  registry.register(createCalendarInvestigateTool());
  registry.register(createCalendarDayTool());
  registry.register(createCalendarWeekTool());
  registry.register(createCalendarNextTool());
  registry.register(createCalendarQuickTool());
  registry.register(createCalendarListCalendarsTool());
  registry.register(createCalendarSearchTool());
  registry.register(createCalendarGetEventTool());
  registry.register(createCalendarCreateTool());
  registry.register(createCalendarUpdateTool());
  registry.register(createCalendarDeleteTool());

  // Google Accounts
  registry.register(createGoogleListAccountsTool());
  registry.register(createGoogleSetAccountTool());

  // Gmail
  registry.register(createGmailUnreadTool());
  registry.register(createGmailImportantTool());
  registry.register(createGmailSearchTool());
  registry.register(createGmailReadTool());
  registry.register(createGmailMarkReadTool());
  registry.register(createGmailListLabelsTool());
  registry.register(createGmailAddLabelTool());
  registry.register(createGmailRemoveLabelTool());
  registry.register(createGmailArchiveTool());
  registry.register(createGmailTrashTool());
  registry.register(createGmailMarkUnreadTool());
  registry.register(createGmailSendTool());
  registry.register(createGmailDraftTool());
  registry.register(createGmailReplyTool());
  registry.register(createGmailForwardTool());

  // Google Drive
  registry.register(createDriveListTool());
  registry.register(createDriveCreateFolderTool());
  registry.register(createDriveRenameTool());
  registry.register(createDriveMoveTool());
  registry.register(createDriveReadTextTool());
  registry.register(createDriveCleanEmptyFoldersTool());
  registry.register(createDriveOrganizeAlluTool());

  // Weather
  registry.register(createWeatherForecastTool());
  registry.register(createWeatherSetDefaultLocationTool());

  // Supermemory (cloud memory)
  registry.register(createSupermemorySearchTool());
  registry.register(createSupermemoryAddTool());

  // CRM (Supabase people)
  registry.register(createPeopleSearchTool());
  registry.register(createPeopleUpsertTool());

  // Polymarket (prediction markets)
  registry.register(createPolymarketSearchTool());
  registry.register(createPolymarketGetMarketTool());
  registry.register(createPolymarketCaptureMarketTool());

  return registry;
}

