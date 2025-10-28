/**
 * Services Layer - Cortex Ledger
 *
 * Camada de serviços que encapsula toda a lógica de negócio
 * relacionada a cartões de crédito e faturas.
 *
 * Uso:
 * ```typescript
 * import { CartaoService, FaturaService } from '@/lib/services'
 * import { supabase } from '@/lib/supabase'
 *
 * const cartaoService = new CartaoService(supabase)
 * const faturaService = new FaturaService(supabase)
 *
 * // Listar cartões
 * const cartoes = await cartaoService.listarCartoes()
 *
 * // Buscar fatura
 * const fatura = await faturaService.buscarFatura(id)
 * ```
 */

export { CartaoService } from './cartao.service'
export { FaturaService } from './fatura.service'

// Re-export types for convenience
export type {
  CartaoCredito,
  CartaoFormInput,
  Fatura,
  FaturaPagamentoInput,
  ResumoCartoes,
  FaturaDetalhesResponse,
} from '@/types/cartao'
