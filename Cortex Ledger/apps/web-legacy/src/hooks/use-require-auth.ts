'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/**
 * Hook que garante que o usuário está autenticado.
 * Redireciona para /login se não estiver.
 */
export function useRequireAuth() {
  const { user, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !user) {
      console.log('🔒 Acesso negado - redirecionando para /login')
      router.replace('/login')
    }
  }, [user, initialized, router])

  return { user, initialized }
}

