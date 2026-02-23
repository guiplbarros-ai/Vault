/**
 * Serviço de Usuários
 * Gerenciamento de usuários e permissões via Supabase profiles
 */

import { getSupabase } from '../db/supabase'
import { DuplicateError, NotFoundError, ValidationError } from '../errors'
import type { UserRole, Usuario } from '../types'

export interface CreateUsuarioDTO {
  nome: string
  email: string
  role?: UserRole
  avatar_url?: string
  tema_preferido?: string
}

export interface UpdateUsuarioDTO {
  nome?: string
  email?: string
  role?: UserRole
  avatar_url?: string
  tema_preferido?: string
  ativo?: boolean
}

export interface UpdatePerfilDTO {
  nome?: string
  telefone?: string
  data_nascimento?: Date
  cpf?: string
  biografia?: string
  avatar_url?: string
  moeda_preferida?: string
  idioma_preferido?: string
  tema_preferido?: string
}

function rowToUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: row.id as string,
    nome: (row.nome as string) || '',
    email: (row.email as string) || '',
    senha_hash: '',
    role: (row.role as 'admin' | 'user') || 'user',
    avatar_url: row.avatar_url as string | undefined,
    telefone: row.telefone as string | undefined,
    data_nascimento: row.data_nascimento ? new Date(row.data_nascimento as string) : undefined,
    cpf: row.cpf as string | undefined,
    biografia: row.biografia as string | undefined,
    tema_preferido: row.tema_preferido as string | undefined,
    moeda_preferida: row.moeda_preferida as string | undefined,
    idioma_preferido: row.idioma_preferido as string | undefined,
    ativo: row.ativo !== false,
    ultimo_acesso: row.ultimo_acesso ? new Date(row.ultimo_acesso as string) : undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
}

