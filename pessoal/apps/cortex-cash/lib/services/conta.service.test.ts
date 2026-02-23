/**
 * Testes Unitários - ContaService
 * Migrado de Dexie para Supabase mocks
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

import { ContaService } from './conta.service'

describe('ContaService', () => {
  let service: ContaService

  beforeEach(() => {
    resetMocks()
    service = new ContaService()
  })

  describe('createConta', () => {
    it('deve criar uma nova conta com sucesso', async () => {
      const now = new Date().toISOString()
      const mockConta = {
        id: 'conta-new-1',
        nome: 'Conta Teste',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 1000,
        data_referencia: now,
        saldo_atual: 1000,
        ativa: true,
        usuario_id: 'test-user-id',
        created_at: now,
        updated_at: now,
      }

      mockResponse('contas', mockConta)

      const result = await service.createConta({
        nome: 'Conta Teste',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 1000,
        data_referencia: new Date(),
        saldo_atual: 1000,
        ativa: true,
      })

      expect(result).toBeDefined()
      expect(result.nome).toBe('Conta Teste')
      expect(result.tipo).toBe('corrente')
      expect(result.saldo_referencia).toBe(1000)
      expect(result.ativa).toBe(true)
      expect(result.created_at).toBeInstanceOf(Date)
      expect(result.updated_at).toBeInstanceOf(Date)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve criar conta com saldo_referencia 0 quando especificado', async () => {
      const now = new Date().toISOString()
      mockResponse('contas', {
        id: 'conta-zero',
        nome: 'Conta Sem Saldo',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: now,
        saldo_atual: 0,
        ativa: true,
        usuario_id: 'test-user-id',
        created_at: now,
        updated_at: now,
      })

      const result = await service.createConta({
        nome: 'Conta Sem Saldo',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
        ativa: true,
      })

      expect(result.saldo_referencia).toBe(0)
    })
  })

  describe('listContas', () => {
    it('deve listar apenas contas ativas por padrão', async () => {
      mockResponse('contas', [
        { id: '1', nome: 'Conta A', tipo: 'corrente', saldo_referencia: 100, ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '2', nome: 'Conta B', tipo: 'poupanca', saldo_referencia: 200, ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ])

      const result = await service.listContas()

      expect(result).toHaveLength(2)
      expect(result.every((c) => c.ativa)).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve listar todas as contas incluindo inativas', async () => {
      mockResponse('contas', [
        { id: '1', nome: 'Conta A', ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '2', nome: 'Conta B', ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '3', nome: 'Conta C Inativa', ativa: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ])

      const result = await service.listContas({ incluirInativas: true })

      expect(result).toHaveLength(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve ordenar por nome ascendente', async () => {
      mockResponse('contas', [
        { id: '1', nome: 'Conta A', ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '2', nome: 'Conta B', ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ])

      const result = await service.listContas({ sortBy: 'nome', sortOrder: 'asc' })

      expect(result[0].nome).toBe('Conta A')
      expect(result[1].nome).toBe('Conta B')
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve ordenar por saldo_referencia descendente', async () => {
      mockResponse('contas', [
        { id: '2', nome: 'Conta B', saldo_referencia: 200, ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '1', nome: 'Conta A', saldo_referencia: 100, ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ])

      const result = await service.listContas({ sortBy: 'saldo_referencia', sortOrder: 'desc' })

      expect(result[0].saldo_referencia).toBe(200)
      expect(result[1].saldo_referencia).toBe(100)
    })

    it('deve aplicar paginação corretamente', async () => {
      mockResponse('contas', [
        { id: '2', nome: 'Conta B', ativa: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ])

      const result = await service.listContas({ limit: 1, offset: 1 })

      expect(result).toHaveLength(1)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })
  })

  describe('getContaById', () => {
    it('deve retornar conta existente', async () => {
      const now = new Date().toISOString()
      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta Teste',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        ativa: true,
        created_at: now,
        updated_at: now,
      })

      const result = await service.getContaById('conta-123')

      expect(result).toBeDefined()
      expect(result?.id).toBe('conta-123')
      expect(result?.nome).toBe('Conta Teste')
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve retornar null para conta inexistente', async () => {
      mockResponse('contas', null)

      const result = await service.getContaById('id-inexistente')

      expect(result).toBeNull()
    })
  })

  describe('updateConta', () => {
    it('deve atualizar conta existente', async () => {
      const now = new Date().toISOString()
      const laterDate = new Date(Date.now() + 1000).toISOString()

      // First call: getContaById (select)
      // Second call: update
      // The mock returns the same data for both calls on 'contas' table
      // We mock with the updated values since the update response is what matters
      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta Atualizada',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 500,
        ativa: true,
        created_at: now,
        updated_at: laterDate,
      })

      // Also mock cartoes_config for the updateConta check
      mockResponse('cartoes_config', [])

      const result = await service.updateConta('conta-123', {
        nome: 'Conta Atualizada',
        saldo_referencia: 500,
      })

      expect(result.nome).toBe('Conta Atualizada')
      expect(result.saldo_referencia).toBe(500)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve lançar NotFoundError para conta inexistente', async () => {
      mockResponse('contas', null)

      const { NotFoundError } = await import('../errors')

      await expect(service.updateConta('id-inexistente', { nome: 'Novo Nome' })).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe('toggleAtiva', () => {
    it('deve desativar conta ativa', async () => {
      const now = new Date().toISOString()

      // getContaById returns active account, then toggleAtiva updates it
      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta Ativa',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        ativa: false, // After toggle
        created_at: now,
        updated_at: now,
      })

      // Mock cartoes_config (no active credit cards)
      mockResponse('cartoes_config', [])

      const result = await service.toggleAtiva('conta-123')

      expect(result.ativa).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve ativar conta inativa', async () => {
      const now = new Date().toISOString()

      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta Inativa',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        ativa: true, // After toggle from false to true
        created_at: now,
        updated_at: now,
      })

      const result = await service.toggleAtiva('conta-123')

      expect(result.ativa).toBe(true)
    })

    it('deve lançar NotFoundError para conta inexistente', async () => {
      mockResponse('contas', null)

      const { NotFoundError } = await import('../errors')

      await expect(service.toggleAtiva('id-inexistente')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getSaldoConta', () => {
    it('deve calcular saldo baseado em transações', async () => {
      const now = new Date().toISOString()
      const pastDate = new Date('2025-01-01').toISOString()

      // Mock getContaById
      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta Teste',
        tipo: 'corrente',
        saldo_referencia: 0,
        data_referencia: pastDate,
        saldo_atual: 0,
        ativa: true,
        created_at: now,
        updated_at: now,
      })

      // Mock transações
      mockResponse('transacoes', [
        { tipo: 'receita', valor: 100, data: new Date('2025-01-15').toISOString() },
        { tipo: 'despesa', valor: 30, data: new Date('2025-01-20').toISOString() },
      ])

      const saldo = await service.getSaldoConta('conta-123')

      expect(saldo).toBe(70) // 0 + 100 - 30
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
      expect(mockSupabase.from).toHaveBeenCalledWith('transacoes')
    })
  })

  describe('getSaldoTotal', () => {
    it('deve somar saldo_referencia + saldo das transações', async () => {
      const now = new Date().toISOString()
      const pastDate = new Date('2025-01-01').toISOString()

      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta Teste',
        tipo: 'corrente',
        saldo_referencia: 500,
        data_referencia: pastDate,
        saldo_atual: 600,
        ativa: true,
        created_at: now,
        updated_at: now,
      })

      mockResponse('transacoes', [
        { tipo: 'receita', valor: 100, data: new Date('2025-01-15').toISOString() },
      ])

      const saldoTotal = await service.getSaldoTotal('conta-123')

      expect(saldoTotal).toBe(600) // 500 + 100
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve lançar NotFoundError para conta inexistente', async () => {
      mockResponse('contas', null)

      const { NotFoundError } = await import('../errors')

      await expect(service.getSaldoTotal('id-inexistente')).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteConta', () => {
    it('deve fazer soft delete (desativar conta)', async () => {
      const now = new Date().toISOString()

      mockResponse('contas', {
        id: 'conta-123',
        nome: 'Conta para Deletar',
        tipo: 'corrente',
        saldo_referencia: 0,
        ativa: false, // After soft delete
        created_at: now,
        updated_at: now,
      })

      mockResponse('cartoes_config', [])

      await service.deleteConta('conta-123')

      // deleteConta calls updateConta which calls from('contas')
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })
  })

  describe('hardDeleteConta', () => {
    it('deve deletar conta permanentemente', async () => {
      const now = new Date().toISOString()

      // Mock transações lookup
      mockResponse('transacoes', [])

      // Mock conta delete
      mockResponse('contas', null)

      await service.hardDeleteConta('conta-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('transacoes')
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })
  })

  describe('listContasByInstituicao', () => {
    it('deve listar contas de uma instituição específica', async () => {
      const now = new Date().toISOString()
      mockResponse('contas', [
        { id: '1', nome: 'Conta Inst 1 - A', tipo: 'corrente', instituicao_id: 'inst-1', ativa: true, created_at: now, updated_at: now },
        { id: '2', nome: 'Conta Inst 1 - B', tipo: 'poupanca', instituicao_id: 'inst-1', ativa: true, created_at: now, updated_at: now },
      ])

      const result = await service.listContasByInstituicao('inst-1')

      expect(result).toHaveLength(2)
      expect(result.every((c) => c.instituicao_id === 'inst-1')).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve retornar array vazio para instituição sem contas', async () => {
      mockResponse('contas', [])

      const result = await service.listContasByInstituicao('inst-inexistente')

      expect(result).toHaveLength(0)
    })
  })
})
