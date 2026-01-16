import { ToolRegistry } from './tool-registry.js'
import {
  createCalendarCreateTool,
  createCalendarDayTool,
  createCalendarDeleteTool,
  createCalendarGetEventTool,
  createCalendarInvestigateTool,
  createCalendarListCalendarsTool,
  createCalendarNextTool,
  createCalendarQuickTool,
  createCalendarSearchTool,
  createCalendarTodayTool,
  createCalendarUpdateTool,
  createCalendarWeekTool,
} from './tools/calendar.tools.js'
import { createCreateNoteTool } from './tools/create-note.tool.js'
import {
  createDriveCleanEmptyFoldersTool,
  createDriveCreateFolderTool,
  createDriveListTool,
  createDriveMoveTool,
  createDriveOrganizeAlluTool,
  createDriveReadTextTool,
  createDriveRenameTool,
} from './tools/drive.tools.js'
import {
  createGmailAddLabelTool,
  createGmailArchiveTool,
  createGmailDraftTool,
  createGmailForwardTool,
  createGmailImportantTool,
  createGmailListLabelsTool,
  createGmailMarkReadTool,
  createGmailMarkUnreadTool,
  createGmailReadTool,
  createGmailRemoveLabelTool,
  createGmailReplyTool,
  createGmailSearchTool,
  createGmailSendTool,
  createGmailTrashTool,
  createGmailUnreadTool,
} from './tools/gmail.tools.js'
import { createGoogleListAccountsTool, createGoogleSetAccountTool } from './tools/google.tools.js'
import { createNotionFetchTool, createNotionSearchTool } from './tools/notion.tools.js'
import { createPeopleSearchTool, createPeopleUpsertTool } from './tools/people.tools.js'
import {
  createPolymarketCaptureMarketTool,
  createPolymarketGetMarketTool,
  createPolymarketSearchTool,
} from './tools/polymarket.tools.js'
import { createSupermemoryAddTool, createSupermemorySearchTool } from './tools/supermemory.tools.js'
import {
  createAddCommentTool,
  createCompleteTaskTool,
  createCreateTaskTool,
  createDeleteTaskTool,
  createGetTaskTool,
  createListLabelsTool,
  createListProjectsTool,
  createListTasksTool,
  createReopenTaskTool,
  createTodoistTasksForPersonTool,
  createUpdateTaskTool,
} from './tools/todoist.tools.js'
import { createReadNoteTool, createSearchVaultTool } from './tools/vault.tools.js'
import {
  createWeatherForecastTool,
  createWeatherSetDefaultLocationTool,
} from './tools/weather.tools.js'

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry()

  // Obsidian
  registry.register(createCreateNoteTool())
  registry.register(createSearchVaultTool())
  registry.register(createReadNoteTool())

  // Todoist
  registry.register(createCreateTaskTool())
  registry.register(createListTasksTool())
  registry.register(createCompleteTaskTool())
  registry.register(createReopenTaskTool())
  registry.register(createDeleteTaskTool())
  registry.register(createGetTaskTool())
  registry.register(createListProjectsTool())
  registry.register(createListLabelsTool())
  registry.register(createAddCommentTool())
  registry.register(createUpdateTaskTool())
  registry.register(createTodoistTasksForPersonTool())

  // Notion (functions can be missing at runtime)
  registry.register(createNotionSearchTool())
  registry.register(createNotionFetchTool())

  // Google Calendar
  registry.register(createCalendarTodayTool())
  registry.register(createCalendarInvestigateTool())
  registry.register(createCalendarDayTool())
  registry.register(createCalendarWeekTool())
  registry.register(createCalendarNextTool())
  registry.register(createCalendarQuickTool())
  registry.register(createCalendarListCalendarsTool())
  registry.register(createCalendarSearchTool())
  registry.register(createCalendarGetEventTool())
  registry.register(createCalendarCreateTool())
  registry.register(createCalendarUpdateTool())
  registry.register(createCalendarDeleteTool())

  // Google Accounts
  registry.register(createGoogleListAccountsTool())
  registry.register(createGoogleSetAccountTool())

  // Gmail
  registry.register(createGmailUnreadTool())
  registry.register(createGmailImportantTool())
  registry.register(createGmailSearchTool())
  registry.register(createGmailReadTool())
  registry.register(createGmailMarkReadTool())
  registry.register(createGmailListLabelsTool())
  registry.register(createGmailAddLabelTool())
  registry.register(createGmailRemoveLabelTool())
  registry.register(createGmailArchiveTool())
  registry.register(createGmailTrashTool())
  registry.register(createGmailMarkUnreadTool())
  registry.register(createGmailSendTool())
  registry.register(createGmailDraftTool())
  registry.register(createGmailReplyTool())
  registry.register(createGmailForwardTool())

  // Google Drive
  registry.register(createDriveListTool())
  registry.register(createDriveCreateFolderTool())
  registry.register(createDriveRenameTool())
  registry.register(createDriveMoveTool())
  registry.register(createDriveReadTextTool())
  registry.register(createDriveCleanEmptyFoldersTool())
  registry.register(createDriveOrganizeAlluTool())

  // Weather
  registry.register(createWeatherForecastTool())
  registry.register(createWeatherSetDefaultLocationTool())

  // Supermemory (cloud memory)
  registry.register(createSupermemorySearchTool())
  registry.register(createSupermemoryAddTool())

  // CRM (Supabase people)
  registry.register(createPeopleSearchTool())
  registry.register(createPeopleUpsertTool())

  // Polymarket (prediction markets)
  registry.register(createPolymarketSearchTool())
  registry.register(createPolymarketGetMarketTool())
  registry.register(createPolymarketCaptureMarketTool())

  return registry
}
