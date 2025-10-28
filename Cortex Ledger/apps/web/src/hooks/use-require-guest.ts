'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/**
 * Hook que garante que o usuário NÃO está autenticado.
 * Redireciona para /home se já estiver logado.
 */
export function useRequireGuest() {
  const { user, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized && user) {
      console.log('👤 Já autenticado - redirecionando para /home')
      router.replace('/home')
    }
  }, [user, initialized, router])

  return { user, initialized }
}

