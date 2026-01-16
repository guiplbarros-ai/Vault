export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
  }
  date: number
  text?: string
}

export interface BotCommand {
  command: string
  description: string
  handler: (msg: TelegramMessage, args: string) => Promise<string>
}

export interface ConversationState {
  chatId: number
  step: string
  data: Record<string, unknown>
  lastUpdate: number
}
