"use client";

/**
 * Onboarding Check Component
 * Agent APP: Owner
 *
 * Verifica se o usuário completou o onboarding e redireciona se necessário
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDB } from '@/app/providers/db-provider';
import { useAuth } from '@/app/providers/auth-provider';
import { contaService } from '@/lib/services/conta.service';
import { usuarioService } from '@/lib/services/usuario.service';
import { Loader2 } from 'lucide-react';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

export function OnboardingCheck({ children }: OnboardingCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isInitialized } = useDB();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Só verifica quando o DB estiver pronto
    if (!isInitialized) return;

    checkOnboardingStatus();
  }, [pathname, isInitialized, user, router]);

  // Evita tela em branco ao navegar para páginas que devem ignorar verificação
  useEffect(() => {
    const skip = ['/onboarding', '/setup', '/login', '/register', '/offline'];
    if (skip.includes(pathname) && shouldRedirect) {
      setShouldRedirect(false);
    }
  }, [pathname, shouldRedirect]);

  const checkOnboardingStatus = async () => {
    // Páginas que não precisam de verificação
    const skipPaths = ['/onboarding', '/setup', '/login', '/register', '/offline'];
    if (skipPaths.includes(pathname)) {
      setChecking(false);
      return;
    }

    // Se o usuário está logado, libera acesso (não precisa de onboarding)
    if (user) {
      setChecking(false);
      return;
    }

    try {
      // Primeiro, verificar se o sistema já tem um admin
      const hasAdmin = await usuarioService.hasAdmin();

      if (!hasAdmin) {
        // Sem admin, redirecionar para setup
        setShouldRedirect(true);
        router.push('/setup');
        return;
      }

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

  // Se o DB não está inicializado, o DBProvider já está mostrando loading
  // Então podemos retornar null aqui sem problemas
  if (!isInitialized) {
    return null;
  }

  // Páginas que não precisam de verificação
  const skipPaths = ['/onboarding', '/setup', '/login', '/register', '/offline'];

  // Se estamos verificando e não estamos na página de onboarding/setup/login,
  // mostrar loading para evitar flash de conteúdo
  if (checking && !skipPaths.includes(pathname)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, #152821 0%, #111f1c 40%, #0e1c19 70%, #0a1512 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#3A8F6E' }} />
          <p style={{ color: '#BBC5C2' }}>Verificando configuração...</p>
        </div>
      </div>
    );
  }

  // Se está redirecionando, não mostrar nada
  if (shouldRedirect && !skipPaths.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
