'use client';

import React from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle } from 'lucide-react';

interface RequireAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente de proteção que só renderiza children se o usuário for admin
 */
export function RequireAdmin({ children, fallback }: RequireAdminProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  // Mostra loading enquanto carrega
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não tiver usuário ou não for admin, mostra acesso negado
  if (!user || !isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-md w-full p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Shield className="h-24 w-24 text-muted-foreground/30" />
              <AlertTriangle className="h-10 w-10 text-destructive absolute bottom-0 right-0" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar esta página. Apenas administradores podem visualizar este conteúdo.
          </p>

          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Usuário é admin, renderiza children
  return <>{children}</>;
}

/**
 * HOC para proteger páginas inteiras
 */
export function withAdminProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RequireAdmin>
        <Component {...props} />
      </RequireAdmin>
    );
  };
}
