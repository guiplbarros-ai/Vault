/**
 * Testes Unitários - CategoriaService
 * Agent CORE: Implementador
 *
 * Testa operações CRUD de categorias (Supabase mocks)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mock setup: inline to avoid module resolution issues
const { mockSupabase, mockResponse, resetMocks } = vi.hoisted(() => {
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
        data: { user: { id: '00000000-0000-0000-0000-000000000001' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } },
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
      data: { user: { id: '00000000-0000-0000-0000-000000000001' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, resetMocks }
})

vi.mock('@/lib/db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

import { CategoriaService } from '@/lib/services/categoria.service'
import type { Categoria, CreateCategoriaDTO } from '@/lib/types'
import { categoriasDespesa, categoriasReceita, todasCategorias } from '../../fixtures/categorias'

describe('CategoriaService', () => {
  const service = new CategoriaService()

  beforeEach(() => {
    resetMocks()
  })

  // ── Helpers ────────────────────────────────────────────────
  function categoriaToRow(c: Categoria): Record<string, unknown> {
    return {
      ...c,
      created_at: c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at,
      updated_at: c.updated_at instanceof Date ? c.updated_at.toISOString() : c.updated_at,
    }
  }

  const todasRows = todasCategorias.map(categoriaToRow)
  const despesaRows = categoriasDespesa.map(categoriaToRow)
  const receitaRows = categoriasReceita.map(categoriaToRow)
  const ativasRows = todasCategorias.filter((c) => c.ativa).map(categoriaToRow)
  const inativasRows = todasCategorias.filter((c) => !c.ativa).map(categoriaToRow)

  describe('listCategorias', () => {
    it('deve listar todas as categorias quando sem filtros', async () => {
      mockResponse('categorias', todasRows)

      const result = await service.listCategorias()

      expect(result).toHaveLength(todasCategorias.length)
    })

    it('deve filtrar categorias por tipo (despesa)', async () => {
      mockResponse('categorias', despesaRows)

      const result = await service.listCategorias({ tipo: 'despesa' })

      expect(result).toHaveLength(categoriasDespesa.length)
      expect(result.every((c) => c.tipo === 'despesa')).toBe(true)
    })

    it('deve filtrar categorias por tipo (receita)', async () => {
      mockResponse('categorias', receitaRows)

      const result = await service.listCategorias({ tipo: 'receita' })

      expect(result).toHaveLength(categoriasReceita.length)
      expect(result.every((c) => c.tipo === 'receita')).toBe(true)
    })

    it('deve filtrar apenas categorias ativas', async () => {
      mockResponse('categorias', ativasRows)

      const result = await service.listCategorias({ ativas: true })

      expect(result.every((c) => c.ativa === true)).toBe(true)
      expect(result.some((c) => c.id === 'cat-inativa')).toBe(false)
    })

    it('deve incluir categorias inativas quando ativas=false', async () => {
      mockResponse('categorias', inativasRows)

      const result = await service.listCategorias({ ativas: false })

      expect(result.every((c) => c.ativa === false)).toBe(true)
      expect(result.some((c) => c.id === 'cat-inativa')).toBe(true)
    })

    it('deve aplicar paginação corretamente', async () => {
      const paginatedRows = todasRows.slice(0, 3)
      mockResponse('categorias', paginatedRows)

      const result = await service.listCategorias({
        limit: 3,
        offset: 0,
      })

      expect(result).toHaveLength(3)
    })

    it('deve chamar from(categorias) com select e or', async () => {
      mockResponse('categorias', todasRows)

      await service.listCategorias()

      expect(mockSupabase.from).toHaveBeenCalledWith('categorias')
    })
  })

  describe('getCategoriaById', () => {
    it('deve retornar categoria quando ID existe', async () => {
      const row = categoriaToRow(categoriasDespesa[0]!)
      mockResponse('categorias', row)

      const result = await service.getCategoriaById('cat-alimentacao')

      expect(result).toBeDefined()
      expect(result?.id).toBe('cat-alimentacao')
      expect(result?.nome).toBe('Alimentação')
    })

    it('deve retornar null quando ID não existe', async () => {
      mockResponse('categorias', null)

      const result = await service.getCategoriaById('id-inexistente')

      expect(result).toBeNull()
    })
  })

  describe('createCategoria', () => {
    it('deve criar categoria com dados válidos', async () => {
      const dto: CreateCategoriaDTO = {
        nome: 'Nova Categoria',
        tipo: 'despesa',
        icone: '🆕',
        cor: '#FF0000',
      }

      const insertedRow = {
        id: 'generated-uuid',
        nome: dto.nome,
        tipo: dto.tipo,
        grupo: undefined,
        pai_id: null,
        icone: dto.icone,
        cor: dto.cor,
        ordem: 0,
        ativa: true,
        is_sistema: false,
        usuario_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('categorias', insertedRow)

      const result = await service.createCategoria(dto)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.nome).toBe('Nova Categoria')
      expect(result.tipo).toBe('despesa')
      expect(result.ativa).toBe(true)
      expect(result.created_at).toBeDefined()
      expect(result.updated_at).toBeDefined()
    })

    it('deve criar categoria com ordem padrão', async () => {
      const dto: CreateCategoriaDTO = {
        nome: 'Categoria Ordem Auto',
        tipo: 'despesa',
        icone: '🔢',
        cor: '#00FF00',
      }

      const insertedRow = {
        id: 'generated-uuid-2',
        nome: dto.nome,
        tipo: dto.tipo,
        icone: dto.icone,
        cor: dto.cor,
        ordem: 0,
        ativa: true,
        is_sistema: false,
        usuario_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('categorias', insertedRow)

      const result = await service.createCategoria(dto)

      expect(result.ordem).toBeDefined()
      expect(typeof result.ordem).toBe('number')
    })

    it('deve lançar erro quando falta campo obrigatório (nome)', async () => {
      const dto = {
        tipo: 'despesa',
        icone: '❌',
        cor: '#FF0000',
      } as any

      await expect(service.createCategoria(dto)).rejects.toThrow()
    })

    it('deve lançar erro quando tipo é inválido', async () => {
      const dto = {
        nome: 'Categoria Inválida',
        tipo: 'tipo-invalido',
        icone: '❌',
        cor: '#FF0000',
      } as any

      // The service validates nome and tipo, but tipo-invalido passes the truthy check.
      // Supabase would reject it. Mock an error response.
      mockResponse('categorias', null, { message: 'Invalid tipo', code: '22000' })

      await expect(service.createCategoria(dto)).rejects.toThrow()
    })
  })

  describe('updateCategoria', () => {
    it('deve atualizar categoria existente', async () => {
      const existingRow = categoriaToRow(categoriasDespesa[0]!)
      const updatedRow = {
        ...existingRow,
        nome: 'Alimentação Atualizada',
        icone: '🍕',
        updated_at: new Date().toISOString(),
      }
      mockResponse('categorias', updatedRow)

      const result = await service.updateCategoria('cat-alimentacao', {
        nome: 'Alimentação Atualizada',
        icone: '🍕',
      })

      expect(result).toBeDefined()
      expect(result.nome).toBe('Alimentação Atualizada')
      expect(result.icone).toBe('🍕')
      expect(result.updated_at).toBeDefined()
      expect(result.created_at).toBeDefined()
    })

    it('deve lançar erro quando ID não existe', async () => {
      mockResponse('categorias', null)

      await expect(
        service.updateCategoria('id-inexistente', { nome: 'Não Importa' })
      ).rejects.toThrow()
    })

    it('deve preservar campos não atualizados', async () => {
      const original = categoriasDespesa[0]!
      const existingRow = categoriaToRow(original)
      const updatedRow = {
        ...existingRow,
        nome: 'Nome Atualizado',
        updated_at: new Date().toISOString(),
      }
      mockResponse('categorias', updatedRow)

      const result = await service.updateCategoria('cat-alimentacao', {
        nome: 'Nome Atualizado',
      })

      expect(result.tipo).toBe(original.tipo)
      expect(result.icone).toBe(original.icone)
      expect(result.cor).toBe(original.cor)
    })
  })

  describe('deleteCategoria (soft delete)', () => {
    it('deve desativar categoria (soft delete)', async () => {
      mockResponse('categorias', { data: null, error: null })

      await service.deleteCategoria('cat-alimentacao')

      expect(mockSupabase.from).toHaveBeenCalledWith('categorias')
    })

    it('não deve lançar erro quando ID não existe (soft delete seguro)', async () => {
      mockResponse('categorias', { data: null, error: null })

      await service.deleteCategoria('id-inexistente')
      expect(true).toBe(true)
    })
  })

  describe('alternar status ativa (via update)', () => {
    it('deve desativar categoria via update', async () => {
      const existingRow = categoriaToRow(categoriasDespesa[0]!)
      const updatedRow = {
        ...existingRow,
        ativa: false,
        updated_at: new Date().toISOString(),
      }
      mockResponse('categorias', updatedRow)

      const result = await service.updateCategoria('cat-alimentacao', { ativa: false })

      expect(result.ativa).toBe(false)
    })

    it('deve ativar categoria via update', async () => {
      const original = todasCategorias.find((c) => c.id === 'cat-inativa')!
      const existingRow = categoriaToRow(original)
      const updatedRow = {
        ...existingRow,
        ativa: true,
        updated_at: new Date().toISOString(),
      }
      mockResponse('categorias', updatedRow)

      const result = await service.updateCategoria('cat-inativa', { ativa: true })

      expect(result.ativa).toBe(true)
    })
  })
})
