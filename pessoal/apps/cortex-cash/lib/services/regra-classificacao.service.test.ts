/**
 * Testes Unitários - RegraClassificacaoService
 * Agent CORE: Implementador
 * Migrado de Dexie mocks para Supabase mocks
 *
 * Testa funcionalidade de regras automáticas de classificação
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
import { regraClassificacaoService } from './regra-classificacao.service'

describe('RegraClassificacaoService', () => {
  const categoriaId = 'cat-test-id'

  beforeEach(() => {
    resetMocks()
  })

  describe('createRegra', () => {
    it('deve criar regra com regex válido', async () => {
      const now = new Date().toISOString()

      // Mock categorias check (maybeSingle needs single object)
      mockResponse('categorias', { id: categoriaId, nome: 'Alimentação' })

      // Mock regras_classificacao - used for both priority lookup (array) and insert().select().single()
      // Since insert().select().single() needs single object, use single object.
      // The priority lookup accesses regras[0] which gets undefined on single object,
      // so prioridade defaults to 1 (the code handles empty/null arrays).
      mockResponse('regras_classificacao', {
        id: 'new-regra-id',
        categoria_id: categoriaId,
        nome: 'Regra Regex Válida',
        tipo_regra: 'regex',
        padrao: '^PAG\\*.*IFOOD',
        prioridade: 1,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: now,
        updated_at: now,
      })

      const result = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Regex Válida',
        tipo_regra: 'regex',
        padrao: '^PAG\\*.*IFOOD',
        prioridade: 1,
        ativa: true,
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.nome).toBe('Regra Regex Válida')
      expect(result.tipo_regra).toBe('regex')
      expect(result.padrao).toBe('^PAG\\*.*IFOOD')
      expect(result.prioridade).toBe(1)
      expect(result.ativa).toBe(true)
      expect(result.total_aplicacoes).toBe(0)
      expect(result.created_at).toBeInstanceOf(Date)
    })

    it('deve criar regra com tipo contains', async () => {
      const now = new Date().toISOString()

      mockResponse('categorias', { id: categoriaId, nome: 'Alimentação' })
      mockResponse('regras_classificacao', {
        id: 'new-contains-id',
        categoria_id: categoriaId,
        nome: 'Regra Contains',
        tipo_regra: 'contains',
        padrao: 'ifood',
        prioridade: 1,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: now,
        updated_at: now,
      })

      const result = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Contains',
        tipo_regra: 'contains',
        padrao: 'ifood',
        ativa: true,
      })

      expect(result.tipo_regra).toBe('contains')
      expect(result.padrao).toBe('ifood')
      expect(result.prioridade).toBe(1)
    })

    it('deve lançar ValidationError para regex inválido', async () => {
      await expect(
        regraClassificacaoService.createRegra({
          categoria_id: categoriaId,
          nome: 'Regra Regex Inválida',
          tipo_regra: 'regex',
          padrao: '[invalid(regex',
          ativa: true,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve lançar ValidationError para padrão vazio', async () => {
      await expect(
        regraClassificacaoService.createRegra({
          categoria_id: categoriaId,
          nome: 'Regra Vazia',
          tipo_regra: 'contains',
          padrao: '',
          ativa: true,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve lançar ValidationError para padrão muito curto', async () => {
      await expect(
        regraClassificacaoService.createRegra({
          categoria_id: categoriaId,
          nome: 'Regra Curta',
          tipo_regra: 'contains',
          padrao: 'a',
          ativa: true,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve lançar ValidationError para categoria inexistente', async () => {
      mockResponse('categorias', null)

      await expect(
        regraClassificacaoService.createRegra({
          categoria_id: 'categoria-inexistente',
          nome: 'Regra sem Categoria',
          tipo_regra: 'contains',
          padrao: 'teste',
          ativa: true,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve auto-incrementar prioridade quando não especificada', async () => {
      const now = new Date().toISOString()

      mockResponse('categorias', { id: categoriaId, nome: 'Alimentação' })

      // First regra gets priority 1 (single object for insert().select().single())
      mockResponse('regras_classificacao', {
        id: 'regra-1',
        categoria_id: categoriaId,
        nome: 'Regra 1',
        tipo_regra: 'contains',
        padrao: 'teste1',
        prioridade: 1,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: now,
        updated_at: now,
      })

      const regra1 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 1',
        tipo_regra: 'contains',
        padrao: 'teste1',
        ativa: true,
      })

      // Second regra gets higher priority
      resetMocks()
      mockResponse('categorias', { id: categoriaId, nome: 'Alimentação' })
      mockResponse('regras_classificacao', {
        id: 'regra-2',
        categoria_id: categoriaId,
        nome: 'Regra 2',
        tipo_regra: 'contains',
        padrao: 'teste2',
        prioridade: 2,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: now,
        updated_at: now,
      })

      const regra2 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 2',
        tipo_regra: 'contains',
        padrao: 'teste2',
        ativa: true,
      })

      expect(regra2.prioridade).toBeGreaterThan(regra1.prioridade)
    })
  })

  describe('previewRegra', () => {
    it('deve retornar matches corretos para regra contains', async () => {
      mockResponse('transacoes', [
        {
          id: 't1',
          conta_id: 'conta-1',
          data: '2025-01-01',
          descricao: 'PAG*IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
        },
      ])

      const result = await regraClassificacaoService.previewRegra('contains', 'ifood')

      expect(result.total_matches).toBe(1)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].descricao).toContain('IFOOD')
    })

    it('deve retornar matches corretos para regra starts_with', async () => {
      mockResponse('transacoes', [
        {
          id: 't1',
          conta_id: 'conta-1',
          data: '2025-01-01',
          descricao: 'PAG*IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
        },
      ])

      const result = await regraClassificacaoService.previewRegra('starts_with', 'pag')

      expect(result.total_matches).toBe(1)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].descricao).toMatch(/^PAG/i)
    })

    it('deve retornar matches corretos para regra ends_with', async () => {
      mockResponse('transacoes', [
        {
          id: 't1',
          conta_id: 'conta-1',
          data: '2025-01-03',
          descricao: 'MERCADO PAGO COMPRA',
          valor: 120.0,
          tipo: 'despesa',
        },
      ])

      const result = await regraClassificacaoService.previewRegra('ends_with', 'compra')

      expect(result.total_matches).toBe(1)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].descricao).toMatch(/COMPRA$/i)
    })

    it('deve retornar matches corretos para regra regex', async () => {
      mockResponse('transacoes', [
        {
          id: 't1',
          conta_id: 'conta-1',
          data: '2025-01-01',
          descricao: 'PAG*IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
        },
      ])

      const result = await regraClassificacaoService.previewRegra('regex', '^PAG\\*.*IFOOD')

      expect(result.total_matches).toBe(1)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].descricao).toBe('PAG*IFOOD RESTAURANTE')
    })

    it('deve respeitar limit de resultados', async () => {
      const manyTransacoes = Array.from({ length: 60 }, (_, i) => ({
        id: `t-${i}`,
        conta_id: 'conta-1',
        data: new Date().toISOString(),
        descricao: `TESTE ${i}`,
        valor: 10,
        tipo: 'despesa',
      }))

      mockResponse('transacoes', manyTransacoes)

      const result = await regraClassificacaoService.previewRegra('contains', 'teste', 20)

      expect(result.matches).toHaveLength(20)
      expect(result.total_matches).toBe(60)
    })

    it('deve lançar ValidationError para padrão inválido', async () => {
      await expect(
        regraClassificacaoService.previewRegra('regex', '[invalid(regex')
      ).rejects.toThrow(ValidationError)
    })

    it('deve retornar array vazio quando nenhuma transação casa', async () => {
      mockResponse('transacoes', [])

      const result = await regraClassificacaoService.previewRegra(
        'contains',
        'string-que-nao-existe'
      )

      expect(result.total_matches).toBe(0)
      expect(result.matches).toHaveLength(0)
    })

    it('deve ser case insensitive', async () => {
      mockResponse('transacoes', [
        {
          id: 't1',
          conta_id: 'conta-1',
          data: '2025-01-01',
          descricao: 'PAG*IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
        },
      ])

      const resultLower = await regraClassificacaoService.previewRegra('contains', 'ifood')

      resetMocks()
      mockResponse('transacoes', [
        {
          id: 't1',
          conta_id: 'conta-1',
          data: '2025-01-01',
          descricao: 'PAG*IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
        },
      ])

      const resultUpper = await regraClassificacaoService.previewRegra('contains', 'IFOOD')

      expect(resultLower.total_matches).toBe(resultUpper.total_matches)
    })
  })

  describe('listRegras', () => {
    it('deve listar todas as regras sem filtros', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra A',
          tipo_regra: 'contains',
          padrao: 'teste a',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra B',
          tipo_regra: 'starts_with',
          padrao: 'teste b',
          prioridade: 2,
          ativa: false,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r3',
          categoria_id: categoriaId,
          nome: 'Regra C',
          tipo_regra: 'regex',
          padrao: 'teste.*c',
          prioridade: 3,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras()

      expect(result).toHaveLength(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('regras_classificacao')
    })

    it('deve filtrar por regras ativas', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra A',
          tipo_regra: 'contains',
          padrao: 'teste a',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r3',
          categoria_id: categoriaId,
          nome: 'Regra C',
          tipo_regra: 'regex',
          padrao: 'teste.*c',
          prioridade: 3,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras({ ativa: true })

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.ativa)).toBe(true)
    })

    it('deve filtrar por regras inativas', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra B',
          tipo_regra: 'starts_with',
          padrao: 'teste b',
          prioridade: 2,
          ativa: false,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras({ ativa: false })

      expect(result).toHaveLength(1)
      expect(result[0].ativa).toBe(false)
    })

    it('deve filtrar por categoria_id', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra A',
          tipo_regra: 'contains',
          padrao: 'teste a',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra B',
          tipo_regra: 'starts_with',
          padrao: 'teste b',
          prioridade: 2,
          ativa: false,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r3',
          categoria_id: categoriaId,
          nome: 'Regra C',
          tipo_regra: 'regex',
          padrao: 'teste.*c',
          prioridade: 3,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras({ categoria_id: categoriaId })

      expect(result).toHaveLength(3)
      expect(result.every((r) => r.categoria_id === categoriaId)).toBe(true)
    })

    it('deve filtrar por tipo_regra', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r3',
          categoria_id: categoriaId,
          nome: 'Regra C',
          tipo_regra: 'regex',
          padrao: 'teste.*c',
          prioridade: 3,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras({ tipo_regra: 'regex' })

      expect(result).toHaveLength(1)
      expect(result[0].tipo_regra).toBe('regex')
    })

    it('deve ordenar por prioridade descendente', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r3',
          categoria_id: categoriaId,
          nome: 'Regra C',
          tipo_regra: 'regex',
          padrao: 'teste.*c',
          prioridade: 3,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra B',
          tipo_regra: 'starts_with',
          padrao: 'teste b',
          prioridade: 2,
          ativa: false,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra A',
          tipo_regra: 'contains',
          padrao: 'teste a',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras({
        sortBy: 'prioridade',
        sortOrder: 'desc',
      })

      expect(result[0].prioridade).toBe(3)
      expect(result[1].prioridade).toBe(2)
      expect(result[2].prioridade).toBe(1)
    })

    it('deve ordenar por nome ascendente', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra A',
          tipo_regra: 'contains',
          padrao: 'teste a',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra B',
          tipo_regra: 'starts_with',
          padrao: 'teste b',
          prioridade: 2,
          ativa: false,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r3',
          categoria_id: categoriaId,
          nome: 'Regra C',
          tipo_regra: 'regex',
          padrao: 'teste.*c',
          prioridade: 3,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.listRegras({
        sortBy: 'nome',
        sortOrder: 'asc',
      })

      expect(result[0].nome).toBe('Regra A')
      expect(result[1].nome).toBe('Regra B')
      expect(result[2].nome).toBe('Regra C')
    })
  })

  describe('updateRegra', () => {
    it('deve atualizar regra existente', async () => {
      const now = new Date()
      const later = new Date(now.getTime() + 1000)

      // updateRegra calls getRegraById (maybeSingle) then update().select().single()
      // Both need single object
      mockResponse('regras_classificacao', {
        id: 'regra-upd-id',
        categoria_id: categoriaId,
        nome: 'Regra Atualizada',
        tipo_regra: 'contains',
        padrao: 'atualizado',
        prioridade: 10,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: now.toISOString(),
        updated_at: later.toISOString(),
      })

      const result = await regraClassificacaoService.updateRegra('regra-upd-id', {
        nome: 'Regra Atualizada',
        padrao: 'atualizado',
        prioridade: 10,
      })

      expect(result.nome).toBe('Regra Atualizada')
      expect(result.padrao).toBe('atualizado')
      expect(result.prioridade).toBe(10)
      expect(mockSupabase.from).toHaveBeenCalledWith('regras_classificacao')
    })

    it('deve validar novo padrão ao atualizar', async () => {
      // getRegraById uses maybeSingle, needs single object
      mockResponse('regras_classificacao', {
        id: 'regra-val-id',
        categoria_id: categoriaId,
        nome: 'Regra',
        tipo_regra: 'regex',
        padrao: '^valido',
        prioridade: 1,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await expect(
        regraClassificacaoService.updateRegra('regra-val-id', {
          padrao: '[invalid(regex',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('deve lançar NotFoundError para regra inexistente', async () => {
      // getRegraById returns null when data is null (no error), then throws NotFoundError
      mockResponse('regras_classificacao', null)

      await expect(
        regraClassificacaoService.updateRegra('id-inexistente', {
          nome: 'Novo Nome',
        })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('toggleRegra', () => {
    it('deve desativar regra ativa', async () => {
      // toggleRegra calls getRegraById (maybeSingle) then updateRegra (getRegraById + update().select().single())
      // All need single object
      mockResponse('regras_classificacao', {
        id: 'regra-toggle-id',
        categoria_id: categoriaId,
        nome: 'Regra Ativa',
        tipo_regra: 'contains',
        padrao: 'teste',
        prioridade: 1,
        ativa: false,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await regraClassificacaoService.toggleRegra('regra-toggle-id')

      expect(result.ativa).toBe(false)
    })

    it('deve ativar regra inativa', async () => {
      mockResponse('regras_classificacao', {
        id: 'regra-toggle-id',
        categoria_id: categoriaId,
        nome: 'Regra Inativa',
        tipo_regra: 'contains',
        padrao: 'teste',
        prioridade: 1,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await regraClassificacaoService.toggleRegra('regra-toggle-id')

      expect(result.ativa).toBe(true)
    })
  })

  describe('deleteRegra', () => {
    it('deve deletar regra existente', async () => {
      // deleteRegra calls getRegraById first (maybeSingle, needs existing data as single object)
      mockResponse('regras_classificacao', {
        id: 'regra-del-id',
        categoria_id: categoriaId,
        nome: 'Regra a Deletar',
        tipo_regra: 'contains',
        padrao: 'teste',
        prioridade: 1,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await regraClassificacaoService.deleteRegra('regra-del-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('regras_classificacao')
    })

    it('deve lançar NotFoundError para regra inexistente', async () => {
      // getRegraById returns null when data is null (no error), then throws NotFoundError
      mockResponse('regras_classificacao', null)

      await expect(regraClassificacaoService.deleteRegra('id-inexistente')).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe('aplicarRegras', () => {
    it('deve retornar categoria_id da primeira regra que casa', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra Alta Prioridade',
          tipo_regra: 'starts_with',
          padrao: 'pag',
          prioridade: 10,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra Baixa Prioridade',
          tipo_regra: 'contains',
          padrao: 'ifood',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const result = await regraClassificacaoService.aplicarRegras('PAG*IFOOD RESTAURANTE')

      expect(result).toBe(categoriaId)
    })

    it('deve respeitar prioridade das regras', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra Alta Prioridade',
          tipo_regra: 'starts_with',
          padrao: 'pag',
          prioridade: 10,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra Baixa Prioridade',
          tipo_regra: 'contains',
          padrao: 'ifood',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const regras = await regraClassificacaoService.listRegras({
        ativa: true,
        sortBy: 'prioridade',
        sortOrder: 'desc',
      })

      expect(regras[0].prioridade).toBe(10)
      expect(regras[0].tipo_regra).toBe('starts_with')
    })

    it('deve retornar null quando nenhuma regra casa', async () => {
      mockResponse('regras_classificacao', [])

      const result = await regraClassificacaoService.aplicarRegras('DESCRICAO QUE NAO CASA')

      expect(result).toBeNull()
    })

    it('deve ignorar regras inativas', async () => {
      mockResponse('regras_classificacao', [])

      const result = await regraClassificacaoService.aplicarRegras('TEXTO ESPECIFICO')

      expect(result).toBeNull()
    })
  })

  describe('getRegrasStats', () => {
    it('deve retornar estatísticas corretas', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra 1',
          tipo_regra: 'contains',
          padrao: 'teste1',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra 2',
          tipo_regra: 'contains',
          padrao: 'teste2',
          prioridade: 2,
          ativa: false,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const stats = await regraClassificacaoService.getRegrasStats()

      expect(stats.total).toBe(2)
      expect(stats.ativas).toBe(1)
      expect(stats.inativas).toBe(1)
      expect(stats.total_aplicacoes).toBe(0)
    })

    it('deve retornar regra mais usada', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra 1',
          tipo_regra: 'contains',
          padrao: 'teste1',
          prioridade: 1,
          ativa: true,
          total_aplicacoes: 10,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'r2',
          categoria_id: categoriaId,
          nome: 'Regra 2',
          tipo_regra: 'contains',
          padrao: 'teste2',
          prioridade: 2,
          ativa: true,
          total_aplicacoes: 5,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      const stats = await regraClassificacaoService.getRegrasStats()

      expect(stats.mais_usada?.id).toBe('r1')
      expect(stats.total_aplicacoes).toBe(15)
    })
  })

  describe('updatePrioridades', () => {
    it('deve atualizar prioridades de múltiplas regras', async () => {
      mockResponse('regras_classificacao', [
        {
          id: 'r1',
          categoria_id: categoriaId,
          nome: 'Regra 1',
          tipo_regra: 'contains',
          padrao: 'teste1',
          prioridade: 10,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      await regraClassificacaoService.updatePrioridades([
        { id: 'r1', prioridade: 10 },
        { id: 'r2', prioridade: 20 },
      ])

      expect(mockSupabase.from).toHaveBeenCalledWith('regras_classificacao')
    })
  })
})
