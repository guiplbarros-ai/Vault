import { getDailyDigestService } from '../src/services/daily-digest.service.js'
import { getSupabaseClient, isSupabaseConfigured } from '../src/services/supabase.service.js'
import { getTelegramWebhookBot } from '../src/services/telegram.service.js'
import { loadEnv } from '../src/utils/env.js'

loadEnv()

function parseChatIds(raw: string | undefined): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n !== 0)
}

async function discoverChatIds(): Promise<number[]> {
  // 1) explicit CLI arg
  const arg = process.argv[2]
  const fromArg = parseChatIds(arg)
  if (fromArg.length) return fromArg

  // 2) env var
  const fromEnv = parseChatIds(process.env.DAILY_DIGEST_CHATS)
  if (fromEnv.length) return fromEnv

  // 3) Supabase schedules
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()
    const { data: rows } = await supabase
      .from('digest_schedules')
      .select('chat_id, kind, enabled')
      .eq('enabled', true)
    const ids = Array.from(
      new Set(
        (rows || [])
          .filter((r: any) => (r.kind || 'daily') === 'daily')
          .map((r: any) => Number(r.chat_id))
          .filter((n: number) => Number.isFinite(n) && n !== 0)
      )
    )
    if (ids.length) return ids

    // 4) Fallback: last updated chat_settings
    const { data: chats } = await supabase
      .from('chat_settings')
      .select('chat_id')
      .order('updated_at', { ascending: false })
      .limit(1)
    const fallback = (chats || [])
      .map((c: any) => Number(c.chat_id))
      .filter((n: number) => Number.isFinite(n) && n !== 0)
    if (fallback.length) return fallback
  }

  return []
}

const chatIds = await discoverChatIds()
if (!chatIds.length) {
  console.error(
    'Não encontrei chat_id para enviar. Passe como argumento, ex:\n' +
      '  node --import tsx scripts/send-test-digest-telegram.ts 123456789\n' +
      'Ou configure DAILY_DIGEST_CHATS no .env, ou habilite digest_schedules no Supabase.'
  )
  process.exit(1)
}

const bot = getTelegramWebhookBot()
const digest = getDailyDigestService()

for (const chatId of chatIds) {
  const text = await digest.sendNow(chatId)
  await bot.sendSystemMessage(chatId, text)
  // eslint-disable-next-line no-console
  console.log(`✅ Digest enviado para chat_id=${chatId}`)
}
