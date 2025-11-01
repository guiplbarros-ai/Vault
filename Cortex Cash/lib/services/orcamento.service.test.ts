/**
 * Testes Unitários - OrcamentoService
 * Agent FINANCE: Implementador
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrcamentoService } from './orcamento.service';
import { getDB } from '../db/client';
import { NotFoundError, ValidationError } from '../errors';
import type { Orcamento, Categoria, CentroCusto, Transacao } from '../types';

describe('OrcamentoService', () => {
  let service: OrcamentoService;
  let categoriaId: string;
  let centroCustoId: string;

  beforeEach(async () => {
    service = new OrcamentoService();

    // Limpar database antes de cada teste
    const db = getDB();
    await db.orcamentos.clear();
    await db.categorias.clear();
    await db.centros_custo.clear();
    await db.transacoes.clear();

    // Criar categoria de teste
    const categoria: Categoria = {
      id: crypto.randomUUID(),
      nome: 'Alimentação',
      tipo: 'despesa',
      icone: '🍔',
      cor: '#FF6B6B',
      ativa: true,
      ordem: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.categorias.add(categoria);
    categoriaId = categoria.id;

    // Criar centro de custo de teste
    const centroCusto: CentroCusto = {
      id: crypto.randomUUID(),
      nome: 'Viagem São Paulo',
      descricao: 'Despesas da viagem',
      ativo: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.centros_custo.add(centroCusto);
    centroCustoId = centroCusto.id;
  });

  // ============================================================================
  // CRUD - Create
  // ============================================================================

  describe('createOrcamento', () => {
    it('deve criar orçamento de categoria com sucesso', async () => {
      const novoOrcamento = {
        nome: 'Alimentação Novembro',
        tipo: 'categoria' as const,
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1500,
        alerta_80: true,
        alerta_100: true,
      };

      const result = await service.createOrcamento(novoOrcamento);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Alimentação Novembro');
      expect(result.tipo).toBe('categoria');
      expect(result.categoria_id).toBe(categoriaId);
      expect(result.mes_referencia).toBe('2025-11');
      expect(result.valor_planejado).toBe(1500);
      expect(result.valor_realizado).toBe(0);
      expect(result.alerta_80).toBe(true);
      expect(result.alerta_100).toBe(true);
      expect(result.alerta_80_enviado).toBe(false);
      expect(result.alerta_100_enviado).toBe(false);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('deve criar orçamento de centro de custo com sucesso', async () => {
      const novoOrcamento = {
        nome: 'Viagem Novembro',
        tipo: 'centro_custo' as const,
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 5000,
      };

      const result = await service.createOrcamento(novoOrcamento);

      expect(result.tipo).toBe('centro_custo');
      expect(result.centro_custo_id).toBe(centroCustoId);
    });

    it('deve rejeitar orçamento de categoria sem categoria_id', async () => {
      const orcamentoInvalido = {
        nome: 'Orçamento Inválido',
        tipo: 'categoria' as const,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      };

      await expect(service.createOrcamento(orcamentoInvalido)).rejects.toThrow(ValidationError);
    });

    it('deve rejeitar orçamento de centro de custo sem centro_custo_id', async () => {
      const orcamentoInvalido = {
        nome: 'Orçamento Inválido',
        tipo: 'centro_custo' as const,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      };

      await expect(service.createOrcamento(orcamentoInvalido)).rejects.toThrow(ValidationError);
    });

    it('deve rejeitar valor planejado zero ou negativo', async () => {
      const orcamentoInvalido = {
        nome: 'Orçamento Zero',
        tipo: 'categoria' as const,
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 0,
      };

      await expect(service.createOrcamento(orcamentoInvalido)).rejects.toThrow(ValidationError);
    });

    it('deve rejeitar formato inválido de mes_referencia', async () => {
      const orcamentoInvalido = {
        nome: 'Orçamento Inválido',
        tipo: 'categoria' as const,
        categoria_id: categoriaId,
        mes_referencia: '11-2025', // Formato errado
        valor_planejado: 1000,
      };

      await expect(service.createOrcamento(orcamentoInvalido)).rejects.toThrow(ValidationError);
    });

    it('deve rejeitar categoria inexistente', async () => {
      const orcamentoInvalido = {
        nome: 'Orçamento Inválido',
        tipo: 'categoria' as const,
        categoria_id: 'categoria-inexistente',
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      };

      await expect(service.createOrcamento(orcamentoInvalido)).rejects.toThrow(NotFoundError);
    });

    it('deve usar alertas padrão (true) quando não especificados', async () => {
      const novoOrcamento = {
        nome: 'Orçamento Padrão',
        tipo: 'categoria' as const,
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      };

      const result = await service.createOrcamento(novoOrcamento);

      expect(result.alerta_80).toBe(true);
      expect(result.alerta_100).toBe(true);
    });
  });

  // ============================================================================
  // CRUD - Read
  // ============================================================================

  describe('listOrcamentos', () => {
    beforeEach(async () => {
      // Criar orçamentos de teste
      await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1500,
      });

      await service.createOrcamento({
        nome: 'Alimentação Dez',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-12',
        valor_planejado: 1800,
      });

      await service.createOrcamento({
        nome: 'Viagem Nov',
        tipo: 'centro_custo',
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 5000,
      });
    });

    it('deve listar todos os orçamentos', async () => {
      const result = await service.listOrcamentos();
      expect(result).toHaveLength(3);
    });

    it('deve filtrar por mes_referencia', async () => {
      const result = await service.listOrcamentos({ mesReferencia: '2025-11' });
      expect(result).toHaveLength(2);
      expect(result.every(o => o.mes_referencia === '2025-11')).toBe(true);
    });

    it('deve filtrar por tipo', async () => {
      const result = await service.listOrcamentos({ tipo: 'categoria' });
      expect(result).toHaveLength(2);
      expect(result.every(o => o.tipo === 'categoria')).toBe(true);
    });

    it('deve filtrar por categoria_id', async () => {
      const result = await service.listOrcamentos({ categoriaId: categoriaId });
      expect(result).toHaveLength(2);
      expect(result.every(o => o.categoria_id === categoriaId)).toBe(true);
    });

    it('deve ordenar por nome ascendente', async () => {
      const result = await service.listOrcamentos({ sortBy: 'nome', sortOrder: 'asc' });
      expect(result[0].nome).toBe('Alimentação Dez');
      expect(result[1].nome).toBe('Alimentação Nov');
      expect(result[2].nome).toBe('Viagem Nov');
    });

    it('deve ordenar por valor_planejado descendente', async () => {
      const result = await service.listOrcamentos({ sortBy: 'valor_planejado', sortOrder: 'desc' });
      expect(result[0].valor_planejado).toBe(5000);
      expect(result[1].valor_planejado).toBe(1800);
      expect(result[2].valor_planejado).toBe(1500);
    });

    it('deve aplicar paginação', async () => {
      const result = await service.listOrcamentos({ limit: 2, offset: 0 });
      expect(result).toHaveLength(2);
    });
  });

  describe('getOrcamentoById', () => {
    it('deve retornar orçamento existente', async () => {
      const criado = await service.createOrcamento({
        nome: 'Teste',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      const result = await service.getOrcamentoById(criado.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(criado.id);
    });

    it('deve retornar null para ID inexistente', async () => {
      const result = await service.getOrcamentoById('id-inexistente');
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CRUD - Update
  // ============================================================================

  describe('updateOrcamento', () => {
    it('deve atualizar orçamento com sucesso', async () => {
      const criado = await service.createOrcamento({
        nome: 'Orçamento Original',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      const atualizado = await service.updateOrcamento(criado.id, {
        nome: 'Orçamento Atualizado',
        valor_planejado: 1500,
        alerta_80: false,
      });

      expect(atualizado.nome).toBe('Orçamento Atualizado');
      expect(atualizado.valor_planejado).toBe(1500);
      expect(atualizado.alerta_80).toBe(false);
      expect(atualizado.updated_at.getTime()).toBeGreaterThan(criado.updated_at.getTime());
    });

    it('deve rejeitar atualização de orçamento inexistente', async () => {
      await expect(
        service.updateOrcamento('id-inexistente', { nome: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError);
    });

    it('deve rejeitar valor planejado zero ou negativo', async () => {
      const criado = await service.createOrcamento({
        nome: 'Teste',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      await expect(
        service.updateOrcamento(criado.id, { valor_planejado: 0 })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============================================================================
  // CRUD - Delete
  // ============================================================================

  describe('deleteOrcamento', () => {
    it('deve deletar orçamento existente', async () => {
      const criado = await service.createOrcamento({
        nome: 'Teste',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      await service.deleteOrcamento(criado.id);

      const busca = await service.getOrcamentoById(criado.id);
      expect(busca).toBeNull();
    });

    it('deve rejeitar deleção de orçamento inexistente', async () => {
      await expect(service.deleteOrcamento('id-inexistente')).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================================================
  // TRACKING - Valor Realizado
  // ============================================================================

  describe('recalcularValorRealizado', () => {
    it('deve calcular valor realizado com base em transações de despesa', async () => {
      const db = getDB();

      // Criar orçamento para Novembro 2025
      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      // Criar transações de despesa em Novembro
      const transacao1: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -200,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao1);

      const transacao2: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Restaurante',
        valor: -150,
        data: new Date('2025-11-15'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao2);

      // Recalcular
      const atualizado = await service.recalcularValorRealizado(orcamento.id);

      expect(atualizado.valor_realizado).toBe(350); // 200 + 150 (valores absolutos)
    });

    it('deve ignorar transações de receita', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      // Criar transação de RECEITA (não deve contar)
      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'receita',
        descricao: 'Reembolso',
        valor: 100,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      const atualizado = await service.recalcularValorRealizado(orcamento.id);

      expect(atualizado.valor_realizado).toBe(0); // Receitas não contam
    });

    it('deve ignorar transações fora do mês de referência', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      // Transação em OUTUBRO (não deve contar)
      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -200,
        data: new Date('2025-10-31'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      const atualizado = await service.recalcularValorRealizado(orcamento.id);

      expect(atualizado.valor_realizado).toBe(0); // Fora do mês
    });

    it('deve atualizar flags de alerta ao atingir 80%', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        alerta_80: true,
      });

      // Criar transação de 85% do orçamento
      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Compra grande',
        valor: -850,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      const atualizado = await service.recalcularValorRealizado(orcamento.id);

      expect(atualizado.valor_realizado).toBe(850);
      expect(atualizado.alerta_80_enviado).toBe(true);
    });

    it('deve atualizar flags de alerta ao atingir 100%', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        alerta_100: true,
      });

      // Criar transação de 110% do orçamento
      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Compra gigante',
        valor: -1100,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      const atualizado = await service.recalcularValorRealizado(orcamento.id);

      expect(atualizado.valor_realizado).toBe(1100);
      expect(atualizado.alerta_100_enviado).toBe(true);
    });
  });

  describe('recalcularTodosDoMes', () => {
    it('deve recalcular todos os orçamentos de um mês', async () => {
      const db = getDB();

      // Criar 2 orçamentos para Novembro
      const orc1 = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      const orc2 = await service.createOrcamento({
        nome: 'Viagem Nov',
        tipo: 'centro_custo',
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 5000,
      });

      // Criar transação para cada um
      const trans1: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -300,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(trans1);

      const trans2: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Hotel',
        valor: -1500,
        data: new Date('2025-11-15'),
        centro_custo_id: centroCustoId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(trans2);

      // Recalcular todos
      const count = await service.recalcularTodosDoMes('2025-11');

      expect(count).toBe(2);

      const orc1Atualizado = await service.getOrcamentoById(orc1.id);
      const orc2Atualizado = await service.getOrcamentoById(orc2.id);

      expect(orc1Atualizado?.valor_realizado).toBe(300);
      expect(orc2Atualizado?.valor_realizado).toBe(1500);
    });
  });

  // ============================================================================
  // ENRIQUECIMENTO - Orçamentos com Progresso
  // ============================================================================

  describe('listOrcamentosComProgresso', () => {
    it('deve enriquecer orçamentos com dados de progresso', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      // Criar transação de 60%
      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -600,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      await service.recalcularValorRealizado(orcamento.id);

      const result = await service.listOrcamentosComProgresso({ mesReferencia: '2025-11' });

      expect(result).toHaveLength(1);
      expect(result[0].percentual_usado).toBe(60);
      expect(result[0].valor_restante).toBe(400);
      expect(result[0].status).toBe('ok');
      expect(result[0].categoria_nome).toBe('Alimentação');
      expect(result[0].categoria_icone).toBe('🍔');
      expect(result[0].categoria_cor).toBe('#FF6B6B');
    });

    it('deve calcular status "atencao" quando >= 80%', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -850,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      await service.recalcularValorRealizado(orcamento.id);

      const result = await service.listOrcamentosComProgresso({ mesReferencia: '2025-11' });

      expect(result[0].status).toBe('atencao');
    });

    it('deve calcular status "excedido" quando >= 100%', async () => {
      const db = getDB();

      const orcamento = await service.createOrcamento({
        nome: 'Alimentação Nov',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      const transacao: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -1200,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(transacao);

      await service.recalcularValorRealizado(orcamento.id);

      const result = await service.listOrcamentosComProgresso({ mesReferencia: '2025-11' });

      expect(result[0].status).toBe('excedido');
    });
  });

  // ============================================================================
  // RELATÓRIOS E ANÁLISES
  // ============================================================================

  describe('getResumoMensal', () => {
    it('deve retornar resumo consolidado do mês', async () => {
      const db = getDB();

      // Criar segunda categoria para orc3
      const categoria2: Categoria = {
        id: crypto.randomUUID(),
        nome: 'Transporte',
        tipo: 'despesa',
        icone: '🚗',
        cor: '#4ECDC4',
        ativa: true,
        ordem: 2,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.categorias.add(categoria2);

      // Criar 3 orçamentos para Novembro
      const orc1 = await service.createOrcamento({
        nome: 'Alimentação',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
      });

      const orc2 = await service.createOrcamento({
        nome: 'Viagem',
        tipo: 'centro_custo',
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 3000,
      });

      const orc3 = await service.createOrcamento({
        nome: 'Transporte',
        tipo: 'categoria',
        categoria_id: categoria2.id,
        mes_referencia: '2025-11',
        valor_planejado: 500,
      });

      // Criar transações: orc1 60%, orc2 90%, orc3 110%
      const trans1: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Mercado',
        valor: -600,
        data: new Date('2025-11-10'),
        categoria_id: categoriaId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(trans1);

      const trans2: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Hotel',
        valor: -2700,
        data: new Date('2025-11-15'),
        centro_custo_id: centroCustoId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(trans2);

      const trans3: Transacao = {
        id: crypto.randomUUID(),
        tipo: 'despesa',
        descricao: 'Uber',
        valor: -550,
        data: new Date('2025-11-20'),
        categoria_id: categoria2.id,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.transacoes.add(trans3);

      // Recalcular todos
      await service.recalcularTodosDoMes('2025-11');

      // Obter resumo
      const resumo = await service.getResumoMensal('2025-11');

      expect(resumo.total_planejado).toBe(4500); // 1000 + 3000 + 500
      expect(resumo.total_realizado).toBeCloseTo(3850, 1); // 600 + 2700 + 550
      expect(resumo.total_restante).toBeCloseTo(650, 1);
      expect(resumo.percentual_usado).toBeCloseTo(85.56, 1);
      expect(resumo.orcamentos_ok).toBe(1); // orc1 (60%)
      expect(resumo.orcamentos_atencao).toBe(1); // orc2 (90%)
      expect(resumo.orcamentos_excedidos).toBe(1); // orc3 (110%)
    });
  });

  describe('copiarOrcamentosParaMes', () => {
    it('deve copiar orçamentos de um mês para outro', async () => {
      // Criar orçamentos em Novembro
      await service.createOrcamento({
        nome: 'Alimentação',
        tipo: 'categoria',
        categoria_id: categoriaId,
        mes_referencia: '2025-11',
        valor_planejado: 1000,
        alerta_80: false,
      });

      await service.createOrcamento({
        nome: 'Viagem',
        tipo: 'centro_custo',
        centro_custo_id: centroCustoId,
        mes_referencia: '2025-11',
        valor_planejado: 5000,
      });

      // Copiar para Dezembro
      const count = await service.copiarOrcamentosParaMes('2025-11', '2025-12');

      expect(count).toBe(2);

      const orcamentosDez = await service.listOrcamentos({ mesReferencia: '2025-12' });

      expect(orcamentosDez).toHaveLength(2);
      expect(orcamentosDez[0].mes_referencia).toBe('2025-12');
      expect(orcamentosDez[0].valor_realizado).toBe(0); // Novo orçamento começa zerado
      expect(orcamentosDez[0].alerta_80_enviado).toBe(false);
      expect(orcamentosDez[0].alerta_100_enviado).toBe(false);
    });
  });
});
