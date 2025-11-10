/**
 * Serviço de Autenticação
 * Agent CORE: Multi-User System
 *
 * Gerencia login, cadastro, logout e sessão de usuários
 */

import bcrypt from 'bcryptjs';
import { getDB } from '../db/client';
import type { Usuario } from '../types';
import { ValidationError, NotFoundError, DatabaseError } from '../errors';

const SALT_ROUNDS = 10;
const AUTH_STORAGE_KEY = 'cortex-auth-session';

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface RegisterDTO {
  nome: string;
  email: string;
  senha: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  nome: string;
  role: string;
  expiresAt: number; // timestamp
}

export class AuthService {
  /**
   * Registra um novo usuário
   */
  async register(data: RegisterDTO): Promise<Usuario> {
    try {
      const db = getDB();

      // Validar dados
      if (!data.email || !data.email.includes('@')) {
        throw new ValidationError('Email inválido');
      }

      if (!data.senha || data.senha.length < 6) {
        throw new ValidationError('Senha deve ter pelo menos 6 caracteres');
      }

      if (!data.nome || data.nome.trim().length === 0) {
        throw new ValidationError('Nome é obrigatório');
      }

      // Verificar se email já existe
      const existingUser = await db.usuarios
        .where('email')
        .equalsIgnoreCase(data.email)
        .first();

      if (existingUser) {
        throw new ValidationError('Este email já está cadastrado');
      }

      // Hash da senha
      const senha_hash = await bcrypt.hash(data.senha, SALT_ROUNDS);

      // Criar usuário
      const id = crypto.randomUUID();
      const now = new Date();

      const usuario: Usuario = {
        id,
        nome: data.nome.trim(),
        email: data.email.toLowerCase().trim(),
        senha_hash,
        role: 'user', // Primeiro usuário não é admin, mas pode ser promovido depois
        ativo: true,
        created_at: now,
        updated_at: now,
      };

      await db.usuarios.add(usuario);

      return usuario;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao registrar usuário', error as Error);
    }
  }

  /**
   * Faz login de um usuário
   */
  async login(data: LoginDTO): Promise<AuthSession> {
    try {
      const db = getDB();

      // Validar dados
      if (!data.email || !data.senha) {
        throw new ValidationError('Email e senha são obrigatórios');
      }

      // Buscar usuário por email
      const usuario = await db.usuarios
        .where('email')
        .equalsIgnoreCase(data.email.trim())
        .first();

      if (!usuario) {
        throw new ValidationError('Email não cadastrado. Crie uma conta primeiro.');
      }

      // Verificar se usuário está ativo
      if (!usuario.ativo) {
        throw new ValidationError('Usuário inativo. Entre em contato com o suporte.');
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(data.senha, usuario.senha_hash);

      if (!senhaValida) {
        throw new ValidationError('Senha incorreta');
      }

      // Atualizar último acesso
      await db.usuarios.update(usuario.id, {
        ultimo_acesso: new Date(),
        updated_at: new Date(),
      });

      // Criar sessão
      const session: AuthSession = {
        userId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 dias
      };

      // Salvar no localStorage
      this.saveSession(session);

      return session;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erro ao fazer login', error as Error);
    }
  }

  /**
   * Faz logout do usuário
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // Também remove o old key do multi-user system
      localStorage.removeItem('cortex-cash-current-user-id');
    }
  }

  /**
   * Retorna a sessão atual (se válida)
   */
  getSession(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const sessionStr = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!sessionStr) {
        return null;
      }

      const session: AuthSession = JSON.parse(sessionStr);

      // Verificar se sessão expirou
      if (session.expiresAt < Date.now()) {
        this.logout();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Erro ao recuperar sessão:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Retorna o ID do usuário autenticado
   */
  getCurrentUserId(): string | null {
    const session = this.getSession();
    return session?.userId || null;
  }

  /**
   * Retorna o usuário autenticado completo
   */
  async getCurrentUser(): Promise<Usuario | null> {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    try {
      const db = getDB();
      const usuario = await db.usuarios.get(session.userId);
      return usuario || null;
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      return null;
    }
  }

  /**
   * Verifica se usuário é admin
   */
  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   * Atualiza dados do usuário autenticado
   */
  async updateProfile(data: { nome?: string; avatar_url?: string }): Promise<Usuario> {
    try {
      const session = this.getSession();
      if (!session) {
        throw new ValidationError('Usuário não autenticado');
      }

      const db = getDB();
      const usuario = await db.usuarios.get(session.userId);

      if (!usuario) {
        throw new NotFoundError('Usuário', session.userId);
      }

      await db.usuarios.update(session.userId, {
        ...data,
        updated_at: new Date(),
      });

      // Atualizar sessão com novo nome se foi alterado
      if (data.nome) {
        session.nome = data.nome;
        this.saveSession(session);
      }

      const updated = await db.usuarios.get(session.userId);
      if (!updated) {
        throw new DatabaseError('Erro ao recuperar usuário atualizado');
      }

      return updated;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar perfil', error as Error);
    }
  }

  /**
   * Altera a senha do usuário autenticado
   */
  async changePassword(senhaAtual: string, novaSenha: string): Promise<void> {
    try {
      const session = this.getSession();
      if (!session) {
        throw new ValidationError('Usuário não autenticado');
      }

      if (!novaSenha || novaSenha.length < 6) {
        throw new ValidationError('Nova senha deve ter pelo menos 6 caracteres');
      }

      const db = getDB();
      const usuario = await db.usuarios.get(session.userId);

      if (!usuario) {
        throw new NotFoundError('Usuário', session.userId);
      }

      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
      if (!senhaValida) {
        throw new ValidationError('Senha atual incorreta');
      }

      // Hash da nova senha
      const senha_hash = await bcrypt.hash(novaSenha, SALT_ROUNDS);

      await db.usuarios.update(session.userId, {
        senha_hash,
        updated_at: new Date(),
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erro ao alterar senha', error as Error);
    }
  }

  /**
   * Salva sessão no localStorage
   */
  private saveSession(session: AuthSession): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      // Manter compatibilidade com código antigo
      localStorage.setItem('cortex-cash-current-user-id', session.userId);
    }
  }
}

// Singleton instance
export const authService = new AuthService();
