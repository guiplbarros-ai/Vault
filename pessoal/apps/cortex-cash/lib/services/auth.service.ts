/**
 * Serviço de Autenticação
 * Agent CORE: Multi-User System
 *
 * Gerencia login, cadastro, logout e sessão via Supabase Auth
 */

import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type { Usuario } from '../types'

export interface LoginDTO {
  email: string
  senha: string
}

export interface RegisterDTO {
  nome: string
  email: string
  senha: string
}

export interface AuthSession {
  userId: string
  email: string
  nome: string
  role: string
  expiresAt: number // timestamp
}

export class AuthService {
  /**
   * Registra um novo usuário via Supabase Auth
   */
  async register(data: RegisterDTO): Promise<Usuario> {
    try {
      if (!data.email || !data.email.includes('@')) {
        throw new ValidationError('Email inválido')
      }

      if (!data.nome || data.nome.trim().length === 0) {
        throw new ValidationError('Nome é obrigatório')
      }

      if (!data.senha || data.senha.length < 8) {
        throw new ValidationError('Senha deve ter pelo menos 8 caracteres')
      }

      const supabase = getSupabase()

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.senha,
        options: {
          data: {
            nome: data.nome.trim(),
            role: 'user',
          },
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          throw new ValidationError('Este email já está cadastrado')
        }
        throw new DatabaseError('Erro ao registrar usuário', error as unknown as Error)
      }

      if (!authData.user) {
        throw new DatabaseError('Erro ao criar usuário')
      }

      // Upsert profile in profiles table
      const profileData = {
        id: authData.user.id,
        nome: data.nome.trim(),
        email: data.email.toLowerCase().trim(),
        role: 'user' as const,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData)

      if (profileError) {
        console.error('Erro ao criar profile:', profileError)
      }

      return this._authUserToUsuario(authData.user, data.nome.trim(), 'user')
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Erro ao registrar usuário', error as Error)
    }
  }

  /**
   * Faz login via Supabase Auth
   */
  async login(data: LoginDTO): Promise<AuthSession> {
    try {
      if (!data.email || !data.senha) {
        throw new ValidationError('Email e senha são obrigatórios')
      }

      const supabase = getSupabase()

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.senha,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new ValidationError('Email ou senha incorretos')
        }
        throw new DatabaseError('Erro ao fazer login', error as unknown as Error)
      }

      if (!authData.user || !authData.session) {
        throw new ValidationError('Erro ao criar sessão')
      }

      const nome = authData.user.user_metadata?.nome || authData.user.email || ''
      const role = authData.user.user_metadata?.role || 'user'

      const session: AuthSession = {
        userId: authData.user.id,
        email: authData.user.email || '',
        nome,
        role,
        expiresAt: new Date(authData.session.expires_at || 0).getTime() * 1000,
      }

      return session
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Erro ao fazer login', error as Error)
    }
  }

  /**
   * Faz logout do usuário via Supabase Auth
   */
  async logout(): Promise<void> {
    const supabase = getSupabase()
    await supabase.auth.signOut()
  }

  /**
   * Retorna a sessão atual (se válida)
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        return null
      }

      const user = session.user
      const nome = user.user_metadata?.nome || user.email || ''
      const role = user.user_metadata?.role || 'user'

      return {
        userId: user.id,
        email: user.email || '',
        nome,
        role,
        expiresAt: new Date(session.expires_at || 0).getTime() * 1000,
      }
    } catch {
      return null
    }
  }

  /**
   * Verifica se usuário está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    const userId = await this.getCurrentUserId()
    return userId !== null
  }

  /**
   * Retorna o ID do usuário autenticado
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id || null
    } catch {
      return null
    }
  }

  /**
   * Retorna o usuário autenticado completo
   */
  async getCurrentUser(): Promise<Usuario | null> {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return null
      }

      // Try to get from profiles table first
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        return this._profileToUsuario(profile)
      }

      // Fallback to auth user metadata
      const nome = user.user_metadata?.nome || user.email || ''
      const role = user.user_metadata?.role || 'user'
      return this._authUserToUsuario(user, nome, role)
    } catch {
      return null
    }
  }

  /**
   * Verifica se usuário é admin
   */
  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.role === 'admin'
  }

  /**
   * Atualiza dados do usuário autenticado
   */
  async updateProfile(data: { nome?: string; avatar_url?: string }): Promise<Usuario> {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new ValidationError('Usuário não autenticado')
      }

      // Update auth metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...(data.nome ? { nome: data.nome } : {}),
          ...(data.avatar_url ? { avatar_url: data.avatar_url } : {}),
        },
      })

      if (metaError) {
        throw new DatabaseError('Erro ao atualizar metadata', metaError as unknown as Error)
      }

      // Update profile table
      const { data: updated, error: profileError } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (profileError || !updated) {
        // If no profile row, create one
        const nome = data.nome || user.user_metadata?.nome || user.email || ''
        const role = user.user_metadata?.role || 'user'
        const { data: upserted, error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            nome,
            email: user.email || '',
            role,
            ativo: true,
            ...data,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (upsertError || !upserted) {
          throw new DatabaseError('Erro ao atualizar perfil')
        }
        return this._profileToUsuario(upserted)
      }

      return this._profileToUsuario(updated)
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof DatabaseError
      ) {
        throw error
      }
      throw new DatabaseError('Erro ao atualizar perfil', error as Error)
    }
  }

  /**
   * Altera a senha do usuário autenticado
   */
  async changePassword(senhaAtual: string, novaSenha: string): Promise<void> {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new ValidationError('Usuário não autenticado')
      }

      if (!novaSenha || novaSenha.length < 8) {
        throw new ValidationError('Nova senha deve ter pelo menos 8 caracteres')
      }

      // Verify current password by re-signing in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: senhaAtual,
      })

      if (verifyError) {
        throw new ValidationError('Senha atual incorreta')
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: novaSenha })

      if (error) {
        throw new DatabaseError('Erro ao alterar senha', error as unknown as Error)
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Erro ao alterar senha', error as Error)
    }
  }

  // ── Private helpers ────────────────────────────────────────────────

  private _authUserToUsuario(user: { id: string; email?: string }, nome: string, role: string): Usuario {
    return {
      id: user.id,
      nome,
      email: user.email || '',
      senha_hash: '',
      role: role as 'admin' | 'user',
      ativo: true,
      created_at: new Date(),
      updated_at: new Date(),
    }
  }

  private _profileToUsuario(profile: Record<string, unknown>): Usuario {
    return {
      id: profile.id as string,
      nome: (profile.nome as string) || '',
      email: (profile.email as string) || '',
      senha_hash: '',
      role: (profile.role as 'admin' | 'user') || 'user',
      avatar_url: profile.avatar_url as string | undefined,
      telefone: profile.telefone as string | undefined,
      data_nascimento: profile.data_nascimento ? new Date(profile.data_nascimento as string) : undefined,
      cpf: profile.cpf as string | undefined,
      biografia: profile.biografia as string | undefined,
      tema_preferido: profile.tema_preferido as string | undefined,
      moeda_preferida: profile.moeda_preferida as string | undefined,
      idioma_preferido: profile.idioma_preferido as string | undefined,
      ativo: profile.ativo !== false,
      ultimo_acesso: profile.ultimo_acesso ? new Date(profile.ultimo_acesso as string) : undefined,
      created_at: profile.created_at ? new Date(profile.created_at as string) : new Date(),
      updated_at: profile.updated_at ? new Date(profile.updated_at as string) : new Date(),
    }
  }
}

// Singleton instance
export const authService = new AuthService()