export class UsuarioService {
  /**
   * Lista todos os usuários
   */
  async listUsuarios(options?: {
    incluirInativos?: boolean
    role?: UserRole
    limit?: number
    offset?: number
  }): Promise<Usuario[]> {
    try {
      const supabase = getSupabase()
      const { incluirInativos = false, role, limit, offset } = options || {}

      let query = supabase.from('profiles').select('*').order('created_at', { ascending: true })

      if (!incluirInativos) {
        query = query.eq('ativo', true)
      }

      if (role) {
        query = query.eq('role', role)
      }

      if (limit !== undefined) {
        query = query.limit(limit)
      }

      if (offset !== undefined) {
        query = query.range(offset, offset + (limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(rowToUsuario)
    } catch (error: unknown) {
      console.error('Erro ao listar usuários:', error)
      throw error
    }
  }

  /**
   * Busca usuário por ID
   */
  async getUsuarioById(id: string): Promise<Usuario | null> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data ? rowToUsuario(data) : null
    } catch (error: unknown) {
      console.error(`Erro ao buscar usuário ${id}:`, error)
      throw error
    }
  }

  /**
   * Busca usuário por email
   */
  async getUsuarioByEmail(email: string): Promise<Usuario | null> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (error) throw error

      return data ? rowToUsuario(data) : null
    } catch (error: unknown) {
      console.error(`Erro ao buscar usuário por email ${email}:`, error)
      throw error
    }
  }

  /**
   * Cria novo usuário (apenas profile — auth user deve ser criado via authService.register)
   */
  async createUsuario(data: CreateUsuarioDTO): Promise<Usuario> {
    try {
      if (!data.nome || !data.email) {
        throw new ValidationError('Nome e email são obrigatórios')
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new ValidationError('Email inválido')
      }

      const existente = await this.getUsuarioByEmail(data.email)
      if (existente) {
        throw new DuplicateError(`Usuário com email ${data.email} já existe`)
      }

      const supabase = getSupabase()
      const now = new Date().toISOString()

      const { data: inserted, error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          nome: data.nome,
          email: data.email.toLowerCase().trim(),
          role: data.role || 'user',
          avatar_url: data.avatar_url,
          tema_preferido: data.tema_preferido || 'auto',
          ativo: true,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw error

      return rowToUsuario(inserted)
    } catch (error: unknown) {
      console.error('Erro ao criar usuário:', error)
      throw error
    }
  }

  /**
   * Atualiza usuário
   */
  async updateUsuario(id: string, data: UpdateUsuarioDTO): Promise<Usuario> {
    try {
      const usuario = await this.getUsuarioById(id)
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`)
      }

      if (data.email && data.email !== usuario.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(data.email)) {
          throw new ValidationError('Email inválido')
        }

        const existente = await this.getUsuarioByEmail(data.email)
        if (existente) {
          throw new DuplicateError(`Email ${data.email} já está em uso`)
        }
      }

      const supabase = getSupabase()
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return rowToUsuario(updated)
    } catch (error: unknown) {
      console.error(`Erro ao atualizar usuário ${id}:`, error)
      throw error
    }
  }

  /**
   * Atualiza perfil do usuário
   */
  async updatePerfil(id: string, data: UpdatePerfilDTO): Promise<Usuario> {
    try {
      const usuario = await this.getUsuarioById(id)
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`)
      }

      if (data.telefone) {
        const telefoneNumeros = data.telefone.replace(/\D/g, '')
        if (telefoneNumeros.length < 10 || telefoneNumeros.length > 11) {
          throw new ValidationError('Telefone inválido. Use formato: (XX) XXXXX-XXXX')
        }
      }

      if (data.cpf) {
        const cpfNumeros = data.cpf.replace(/\D/g, '')
        if (cpfNumeros.length !== 11) {
          throw new ValidationError('CPF inválido. Use formato: XXX.XXX.XXX-XX')
        }
      }

      const supabase = getSupabase()
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          data_nascimento: data.data_nascimento ? data.data_nascimento.toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return rowToUsuario(updated)
    } catch (error: unknown) {
      console.error(`Erro ao atualizar perfil do usuário ${id}:`, error)
      throw error
    }
  }

  /**
   * Deleta usuário (soft delete)
   */
  async deleteUsuario(id: string): Promise<void> {
    try {
      const usuario = await this.getUsuarioById(id)
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`)
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (error: unknown) {
      console.error(`Erro ao deletar usuário ${id}:`, error)
      throw error
    }
  }

  /**
   * Ativa usuário
   */
  async ativarUsuario(id: string): Promise<void> {
    try {
      const usuario = await this.getUsuarioById(id)
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`)
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: true, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (error: unknown) {
      console.error(`Erro ao ativar usuário ${id}:`, error)
      throw error
    }
  }

  /**
   * Atualiza último acesso
   */
  async updateUltimoAcesso(id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('profiles')
        .update({
          ultimo_acesso: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error(`Erro ao atualizar último acesso do usuário ${id}:`, error)
      }
    } catch (error: unknown) {
      console.error(`Erro ao atualizar último acesso do usuário ${id}:`, error)
    }
  }

  /**
   * Verifica se é admin
   */
  async isAdmin(id: string): Promise<boolean> {
    try {
      const usuario = await this.getUsuarioById(id)
      return usuario?.role === 'admin' && usuario?.ativo === true
    } catch (error: unknown) {
      console.error(`Erro ao verificar se usuário ${id} é admin:`, error)
      return false
    }
  }

  /**
   * Lista todos os admins
   */
  async listAdmins(): Promise<Usuario[]> {
    try {
      return await this.listUsuarios({ role: 'admin', incluirInativos: false })
    } catch (error: unknown) {
      console.error('Erro ao listar admins:', error)
      throw error
    }
  }

  /**
   * Conta total de usuários
   */
  async countUsuarios(options?: { incluirInativos?: boolean; role?: UserRole }): Promise<number> {
    try {
      const supabase = getSupabase()
      let query = supabase.from('profiles').select('*', { count: 'exact', head: true })

      if (!options?.incluirInativos) {
        query = query.eq('ativo', true)
      }

      if (options?.role) {
        query = query.eq('role', options.role)
      }

      const { count, error } = await query

      if (error) throw error

      return count || 0
    } catch (error: unknown) {
      console.error('Erro ao contar usuários:', error)
      return 0
    }
  }

  /**
   * Verifica se existe algum admin no sistema
   */
  async hasAdmin(): Promise<boolean> {
    try {
      const count = await this.countUsuarios({ role: 'admin', incluirInativos: false })
      return count > 0
    } catch (error: unknown) {
      console.error('Erro ao verificar existência de admin:', error)
      return false
    }
  }
}

// Singleton
export const usuarioService = new UsuarioService()
