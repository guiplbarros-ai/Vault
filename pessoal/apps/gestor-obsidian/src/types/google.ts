// ============================================
// Google Calendar Types
// ============================================

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: GoogleEventDateTime
  end: GoogleEventDateTime
  status: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink: string
  created: string
  updated: string
  creator?: {
    email: string
    displayName?: string
  }
  organizer?: {
    email: string
    displayName?: string
  }
  attendees?: GoogleEventAttendee[]
  reminders?: {
    useDefault: boolean
    overrides?: GoogleEventReminder[]
  }
  recurrence?: string[]
  recurringEventId?: string
  conferenceData?: {
    entryPoints?: {
      entryPointType: string
      uri: string
      label?: string
    }[]
  }
}

export interface GoogleEventDateTime {
  date?: string // Para eventos de dia inteiro (YYYY-MM-DD)
  dateTime?: string // Para eventos com horário (ISO 8601)
  timeZone?: string
}

export interface GoogleEventAttendee {
  email: string
  displayName?: string
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  organizer?: boolean
  self?: boolean
}

export interface GoogleEventReminder {
  method: 'email' | 'popup'
  minutes: number
}

export interface CreateCalendarEventOptions {
  summary: string
  description?: string
  location?: string
  start: GoogleEventDateTime
  end: GoogleEventDateTime
  attendees?: string[] // Lista de emails
  reminders?: GoogleEventReminder[]
  conferenceData?: boolean // Criar link do Google Meet
}

export interface ListCalendarEventsOptions {
  calendarId?: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
  singleEvents?: boolean
  orderBy?: 'startTime' | 'updated'
  q?: string // Texto para buscar
}

export interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner'
}

// ============================================
// Gmail Types
// ============================================

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  payload: GmailMessagePayload
  sizeEstimate: number
  historyId: string
}

export interface GmailMessagePayload {
  partId?: string
  mimeType: string
  filename?: string
  headers: GmailHeader[]
  body: GmailMessageBody
  parts?: GmailMessagePayload[]
}

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailMessageBody {
  attachmentId?: string
  size: number
  data?: string // Base64 encoded
}

export interface GmailThread {
  id: string
  snippet: string
  historyId: string
  messages: GmailMessage[]
}

export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messageListVisibility?: 'show' | 'hide'
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide'
  messagesTotal?: number
  messagesUnread?: number
  threadsTotal?: number
  threadsUnread?: number
}

export interface ListMessagesOptions {
  maxResults?: number
  q?: string // Query de busca do Gmail
  labelIds?: string[]
  includeSpamTrash?: boolean
  pageToken?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  body: string
  cc?: string | string[]
  bcc?: string | string[]
  isHtml?: boolean
  replyTo?: string
  threadId?: string // Para responder em uma thread existente
}

export interface GmailDraft {
  id: string
  message: GmailMessage
}

// ============================================
// Parsed/Formatted Types (para uso interno)
// ============================================

export interface ParsedEmail {
  id: string
  threadId: string
  from: string
  to: string[]
  cc?: string[]
  subject: string
  date: Date
  snippet: string
  body: string
  isUnread: boolean
  hasAttachments: boolean
  labels: string[]
}

export interface ParsedCalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: Date
  end: Date
  isAllDay: boolean
  status: string
  link: string
  attendees: string[]
  hasMeetLink: boolean
  meetLink?: string
}

// ============================================
// Google OAuth Types
// ============================================

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  scope: string
  token_type: string
  expiry_date: number
}

export interface GoogleCredentials {
  client_id: string
  client_secret: string
  redirect_uri: string
}
