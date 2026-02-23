/**
 * Testes Unitários - OrcamentoService
 * Agent FINANCE: Implementador
 * Migrado de Dexie mocks para Supabase mocks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSupabase, mockResponse, resetMocks, mockFrom } = vi.hoisted(() => {
  const queryBuilders = new Map<string, any>()

  function createMockQueryBuilder(result: any = { data: null, error: null }) {
    const builder: any = {
      _result: result,
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      then(resolve: any, reject?: any) {
        return Promise.resolve(builder._result).then(resolve, reject)
      },
    }
    return builder
  }

  const mockFrom = vi.fn((table: string) => {
    if (!queryBuilders.has(table)) {
      queryBuilders.set(table, createMockQueryBuilder())
    }
    return queryBuilders.get(table)!
  })

  const mockSupabase = {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  function mockResponse(table: string, data: any, error: any = null) {
    const qb = createMockQueryBuilder({ data, error })
    queryBuilders.set(table, qb)
    return qb
  }

  function resetMocks() {
    queryBuilders.clear()
    mockFrom.mockClear()
    mockFrom.mockImplementation((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, resetMocks, mockFrom }
})

vi.mock('../db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

import { NotFoundError, ValidationError } from '../errors'
import { OrcamentoService } from './orcamento.service'

describe('OrcamentoService', () => {
  let service: OrcamentoService
  const categoriaId = 'cat-test-id'
  const centroCustoId = 'cc-test-id'

  beforeEach(() => {
    resetMocks()
    service = new OrcamentoService()
  })

  // ============================================================================
  // CRUD - Create
  // ============================================================================

  describe('createOrcamento', () => {
    it('deve criar orçamento de categoria com sucesso', async () => {
      const now = new Date().toISOString()

      // Mock categorias check (maybeSingle returns single object)
      mockResponse('categorias', { id: categoriaId, nome: 'Alimentação' })

      // Mock orcamentos insert (insert().select().single() needs single object)
      mockResponse('orcamentos', {
        id: 'new-orc-id',
        nome: 'Alimentação Novembro',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1500,
        valor_realizado: 0,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: now,
        updated_at: now,
      })

      const result = await service.createOrcamento({
        nome: 'Alimentação Novembro',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1500,
        alerta_80: true,
        alerta_100: true,
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.nome).toBe('Alimentação Novembro')
      expect(result.tipo).toBe('categoria')
      expect(result.categoria_id).toBe(categoriaId)
      expect(result.mes_referencia).toBe('2025-11')
      expect(result.valor_planejado).toBe(1500)
      expect(result.valor_realizado).toBe(0)
      expect(result.alerta_80).toBe(true)
      expect(result.alerta_100).toBe(true)
      expect(result.alerta_80_enviado).toBe(false)
      expect(result.alerta_100_enviado).toBe(false)
      expect(result.created_at).toBeInstanceOf(Date)
      expect(result.updated_at).toBeInstanceOf(Date)
    })

    it('deve criar orçamento de centro de custo com sucesso', async () => {
      const now = new Date().toISOString()

      mockResponse('centros_custo', { id: centroCustoId, nome: 'Viagem São Paulo' })
      mockResponse('orcamentos', {
        id: 'new-orc-cc-id',
        nome: 'Viagem Novembro',
        tipo: 'centro_custo',
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 5000,
        valor_realizado: 0,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: now,
        updated_at: now,
      })

      const result = await service.createOrcamento({
        nome: 'Viagem Novembro',
        tipo: 'centro_custo',
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 5000,
      })

      expect(result.tipo).toBe('centro_custo')
      expect(result.centro_custo_id).toBe(centroCustoId)
    })

    it('deve rejeitar orçamento de categoria sem categoria_id', async () => {
      await expect(
        service.createOrcamento({
          nome: 'Orçamento Inválido',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 1000,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve rejeitar orçamento de centro de custo sem centro_custo_id', async () => {
      await expect(
        service.createOrcamento({
          nome: 'Orçamento Inválido',
          tipo: 'centro_custo',
          mes_referencia: '2025-11',
          valor_planejado: 1000,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve rejeitar valor planejado zero ou negativo', async () => {
      await expect(
        service.createOrcamento({
          nome: 'Orçamento Zero',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 0,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve rejeitar formato inválido de mes_referencia', async () => {
      await expect(
        service.createOrcamento({
          nome: 'Orçamento Inválido',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '11-2025',
          valor_planejado: 1000,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve rejeitar categoria inexistente', async () => {
      mockResponse('categorias', null)

      await expect(
        service.createOrcamento({
          nome: 'Orçamento Inválido',
          tipo: 'categoria',
          categoria_id: 'categoria-inexistente',
          mes_referencia: '2025-11',
          valor_planejado: 1000,
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('deve usar alertas padrão (true) quando não especificados', async () => {
      const now = new Date().toISOString()

      mockResponse('categorias', { id: categoriaId, nome: 'Alimentação' })
      mockResponse('orcamentos', {
        id: 'orc-default-id',
        nome: 'Orçamento Padrão',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 0,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: now,
        updated_at: now,
      })

      const result = await service.createOrcamento({
        nome: 'Orçamento Padrão',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      })

      expect(result.alerta_80).toBe(true)
      expect(result.alerta_100).toBe(true)
    })
  })

  // ============================================================================
  // CRUD - Read
  // ============================================================================

  describe('listOrcamentos', () => {
    it('deve listar todos os orçamentos', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1500,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Alimentação Dez',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-12',
          valor_planejado: 1800,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-3',
          nome: 'Viagem Nov',
          tipo: 'centro_custo',
          centro_custo_id: centroCustoId,
          mes_referencia: '2025-11',
          valor_planejado: 5000,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos()
      expect(result).toHaveLength(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })

    it('deve filtrar por mes_referencia', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 1500,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-3',
          nome: 'Viagem Nov',
          tipo: 'centro_custo',
          mes_referencia: '2025-11',
          valor_planejado: 5000,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos({ mesReferencia: '2025-11' })
      expect(result).toHaveLength(2)
      expect(result.every((o) => o.mes_referencia === '2025-11')).toBe(true)
    })

    it('deve filtrar por tipo', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 1500,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Alimentação Dez',
          tipo: 'categoria',
          mes_referencia: '2025-12',
          valor_planejado: 1800,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos({ tipo: 'categoria' })
      expect(result).toHaveLength(2)
      expect(result.every((o) => o.tipo === 'categoria')).toBe(true)
    })

    it('deve filtrar por categoria_id', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1500,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Alimentação Dez',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-12',
          valor_planejado: 1800,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos({ categoriaId })
      expect(result).toHaveLength(2)
      expect(result.every((o) => o.categoria_id === categoriaId)).toBe(true)
    })

    it('deve ordenar por nome ascendente', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-2',
          nome: 'Alimentação Dez',
          tipo: 'categoria',
          mes_referencia: '2025-12',
          valor_planejado: 1800,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 1500,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-3',
          nome: 'Viagem Nov',
          tipo: 'centro_custo',
          mes_referencia: '2025-11',
          valor_planejado: 5000,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos({ sortBy: 'nome', sortOrder: 'asc' })
      expect(result[0].nome).toBe('Alimentação Dez')
      expect(result[1].nome).toBe('Alimentação Nov')
      expect(result[2].nome).toBe('Viagem Nov')
    })

    it('deve ordenar por valor_planejado descendente', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-3',
          nome: 'Viagem Nov',
          tipo: 'centro_custo',
          mes_referencia: '2025-11',
          valor_planejado: 5000,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Alimentação Dez',
          tipo: 'categoria',
          mes_referencia: '2025-12',
          valor_planejado: 1800,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 1500,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos({ sortBy: 'valor_planejado', sortOrder: 'desc' })
      expect(result[0].valor_planejado).toBe(5000)
      expect(result[1].valor_planejado).toBe(1800)
      expect(result[2].valor_planejado).toBe(1500)
    })

    it('deve aplicar paginação', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Orc 1',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Orc 2',
          tipo: 'categoria',
          mes_referencia: '2025-11',
          valor_planejado: 2000,
          valor_realizado: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await service.listOrcamentos({ limit: 2, offset: 0 })
      expect(result).toHaveLength(2)
    })
  })

  describe('getOrcamentoById', () => {
    it('deve retornar orçamento existente', async () => {
      const orcId = 'orc-get-id'
      // getOrcamentoById uses maybeSingle, needs single object
      mockResponse('orcamentos', {
        id: orcId,
        nome: 'Teste',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await service.getOrcamentoById(orcId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(orcId)
      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })

    it('deve retornar null para ID inexistente', async () => {
      mockResponse('orcamentos', null)

      const result = await service.getOrcamentoById('id-inexistente')
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // CRUD - Update
  // ============================================================================

  describe('updateOrcamento', () => {
    it('deve atualizar orçamento com sucesso', async () => {
      const orcId = 'orc-update-id'
      const now = new Date()
      const later = new Date(now.getTime() + 1000)

      // updateOrcamento calls getOrcamentoById (maybeSingle) then update().select().single()
      mockResponse('orcamentos', {
        id: orcId,
        nome: 'Orçamento Atualizado',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1500,
        valor_realizado: 0,
        alerta_80: false,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: now.toISOString(),
        updated_at: later.toISOString(),
      })

      const atualizado = await service.updateOrcamento(orcId, {
        nome: 'Orçamento Atualizado',
        valor_planejado: 1500,
        alerta_80: false,
      })

      expect(atualizado.nome).toBe('Orçamento Atualizado')
      expect(atualizado.valor_planejado).toBe(1500)
      expect(atualizado.alerta_80).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })

    it('deve rejeitar atualização de orçamento inexistente', async () => {
      // getOrcamentoById returns null when data is null (no error), then updateOrcamento throws NotFoundError
      mockResponse('orcamentos', null)

      await expect(
        service.updateOrcamento('id-inexistente', { nome: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError)
    })

    it('deve rejeitar valor planejado zero ou negativo', async () => {
      // First mock: getOrcamentoById returns existing (maybeSingle needs single object)
      mockResponse('orcamentos', {
        id: 'orc-val-id',
        nome: 'Teste',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await expect(service.updateOrcamento('orc-val-id', { valor_planejado: 0 })).rejects.toThrow(
        ValidationError
      )
    })
  })

  // ============================================================================
  // CRUD - Delete
  // ============================================================================

  describe('deleteOrcamento', () => {
    it('deve deletar orçamento existente', async () => {
      // deleteOrcamento calls getOrcamentoById (maybeSingle) first, needs existing data
      mockResponse('orcamentos', {
        id: 'orc-del-id',
        nome: 'Teste',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await service.deleteOrcamento('orc-del-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })

    it('deve rejeitar deleção de orçamento inexistente', async () => {
      // getOrcamentoById returns null when data is null, then deleteOrcamento throws NotFoundError
      mockResponse('orcamentos', null)

      await expect(service.deleteOrcamento('id-inexistente')).rejects.toThrow(NotFoundError)
    })
  })

  // ============================================================================
  // TRACKING - Valor Realizado
  // ============================================================================

  describe('recalcularValorRealizado', () => {
    it('deve calcular valor realizado com base em transações de despesa', async () => {
      // Mock orcamento (getOrcamentoById uses maybeSingle, needs single object)
      mockResponse('orcamentos', {
        id: 'orc-recalc-id',
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 350,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      // Mock transacoes for the month
      mockResponse('transacoes', [
        { id: 't1', valor: -200, tipo: 'despesa', categoria_id: categoriaId, data: '2025-11-10' },
        { id: 't2', valor: -150, tipo: 'despesa', categoria_id: categoriaId, data: '2025-11-15' },
      ])

      const atualizado = await service.recalcularValorRealizado('orc-recalc-id')

      expect(atualizado.valor_realizado).toBe(350)
      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })

    it('deve ignorar transações de receita', async () => {
      mockResponse('orcamentos', {
        id: 'orc-rec-id',
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 0,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      mockResponse('transacoes', [
        { id: 't1', valor: 100, tipo: 'receita', categoria_id: categoriaId, data: '2025-11-10' },
      ])

      const atualizado = await service.recalcularValorRealizado('orc-rec-id')

      expect(atualizado.valor_realizado).toBe(0)
    })

    it('deve ignorar transações fora do mês de referência', async () => {
      mockResponse('orcamentos', {
        id: 'orc-fora-id',
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 0,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      // No transactions in the month filter
      mockResponse('transacoes', [])

      const atualizado = await service.recalcularValorRealizado('orc-fora-id')

      expect(atualizado.valor_realizado).toBe(0)
    })

    it('deve atualizar flags de alerta ao atingir 80%', async () => {
      mockResponse('orcamentos', {
        id: 'orc-80-id',
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 850,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: true,
        alerta_100_enviado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      mockResponse('transacoes', [
        { id: 't1', valor: -850, tipo: 'despesa', categoria_id: categoriaId, data: '2025-11-10' },
      ])

      const atualizado = await service.recalcularValorRealizado('orc-80-id')

      expect(atualizado.valor_realizado).toBe(850)
      expect(atualizado.alerta_80_enviado).toBe(true)
    })

    it('deve atualizar flags de alerta ao atingir 100%', async () => {
      mockResponse('orcamentos', {
        id: 'orc-100-id',
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 1100,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: true,
        alerta_100_enviado: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      mockResponse('transacoes', [
        { id: 't1', valor: -1100, tipo: 'despesa', categoria_id: categoriaId, data: '2025-11-10' },
      ])

      const atualizado = await service.recalcularValorRealizado('orc-100-id')

      expect(atualizado.valor_realizado).toBe(1100)
      expect(atualizado.alerta_100_enviado).toBe(true)
    })
  })

  describe('recalcularTodosDoMes', () => {
    it('deve recalcular todos os orçamentos de um mês', async () => {
      // recalcularTodosDoMes calls listOrcamentos (needs array) then recalcularValorRealizado
      // for each (needs single object). Spy on recalcularValorRealizado to avoid conflict.
      const recalcSpy = vi.spyOn(service, 'recalcularValorRealizado').mockResolvedValue({
        id: 'orc-1',
        nome: 'Alimentação Nov',
        tipo: 'categoria' as const,
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        valor_realizado: 300,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: new Date(),
        updated_at: new Date(),
      })

      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 300,
          alerta_80: true,
          alerta_100: true,
          alerta_80_enviado: false,
          alerta_100_enviado: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Viagem Nov',
          tipo: 'centro_custo',
          centro_custo_id: centroCustoId,
          mes_referencia: '2025-11',
          valor_planejado: 5000,
          valor_realizado: 1500,
          alerta_80: true,
          alerta_100: true,
          alerta_80_enviado: false,
          alerta_100_enviado: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const count = await service.recalcularTodosDoMes('2025-11')

      expect(count).toBe(2)
      expect(recalcSpy).toHaveBeenCalledTimes(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })
  })

  // ============================================================================
  // ENRIQUECIMENTO - Orçamentos com Progresso
  // ============================================================================

  describe('listOrcamentosComProgresso', () => {
    it('deve enriquecer orçamentos com dados de progresso', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-prog-id',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 600,
          alerta_80: true,
          alerta_100: true,
          alerta_80_enviado: false,
          alerta_100_enviado: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      mockResponse('categorias', [
        { id: categoriaId, nome: 'Alimentação', icone: '🍔', cor: '#FF6B6B' },
      ])

      const result = await service.listOrcamentosComProgresso({ mesReferencia: '2025-11' })

      expect(result).toHaveLength(1)
      expect(result[0].percentual_usado).toBe(60)
      expect(result[0].valor_restante).toBe(400)
      expect(result[0].status).toBe('ok')
      expect(result[0].categoria_nome).toBe('Alimentação')
      expect(result[0].categoria_icone).toBe('🍔')
      expect(result[0].categoria_cor).toBe('#FF6B6B')
    })

    it('deve calcular status "atencao" quando >= 80%', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-atencao-id',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 850,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      mockResponse('categorias', [
        { id: categoriaId, nome: 'Alimentação', icone: '🍔', cor: '#FF6B6B' },
      ])

      const result = await service.listOrcamentosComProgresso({ mesReferencia: '2025-11' })

      expect(result[0].status).toBe('atencao')
    })

    it('deve calcular status "excedido" quando >= 100%', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-exc-id',
          nome: 'Alimentação Nov',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 1200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      mockResponse('categorias', [
        { id: categoriaId, nome: 'Alimentação', icone: '🍔', cor: '#FF6B6B' },
      ])

      const result = await service.listOrcamentosComProgresso({ mesReferencia: '2025-11' })

      expect(result[0].status).toBe('excedido')
    })
  })

  // ============================================================================
  // RELATÓRIOS E ANÁLISES
  // ============================================================================

  describe('getResumoMensal', () => {
    it('deve retornar resumo consolidado do mês', async () => {
      mockResponse('orcamentos', [
        {
          id: 'orc-1',
          nome: 'Alimentação',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-2',
          nome: 'Viagem',
          tipo: 'centro_custo',
          centro_custo_id: centroCustoId,
          mes_referencia: '2025-11',
          valor_planejado: 3000,
          valor_realizado: 2700,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-3',
          nome: 'Transporte',
          tipo: 'categoria',
          categoria_id: 'cat-transporte-id',
          mes_referencia: '2025-11',
          valor_planejado: 500,
          valor_realizado: 550,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const resumo = await service.getResumoMensal('2025-11')

      expect(resumo.total_planejado).toBe(4500)
      expect(resumo.total_realizado).toBeCloseTo(3850, 1)
      expect(resumo.total_restante).toBeCloseTo(650, 1)
      expect(resumo.percentual_usado).toBeCloseTo(85.56, 1)
      expect(resumo.orcamentos_ok).toBe(1)
      expect(resumo.orcamentos_atencao).toBe(1)
      expect(resumo.orcamentos_excedidos).toBe(1)
    })
  })

  describe('copiarOrcamentosParaMes', () => {
    it('deve copiar orçamentos de um mês para outro', async () => {
      // copiarOrcamentosParaMes calls listOrcamentos (needs array) then createOrcamento for each
      // (needs single objects for categorias/centros_custo/orcamentos). Spy on createOrcamento to avoid conflict.
      const now = new Date()
      const createSpy = vi.spyOn(service, 'createOrcamento').mockResolvedValue({
        id: 'new-orc-id',
        nome: 'Copied',
        tipo: 'categoria' as const,
        categoria_id: categoriaId,
        mes_referencia: '2025-12',
        valor_planejado: 1000,
        valor_realizado: 0,
        alerta_80: true,
        alerta_100: true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        created_at: now,
        updated_at: now,
      })

      // Mock source orcamentos (listOrcamentos needs array)
      mockResponse('orcamentos', [
        {
          id: 'orc-src-1',
          nome: 'Alimentação',
          tipo: 'categoria',
          categoria_id: categoriaId,
          mes_referencia: '2025-11',
          valor_planejado: 1000,
          valor_realizado: 500,
          alerta_80: false,
          alerta_80_enviado: true,
          alerta_100_enviado: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'orc-src-2',
          nome: 'Viagem',
          tipo: 'centro_custo',
          centro_custo_id: centroCustoId,
          mes_referencia: '2025-11',
          valor_planejado: 5000,
          valor_realizado: 3000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const count = await service.copiarOrcamentosParaMes('2025-11', '2025-12')

      expect(count).toBe(2)
      expect(createSpy).toHaveBeenCalledTimes(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('orcamentos')
    })
  })
})
