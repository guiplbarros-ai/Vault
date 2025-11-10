"use client";

/**
 * Onboarding Check Component
 * Agent APP: Owner
 *
 * Verifica se o usuário completou o onboarding e redireciona se necessário
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { contaService } from '@/lib/services/conta.service';
import { Loader2 } from 'lucide-react';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

export function OnboardingCheck({ children }: OnboardingCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, [pathname]);

  const checkOnboardingStatus = async () => {
    // Não verificar se já estiver na página de onboarding
    if (pathname === '/onboarding') {
      setChecking(false);
      return;
    }

    try {
      // Verificar se onboarding foi completado
      const onboardingComplete = localStorage.getItem('onboarding_complete');

      if (onboardingComplete !== 'true') {
        // Verificar se existem contas no banco
        const contas = await contaService.listContas();

        if (contas.length === 0) {
          // Não há contas e onboarding não foi completado
          setShouldRedirect(true);
          router.push('/onboarding');
          return;
        } else {
          // Tem contas mas onboarding não foi marcado como completo
          // Marcar como completo automaticamente
          localStorage.setItem('onboarding_complete', 'true');
        }
      }

      setChecking(false);
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-400 mx-auto mb-4" />
          <p className="text-white/70">Carregando...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
}
