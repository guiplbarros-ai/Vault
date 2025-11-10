/**
 * Seed de Usuários Padrão
 * Agent CORE: Sistema Multi-Usuário
 *
 * Cria os usuários padrão do sistema:
 * - Produção: Dados reais do usuário
 * - Teste: Dados de exemplo para experimentação
 *
 * IMPORTANTE: Estes usuários NÃO devem mais ser usados.
 * O sistema agora requer autenticação real com cadastro/login.
 * Este seed é mantido apenas para compatibilidade com dados antigos.
 */

import bcrypt from 'bcryptjs';
import { getDB } from './client';
import type { Usuario } from '../types';

// Hash de senha padrão: "123456" (apenas para migração/compatibilidade)
const DEFAULT_PASSWORD_HASH = '$2a$10$YQ3p5kZ8qZ7p5kZ8qZ7p5.YQ3p5kZ8qZ7p5kZ8qZ7p5kZ8qZ7p5kZ'; // bcrypt('123456')

export const USUARIOS_PADRAO: Omit<Usuario, 'created_at' | 'updated_at'>[] = [
  {
    id: 'usuario-producao',
    nome: '📊 Produção',
    email: 'producao@cortexcash.local',
    senha_hash: DEFAULT_PASSWORD_HASH, // Senha temporária: "123456"
    role: 'admin',
    ativo: false, // Desativado - usuário deve criar conta real
  },
  {
    id: 'usuario-teste',
    nome: '🧪 Teste',
    email: 'teste@cortexcash.local',
    senha_hash: DEFAULT_PASSWORD_HASH, // Senha temporária: "123456"
    role: 'user',
    ativo: false, // Desativado - usuário deve criar conta real
  },
];

/**
 * Verifica se já existem usuários no banco
 */
export async function hasUsuarios(): Promise<boolean> {
  const db = getDB();
  const count = await db.usuarios.count();
  return count > 0;
}

/**
 * Popula o banco com usuários padrão
 */
export async function seedUsuarios(): Promise<void> {
  const db = getDB();
  const alreadyHas = await hasUsuarios();

  if (alreadyHas) {
    console.log('✓ Usuários já existem, pulando seed...');
    return;
  }

  const now = new Date();

  const usuarios: Usuario[] = USUARIOS_PADRAO.map((user) => ({
    ...user,
    created_at: now,
    updated_at: now,
  }));

  try {
    await db.usuarios.bulkAdd(usuarios);
    console.log(`✓ ${usuarios.length} usuários padrão criados com sucesso!`);
    console.log('  - 📊 Produção: Dados reais');
    console.log('  - 🧪 Teste: Dados de exemplo');

    // Define o usuário Produção como ativo por padrão
    if (typeof window !== 'undefined') {
      const currentUserId = localStorage.getItem('cortex-cash-current-user-id');
      if (!currentUserId) {
        localStorage.setItem('cortex-cash-current-user-id', 'usuario-producao');
        console.log('✓ Usuário ativo definido como Produção');
      }
    }
  } catch (error: any) {
    if (error?.name !== 'ConstraintError') {
      throw error;
    }
    console.log('⚠️ Alguns usuários já existem, pulando duplicatas...');
  }
}

/**
 * Retorna o ID do usuário atualmente ativo
 * IMPORTANTE: Agora usa authService.getCurrentUserId() para suportar autenticação real
 * Fallback para Produção se não houver nenhum definido
 */
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') {
    return 'usuario-producao'; // Default no SSR
  }

  // Tenta pegar do authService primeiro (novo sistema com autenticação)
  try {
    const { authService } = require('../services/auth.service');
    const userId = authService.getCurrentUserId();
    if (userId) {
      return userId;
    }
  } catch (error) {
    // authService pode não estar disponível ainda (durante inicialização)
    // Continua para fallback
  }

  // Fallback: old system (compatibilidade com usuários sem login)
  const userId = localStorage.getItem('cortex-cash-current-user-id');
  return userId || 'usuario-producao';
}

/**
 * Define o usuário ativo
 */
export function setCurrentUserId(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cortex-cash-current-user-id', userId);
    console.log(`✓ Usuário ativo alterado para: ${userId}`);
  }
}

/**
 * Verifica se está no modo teste
 */
export function isTestMode(): boolean {
  return getCurrentUserId() === 'usuario-teste';
}
