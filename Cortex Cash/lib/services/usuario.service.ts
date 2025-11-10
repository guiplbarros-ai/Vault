/**
 * Serviço de Usuários
 * Gerenciamento de usuários e permissões
 */

import { getDB } from '../db/client';
import type { Usuario, UserRole } from '../types';
import { NotFoundError, ValidationError, DuplicateError } from '../errors';

export interface CreateUsuarioDTO {
  nome: string;
  email: string;
  role?: UserRole;
  avatar_url?: string;
  tema_preferido?: string;
}

export interface UpdateUsuarioDTO {
  nome?: string;
  email?: string;
  role?: UserRole;
  avatar_url?: string;
  tema_preferido?: string;
  ativo?: boolean;
}

export interface UpdatePerfilDTO {
  nome?: string;
  telefone?: string;
  data_nascimento?: Date;
  cpf?: string;
  biografia?: string;
  avatar_url?: string;
  moeda_preferida?: string;
  idioma_preferido?: string;
  tema_preferido?: string;
}

export class UsuarioService {
  /**
   * Lista todos os usuários
   */
  async listUsuarios(options?: {
    incluirInativos?: boolean;
    role?: UserRole;
    limit?: number;
    offset?: number;
  }): Promise<Usuario[]> {
    try {
      const db = getDB();
      const { incluirInativos = false, role, limit, offset } = options || {};

      let usuarios: Usuario[] = await db.usuarios.toArray();

      // Filtros
      if (!incluirInativos) {
        usuarios = usuarios.filter(u => u.ativo === true);
      }
      if (role) {
        usuarios = usuarios.filter(u => u.role === role);
      }

      // Paginação
      if (limit !== undefined || offset !== undefined) {
        const start = offset || 0;
        const end = limit ? start + limit : undefined;
        usuarios = usuarios.slice(start, end);
      }

      return usuarios;
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  /**
   * Busca usuário por ID
   */
  async getUsuarioById(id: string): Promise<Usuario | null> {
    try {
      const db = getDB();
      const usuario = await db.usuarios.get(id);
      return usuario || null;
    } catch (error: any) {
      console.error(`Erro ao buscar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca usuário por email
   */
  async getUsuarioByEmail(email: string): Promise<Usuario | null> {
    try {
      const db = getDB();
      const usuario = await db.usuarios.where('email').equals(email).first();
      return usuario || null;
    } catch (error: any) {
      console.error(`Erro ao buscar usuário por email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Cria novo usuário
   */
  async createUsuario(data: CreateUsuarioDTO): Promise<Usuario> {
    try {
      const db = getDB();

      // Validações
      if (!data.nome || !data.email) {
        throw new ValidationError('Nome e email são obrigatórios');
      }

      // Email válido (regex simples)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new ValidationError('Email inválido');
      }

      // Verifica se email já existe
      const existente = await this.getUsuarioByEmail(data.email);
      if (existente) {
        throw new DuplicateError(`Usuário com email ${data.email} já existe`);
      }

      const novoUsuario: Usuario = {
        id: crypto.randomUUID(),
        nome: data.nome,
        email: data.email,
        senha_hash: '', // Senha será definida posteriormente
        role: data.role || 'user',
        avatar_url: data.avatar_url,
        tema_preferido: data.tema_preferido || 'auto',
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db.usuarios.add(novoUsuario);

      return novoUsuario;
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza usuário
   */
  async updateUsuario(id: string, data: UpdateUsuarioDTO): Promise<Usuario> {
    try {
      const db = getDB();

      // Verifica se usuário existe
      const usuario = await this.getUsuarioById(id);
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`);
      }

      // Se está alterando email, verifica se novo email já existe
      if (data.email && data.email !== usuario.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          throw new ValidationError('Email inválido');
        }

        const existente = await this.getUsuarioByEmail(data.email);
        if (existente) {
          throw new DuplicateError(`Email ${data.email} já está em uso`);
        }
      }

      const updateData = {
        ...usuario,
        ...data,
        updated_at: new Date(),
      };

      await db.usuarios.update(id, updateData);

      return updateData;
    } catch (error: any) {
      console.error(`Erro ao atualizar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza perfil do usuário
   */
  async updatePerfil(id: string, data: UpdatePerfilDTO): Promise<Usuario> {
    try {
      const db = getDB();

      // Verifica se usuário existe
      const usuario = await this.getUsuarioById(id);
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`);
      }

      // Validações específicas
      if (data.telefone) {
        // Remove caracteres não numéricos
        const telefoneNumeros = data.telefone.replace(/\D/g, '');
        if (telefoneNumeros.length < 10 || telefoneNumeros.length > 11) {
          throw new ValidationError('Telefone inválido. Use formato: (XX) XXXXX-XXXX');
        }
      }

      if (data.cpf) {
        // Remove caracteres não numéricos
        const cpfNumeros = data.cpf.replace(/\D/g, '');
        if (cpfNumeros.length !== 11) {
          throw new ValidationError('CPF inválido. Use formato: XXX.XXX.XXX-XX');
        }
      }

      const updateData = {
        ...usuario,
        ...data,
        updated_at: new Date(),
      };

      await db.usuarios.update(id, updateData);

      return updateData;
    } catch (error: any) {
      console.error(`Erro ao atualizar perfil do usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deleta usuário (soft delete)
   */
  async deleteUsuario(id: string): Promise<void> {
    try {
      const db = getDB();
      const usuario = await this.getUsuarioById(id);
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`);
      }

      // Soft delete
      await db.usuarios.update(id, {
        ...usuario,
        ativo: false,
        updated_at: new Date(),
      });
    } catch (error: any) {
      console.error(`Erro ao deletar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Ativa usuário
   */
  async ativarUsuario(id: string): Promise<void> {
    try {
      const db = getDB();
      const usuario = await this.getUsuarioById(id);
      if (!usuario) {
        throw new NotFoundError(`Usuário ${id} não encontrado`);
      }

      await db.usuarios.update(id, {
        ...usuario,
        ativo: true,
        updated_at: new Date(),
      });
    } catch (error: any) {
      console.error(`Erro ao ativar usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza último acesso
   */
  async updateUltimoAcesso(id: string): Promise<void> {
    try {
      const db = getDB();
      const usuario = await this.getUsuarioById(id);
      if (!usuario) return;

      await db.usuarios.update(id, {
        ...usuario,
        ultimo_acesso: new Date(),
        updated_at: new Date(),
      });
    } catch (error: any) {
      console.error(`Erro ao atualizar último acesso do usuário ${id}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se é admin
   */
  async isAdmin(id: string): Promise<boolean> {
    try {
      const usuario = await this.getUsuarioById(id);
      return usuario?.role === 'admin' && usuario?.ativo === true;
    } catch (error: any) {
      console.error(`Erro ao verificar se usuário ${id} é admin:`, error);
      return false;
    }
  }

  /**
   * Lista todos os admins
   */
  async listAdmins(): Promise<Usuario[]> {
    try {
      return await this.listUsuarios({ role: 'admin', incluirInativos: false });
    } catch (error: any) {
      console.error('Erro ao listar admins:', error);
      throw error;
    }
  }

  /**
   * Conta total de usuários
   */
  async countUsuarios(options?: { incluirInativos?: boolean; role?: UserRole }): Promise<number> {
    try {
      const usuarios = await this.listUsuarios(options);
      return usuarios.length;
    } catch (error: any) {
      console.error('Erro ao contar usuários:', error);
      return 0;
    }
  }

  /**
   * Verifica se existe algum admin no sistema
   */
  async hasAdmin(): Promise<boolean> {
    try {
      const count = await this.countUsuarios({ role: 'admin', incluirInativos: false });
      return count > 0;
    } catch (error: any) {
      console.error('Erro ao verificar existência de admin:', error);
      return false;
    }
  }
}

// Singleton
export const usuarioService = new UsuarioService();
