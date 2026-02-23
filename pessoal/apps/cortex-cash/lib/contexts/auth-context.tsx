'use client'

/**
 * Contexto de Autenticação — shim de compatibilidade
 * Agent CORE: Sistema Multi-Usuário
 *
 * A implementação completa foi migrada para app/providers/auth-provider.tsx
 * que usa Supabase Auth. Este arquivo re-exporta tudo de lá para
 * manter compatibilidade com qualquer import existente.
 */

export { AuthProvider, useAuth } from '@/app/providers/auth-provider'
