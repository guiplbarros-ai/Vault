'use client';

/**
 * AuthGuard Component
 * Agent CORE: Sistema de Autenticação
 *
 * Protege rotas privadas, redirecionando usuários não autenticados para login
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/auth-provider';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Não redireciona se ainda está carregando
    if (isLoading) {
      return;
    }

    // Se não autenticado, redireciona para login
    if (!isAuthenticated) {
      // Salva a URL que o usuário tentou acessar para redirecionar depois do login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?return=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, não renderiza nada (está redirecionando)
  if (!isAuthenticated) {
    return null;
  }

  // Renderiza o conteúdo protegido
  return <>{children}</>;
}
