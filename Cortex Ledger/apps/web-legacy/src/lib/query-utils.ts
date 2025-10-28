import { supabase } from '@/lib/supabase'

/**
 * Verifica se há uma sessão ativa do usuário
 * Útil para queries que dependem de autenticação
 */
export async function requireSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    console.warn('⚠️ No active session - query will return empty')
    return null
  }

  return session
}

/**
 * Formata erros do Supabase para melhor logging
 */
export function formatSupabaseError(error: any, context: string) {
  if (!error) {
    console.error(`Error in ${context}: Unknown error (error object is null/undefined)`)
    return new Error(`Failed to ${context}`)
  }

  console.error(`Error in ${context}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  })

  return new Error(error.message || `Failed to ${context}`)
}
