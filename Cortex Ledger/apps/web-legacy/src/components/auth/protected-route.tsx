'use client'

import { ReactNode } from 'react'
import { useRequireAuth } from '@/hooks/use-require-auth'

/**
 * Componente que protege rotas, garantindo que apenas usuários autenticados possam acessar.
 * Não faz redirecionamento - isso é responsabilidade do hook useRequireAuth.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useRequireAuth()

  // Mostra loading enquanto verifica autenticação
  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mb-4 mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-sm text-muted">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não há usuário após inicialização, não renderiza nada
  // (o hook já está redirecionando)
  if (!user) {
    return null
  }

  // Usuário autenticado - renderiza o conteúdo
  return <>{children}</>
}
