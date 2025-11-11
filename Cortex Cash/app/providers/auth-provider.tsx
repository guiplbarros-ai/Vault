'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Usuario, UserRole } from '@/lib/types';
import { authService, type LoginDTO, type RegisterDTO } from '@/lib/services/auth.service';

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasRole: (role: UserRole) => boolean;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => void;
  updateUser: (data: { nome?: string; avatar_url?: string }) => Promise<void>;
  changePassword: (senhaAtual: string, novaSenha: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega usuário da sessão
  const loadUser = useCallback(async () => {
    console.log('[AuthProvider] loadUser: Iniciando...');
    try {
      setIsLoading(true);
      const usuario = await authService.getCurrentUser();

      if (usuario) {
        console.log('[AuthProvider] loadUser: Usuário carregado com sucesso:', usuario.email);
        setUser(usuario);
      } else {
        console.log('[AuthProvider] loadUser: Nenhum usuário encontrado, setando como null');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthProvider] loadUser: Erro ao carregar usuário:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('[AuthProvider] loadUser: Concluído');
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login com email e senha
  const login = useCallback(async (data: LoginDTO) => {
    try {
      setIsLoading(true);
      await authService.login(data);
      const usuario = await authService.getCurrentUser();
      setUser(usuario);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Registra novo usuário
  const register = useCallback(async (data: RegisterDTO) => {
    try {
      setIsLoading(true);
      const usuario = await authService.register(data);

      // Faz login automaticamente após registro
      await authService.login({
        email: data.email,
        senha: data.senha
      });

      setUser(usuario);
    } catch (error) {
      console.error('Erro ao registrar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    // Redireciona para onboarding após logout
    router.push('/onboarding');
  }, [router]);

  // Atualiza dados do usuário
  const updateUser = useCallback(async (data: { nome?: string; avatar_url?: string }) => {
    if (!user) {
      throw new Error('Nenhum usuário logado');
    }

    try {
      const updated = await authService.updateProfile(data);
      setUser(updated);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }, [user]);

  // Altera senha
  const changePassword = useCallback(async (senhaAtual: string, novaSenha: string) => {
    try {
      await authService.changePassword(senhaAtual, novaSenha);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }, []);

  // Recarrega usuário
  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  // Verifica se tem role específico
  const hasRole = useCallback((role: UserRole) => {
    return user?.role === role && user?.ativo === true;
  }, [user]);

  // Verifica se é admin
  const isAdmin = user?.role === 'admin' && user?.ativo === true;
  const isAuthenticated = user !== null;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    hasRole,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
