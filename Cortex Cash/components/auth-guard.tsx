'use client';

/**
 * AuthGuard Component
 * Agent CORE: Sistema de Autenticação
 *
 * Protege rotas privadas, redirecionando usuários não autenticados para login
 * EXCETO se onboarding foi completado (modo demo sem login)
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/auth-provider';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  // Verificar se onboarding foi completado (modo demo)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const complete = localStorage.getItem('onboarding_complete') === 'true';
      setOnboardingComplete(complete);
    }
  }, []);

  useEffect(() => {
    // Não redireciona se ainda está carregando
    if (isLoading || onboardingComplete === null) {
      return;
    }

    // Se onboarding completo, permite acesso sem login (modo demo)
    if (onboardingComplete) {
      return;
    }

    // Se não autenticado e onboarding não foi completado, redireciona para login
    if (!isAuthenticated) {
      // Salva a URL que o usuário tentou acessar para redirecionar depois do login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?return=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, onboardingComplete, router, pathname]);

  // Mostra loading enquanto verifica autenticação ou onboarding
  if (isLoading || onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-secondary">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se onboarding completo (modo demo), permite acesso sem autenticação
  if (onboardingComplete) {
    return <>{children}</>;
  }

  // Se não autenticado e onboarding não completado, não renderiza (está redirecionando)
  if (!isAuthenticated) {
    return null;
  }

  // Renderiza o conteúdo protegido
  return <>{children}</>;
}
