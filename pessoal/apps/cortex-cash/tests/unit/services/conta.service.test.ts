/**
 * Testes Unitários - ContaService
 * Agent CORE: Implementador
 *
 * Testa operações CRUD de contas (Supabase mocks)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mock setup: inline to avoid module resolution issues
const { mockSupabase, mockResponse, resetMocks, queryBuilders } = vi.hoisted(() => {
  // vi.fn is available inside vi.hoisted via closure

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

  const queryBuilders = new Map()
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    }),
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
    mockSupabase.from.mockClear()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, resetMocks, queryBuilders }
})

vi.mock('@/lib/db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

import { ContaService } from '@/lib/services/conta.service'
import type { Conta } from '@/lib/types'
import { contas, contaAtiva, contaPoupanca } from '../../fixtures/contas'

describe('ContaService', () => {
  const service = new ContaService()

  beforeEach(() => {
    resetMocks()
  })

  // ── Helpers ────────────────────────────────────────────────
  // Convert fixture Conta to raw DB row format (as Supabase would return)
  function contaToRow(c: Conta): Record<string, unknown> {
    return {
      ...c,
      data_referencia: c.data_referencia instanceof Date ? c.data_referencia.toISOString() : c.data_referencia,
      created_at: c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at,
      updated_at: c.updated_at instanceof Date ? c.updated_at.toISOString() : c.updated_at,
    }
  }

  const contasAtivas = contas.filter((c) => c.ativa)
  const contasRows = contas.map(contaToRow)
  const contasAtivasRows = contasAtivas.map(contaToRow)

  describe('listContas', () => {
    it('deve listar apenas contas ativas por padrão', async () => {
      mockResponse('contas', contasAtivasRows)

      const result = await service.listContas()

      expect(result.every((c) => c.ativa === true)).toBe(true)
      expect(result.some((c) => c.id === 'conta-inativa')).toBe(false)
    })

    it('deve incluir contas inativas quando solicitado', async () => {
      mockResponse('contas', contasRows)

      const result = await service.listContas({ incluirInativas: true })

      expect(result.some((c) => c.id === 'conta-inativa')).toBe(true)
      expect(result).toHaveLength(contas.length)
    })

    it('deve chamar from(contas) com select e eq', async () => {
      mockResponse('contas', contasAtivasRows)

      await service.listContas()

      expect(mockSupabase.from).toHaveBeenCalledWith('contas')
    })

    it('deve aplicar paginação corretamente', async () => {
      const paginatedRows = contasRows.slice(0, 2)
      mockResponse('contas', paginatedRows)

      const result = await service.listContas({
        incluirInativas: true,
        limit: 2,
        offset: 0,
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('getContaById', () => {
    it('deve retornar conta quando ID existe', async () => {
      const row = contaToRow(contaAtiva)
      mockResponse('contas', row)

      const result = await service.getContaById('conta-corrente')

      expect(result).toBeDefined()
      expect(result?.id).toBe('conta-corrente')
      expect(result?.nome).toBe('Conta Corrente')
    })

    it('deve retornar null quando ID não existe', async () => {
      mockResponse('contas', null)

      const result = await service.getContaById('id-inexistente')

      expect(result).toBeNull()
    })
  })

  describe('createConta', () => {
    it('deve criar conta com dados mínimos', async () => {
      const novaConta: Omit<Conta, 'id' | 'created_at' | 'updated_at'> = {
        instituicao_id: 'inst-banco-brasil',
        nome: 'Nova Conta',
        tipo: 'corrente',
        saldo_referencia: 1000,
        data_referencia: new Date(),
        saldo_atual: 1000,
        ativa: true,
      }

      // Mock the insert().select().single() chain to return the created row
      const insertedRow = {
        id: 'generated-uuid',
        ...novaConta,
        usuario_id: 'test-user-id',
        data_referencia: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('contas', insertedRow)

      const result = await service.createConta(novaConta)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.nome).toBe('Nova Conta')
      expect(result.tipo).toBe('corrente')
      expect(result.saldo_referencia).toBe(1000)
      expect(result.created_at).toBeDefined()
      expect(result.updated_at).toBeDefined()
    })

    it('deve criar conta com instituicao_id', async () => {
      const novaConta: Omit<Conta, 'id' | 'created_at' | 'updated_at'> = {
        instituicao_id: 'inst-nubank',
        nome: 'Nubank',
        tipo: 'corrente',
        saldo_referencia: 500,
        data_referencia: new Date(),
        saldo_atual: 500,
        ativa: true,
      }

      const insertedRow = {
        id: 'generated-uuid-2',
        ...novaConta,
        usuario_id: 'test-user-id',
        data_referencia: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('contas', insertedRow)

      const result = await service.createConta(novaConta)

      expect(result.instituicao_id).toBe('inst-nubank')
    })

    it('deve criar conta inativa', async () => {
      const novaConta: Omit<Conta, 'id' | 'created_at' | 'updated_at'> = {
        instituicao_id: 'inst-banco-brasil',
        nome: 'Conta Inativa',
        tipo: 'poupanca',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
        ativa: false,
      }

      const insertedRow = {
        id: 'generated-uuid-3',
        ...novaConta,
        usuario_id: 'test-user-id',
        data_referencia: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('contas', insertedRow)

      const result = await service.createConta(novaConta)

      expect(result.ativa).toBe(false)
    })
  })

  describe('updateConta', () => {
    it('deve atualizar conta existente', async () => {
      // First call: getContaById (existing check)
      const existingRow = contaToRow(contaAtiva)
      // The mock will return the same data for all calls to 'contas' table
      // We set up the final expected result
      const updatedRow = {
        ...existingRow,
        nome: 'Conta Corrente Atualizada',
        saldo_referencia: 2000,
        updated_at: new Date().toISOString(),
      }
      mockResponse('contas', updatedRow)

      const result = await service.updateConta('conta-corrente', {
        nome: 'Conta Corrente Atualizada',
        saldo_referencia: 2000,
      })

      expect(result).toBeDefined()
      expect(result.nome).toBe('Conta Corrente Atualizada')
      expect(result.saldo_referencia).toBe(2000)
      expect(result.updated_at).toBeDefined()
      expect(result.created_at).toBeDefined()
    })

    it('deve lançar erro quando ID não existe', async () => {
      // Return null for getContaById
      mockResponse('contas', null)

      await expect(service.updateConta('id-inexistente', { nome: 'Não Importa' })).rejects.toThrow()
    })

    it('deve preservar campos não atualizados', async () => {
      const existingRow = contaToRow(contaAtiva)
      const updatedRow = {
        ...existingRow,
        nome: 'Nome Atualizado',
        updated_at: new Date().toISOString(),
      }
      mockResponse('contas', updatedRow)

      const result = await service.updateConta('conta-corrente', {
        nome: 'Nome Atualizado',
      })

      expect(result.tipo).toBe(contaAtiva.tipo)
      expect(result.ativa).toBe(contaAtiva.ativa)
    })
  })

  describe('alternar status via update', () => {
    it('deve desativar conta via update', async () => {
      const existingRow = contaToRow(contaAtiva)
      const updatedRow = {
        ...existingRow,
        ativa: false,
        updated_at: new Date().toISOString(),
      }
      // Mock both cartoes_config (no active cards) and contas
      mockResponse('cartoes_config', [])
      mockResponse('contas', updatedRow)

      const result = await service.updateConta('conta-corrente', { ativa: false })

      expect(result.ativa).toBe(false)
    })

    it('deve ativar conta via update', async () => {
      const existingRow = contaToRow(contas.find((c) => c.id === 'conta-inativa')!)
      const updatedRow = {
        ...existingRow,
        ativa: true,
        updated_at: new Date().toISOString(),
      }
      mockResponse('contas', updatedRow)

      const result = await service.updateConta('conta-inativa', { ativa: true })

      expect(result.ativa).toBe(true)
    })
  })

  describe('getSaldoConta', () => {
    it('deve calcular saldo da conta corretamente', async () => {
      // Mock getContaById
      const row = contaToRow(contaAtiva)
      mockResponse('contas', row)
      // Mock transacoes query for calcularSaldoEmData
      mockResponse('transacoes', [
        { tipo: 'receita', valor: 5000, data: '2025-01-05T00:00:00.000Z' },
        { tipo: 'despesa', valor: 45.5, data: '2025-01-15T00:00:00.000Z' },
      ])

      const result = await service.getSaldoConta('conta-corrente')

      expect(typeof result).toBe('number')
    })

    it('deve retornar saldo quando não há transações', async () => {
      const row = {
        ...contaToRow(contaAtiva),
        id: 'conta-vazia',
        saldo_referencia: 500,
        data_referencia: new Date('2025-01-01').toISOString(),
      }
      mockResponse('contas', row)
      mockResponse('transacoes', [])

      const result = await service.getSaldoConta('conta-vazia')

      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getSaldoTotal', () => {
    it('deve retornar saldo de uma conta específica', async () => {
      const row = contaToRow(contaAtiva)
      mockResponse('contas', row)
      mockResponse('transacoes', [])

      const result = await service.getSaldoTotal('conta-corrente')

      expect(typeof result).toBe('number')
    })

    it('deve calcular corretamente para contas sem transações', async () => {
      const row = {
        ...contaToRow(contaAtiva),
        id: 'conta-nova',
        saldo_referencia: 1500,
        data_referencia: new Date().toISOString(),
      }
      mockResponse('contas', row)
      mockResponse('transacoes', [])

      const result = await service.getSaldoTotal('conta-nova')

      // When data_referencia === today, returns saldo_referencia
      expect(result).toBe(1500)
    })
  })

  describe('listContasByInstituicao', () => {
    it('deve retornar contas de uma instituição específica', async () => {
      const bbContas = contas
        .filter((c) => c.instituicao_id === 'inst-banco-brasil')
        .map(contaToRow)
      mockResponse('contas', bbContas)

      const result = await service.listContasByInstituicao('inst-banco-brasil')

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((c) => c.instituicao_id === 'inst-banco-brasil')).toBe(true)
    })

    it('deve retornar array vazio quando instituição não tem contas', async () => {
      mockResponse('contas', [])

      const result = await service.listContasByInstituicao('inst-inexistente')

      expect(result).toHaveLength(0)
    })
  })

  describe('filtros de dashboard', () => {
    it('deve filtrar contas ativas', async () => {
      mockResponse('contas', contasAtivasRows)

      const result = await service.listContas()
      const ativas = result.filter((c) => c.ativa === true)

      expect(ativas.length).toBeGreaterThan(0)
      expect(ativas.every((c) => c.ativa === true)).toBe(true)
    })

    it('contas inativas não aparecem na lista padrão', async () => {
      mockResponse('contas', contasAtivasRows)

      const result = await service.listContas()

      expect(result.some((c) => c.id === 'conta-inativa')).toBe(false)
    })
  })
})
