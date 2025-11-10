'use client';

/**
 * Contexto de Autenticação (Multi-Usuário Local)
 * Agent CORE: Sistema Multi-Usuário
 *
 * Gerencia o usuário ativo e permite troca entre perfis
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDB } from '../db/client';
import type { Usuario } from '../types';
import { getCurrentUserId, setCurrentUserId as setStorageUserId } from '../db/seed-usuarios';

interface AuthContextValue {
  currentUser: Usuario | null;
  currentUserId: string;
  isLoading: boolean;
  isTestMode: boolean;
  setCurrentUser: (userId: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<Usuario | null>(null);
  const [currentUserId, setCurrentUserIdState] = useState<string>('usuario-producao');
  const [isLoading, setIsLoading] = useState(true);

  // Carrega o usuário atual do localStorage e do banco
  const loadCurrentUser = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      setCurrentUserIdState(userId);

      const db = getDB();
      const user = await db.usuarios.get(userId);

      if (user) {
        setCurrentUserState(user);
      } else {
        console.warn(`Usuário ${userId} não encontrado no banco`);
        // Fallback para produção
        const prodUser = await db.usuarios.get('usuario-producao');
        if (prodUser) {
          setCurrentUserState(prodUser);
          setCurrentUserIdState('usuario-producao');
          setStorageUserId('usuario-producao');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuário atual:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega usuário na montagem
  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // Troca o usuário ativo
  const setCurrentUser = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);

      const db = getDB();
      const user = await db.usuarios.get(userId);

      if (!user) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }

      // Atualiza localStorage
      setStorageUserId(userId);

      // Atualiza estado
      setCurrentUserState(user);
      setCurrentUserIdState(userId);

      // Atualiza último acesso
      await db.usuarios.update(userId, {
        ultimo_acesso: new Date(),
      });

      console.log(`✓ Usuário alterado para: ${user.nome}`);

      // Força reload da página para recarregar todos os dados do novo usuário
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao trocar usuário:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    await loadCurrentUser();
  }, [loadCurrentUser]);

  const value: AuthContextValue = {
    currentUser,
    currentUserId,
    isLoading,
    isTestMode: currentUserId === 'usuario-teste',
    setCurrentUser,
    refreshCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acessar o contexto de autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}

/**
 * Hook para obter apenas o ID do usuário atual (sem re-renders)
 * Útil para services que só precisam do ID
 */
export function useCurrentUserId(): string {
  // Lê direto do localStorage para evitar dependência do contexto
  if (typeof window === 'undefined') {
    return 'usuario-producao';
  }

  return getCurrentUserId();
}
