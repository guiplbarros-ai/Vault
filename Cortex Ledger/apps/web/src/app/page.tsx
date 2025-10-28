'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/**
 * Página raiz - redireciona para /home ou /login baseado no estado de autenticação
 */
export default function RootPage() {
  const { user, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized) {
      if (user) {
        console.log('🏠 Usuário autenticado - redirecionando para /home')
        router.replace('/home')
      } else {
        console.log('🔓 Usuário não autenticado - redirecionando para /login')
        router.replace('/login')
      }
    }
  }, [user, initialized, router])

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="text-center">
        <div className="mb-4 mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
        <p className="text-sm text-muted">Redirecionando...</p>
      </div>
    </div>
  )
}
