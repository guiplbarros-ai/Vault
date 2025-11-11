/**
 * Testes Unitários - CartaoService
 * Agent CORE: Implementador
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CartaoService } from './cartao.service';
import { getDB } from '../db/client';
import { NotFoundError, ValidationError } from '../errors';
import type { CreateCartaoDTO, CreateFaturaDTO, CreateFaturaLancamentoDTO } from '../types';

describe('CartaoService', () => {
  let service: CartaoService;
  let instituicaoId: string;
  let contaId: string;

  beforeEach(async () => {
    service = new CartaoService();

    // Limpar database
    const db = getDB();
    await db.cartoes_config.clear();
    await db.faturas.clear();
    await db.faturas_lancamentos.clear();
    await db.contas.clear();
    await db.instituicoes.clear();

    // Criar instituição e conta
    instituicaoId = crypto.randomUUID();
    await db.instituicoes.add({
      id: instituicaoId,
      nome: 'Banco Teste',
      created_at: new Date(),
      updated_at: new Date(),
    });

    contaId = crypto.randomUUID();
    await db.contas.add({
      id: contaId,
      instituicao_id: instituicaoId,
      nome: 'Conta Corrente',
      tipo: 'corrente',
      saldo_referencia: 1000,
      data_referencia: new Date(),
      saldo_atual: 1000,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe('Cartões - CRUD', () => {
    it('deve listar cartões ativos', async () => {
      const db = getDB();

      await db.cartoes_config.add({
        id: crypto.randomUUID(),
        instituicao_id: instituicaoId,
        nome: 'Cartão Ativo',
        limite_total: 5000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.cartoes_config.add({
        id: crypto.randomUUID(),
        instituicao_id: instituicaoId,
        nome: 'Cartão Inativo',
        limite_total: 3000,
        dia_fechamento: 10,
        dia_vencimento: 20,
        ativo: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const cartoes = await service.listCartoes();

      expect(cartoes).toHaveLength(1);
      expect(cartoes[0].nome).toBe('Cartão Ativo');
    });

    it('deve incluir cartões inativos quando solicitado', async () => {
      const db = getDB();

      await db.cartoes_config.add({
        id: crypto.randomUUID(),
        instituicao_id: instituicaoId,
        nome: 'Cartão Ativo',
        limite_total: 5000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.cartoes_config.add({
        id: crypto.randomUUID(),
        instituicao_id: instituicaoId,
        nome: 'Cartão Inativo',
        limite_total: 3000,
        dia_fechamento: 10,
        dia_vencimento: 20,
        ativo: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const cartoes = await service.listCartoes({ incluirInativos: true });

      expect(cartoes).toHaveLength(2);
    });

    it('deve criar cartão com sucesso', async () => {
      const data: CreateCartaoDTO = {
        instituicao_id: instituicaoId,
        nome: 'Visa Platinum',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        bandeira: 'visa',
      };

      const cartao = await service.createCartao(data);

      expect(cartao.id).toBeDefined();
      expect(cartao.nome).toBe('Visa Platinum');
      expect(cartao.limite_total).toBe(10000);
      expect(cartao.ativo).toBe(true);
      expect(cartao.created_at).toBeInstanceOf(Date);
    });

    it('deve buscar cartão por ID', async () => {
      const db = getDB();
      const id = crypto.randomUUID();

      await db.cartoes_config.add({
        id,
        instituicao_id: instituicaoId,
        nome: 'Mastercard Gold',
        limite_total: 8000,
        dia_fechamento: 10,
        dia_vencimento: 20,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const cartao = await service.getCartaoById(id);

      expect(cartao).toBeDefined();
      expect(cartao?.nome).toBe('Mastercard Gold');
    });

    it('deve retornar null para cartão inexistente', async () => {
      const cartao = await service.getCartaoById('id-inexistente');
      expect(cartao).toBeNull();
    });

    it('deve atualizar cartão', async () => {
      const db = getDB();
      const id = crypto.randomUUID();

      await db.cartoes_config.add({
        id,
        instituicao_id: instituicaoId,
        nome: 'Cartão Original',
        limite_total: 5000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const updated = await service.updateCartao(id, {
        nome: 'Cartão Atualizado',
        limite_total: 7000,
      });

      expect(updated.nome).toBe('Cartão Atualizado');
      expect(updated.limite_total).toBe(7000);
      expect(updated.dia_fechamento).toBe(15); // Não alterado
    });

    it('deve alternar status ativo/inativo', async () => {
      const db = getDB();
      const id = crypto.randomUUID();

      await db.cartoes_config.add({
        id,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 5000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const toggled = await service.toggleAtivo(id);
      expect(toggled.ativo).toBe(false);

      const toggledAgain = await service.toggleAtivo(id);
      expect(toggledAgain.ativo).toBe(true);
    });

    it('deve fazer soft delete de cartão', async () => {
      const db = getDB();
      const id = crypto.randomUUID();

      await db.cartoes_config.add({
        id,
        instituicao_id: instituicaoId,
        nome: 'Cartão Delete',
        limite_total: 5000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await service.deleteCartao(id);

      const cartao = await db.cartoes_config.get(id);
      expect(cartao?.ativo).toBe(false);
    });

    it('deve ordenar cartões por nome', async () => {
      const db = getDB();

      await db.cartoes_config.bulkAdd([
        {
          id: crypto.randomUUID(),
          instituicao_id: instituicaoId,
          nome: 'Cartão C',
          limite_total: 5000,
          dia_fechamento: 15,
          dia_vencimento: 25,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          instituicao_id: instituicaoId,
          nome: 'Cartão A',
          limite_total: 3000,
          dia_fechamento: 10,
          dia_vencimento: 20,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          instituicao_id: instituicaoId,
          nome: 'Cartão B',
          limite_total: 4000,
          dia_fechamento: 12,
          dia_vencimento: 22,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const cartoes = await service.listCartoes({ sortBy: 'nome', sortOrder: 'asc' });

      expect(cartoes[0].nome).toBe('Cartão A');
      expect(cartoes[1].nome).toBe('Cartão B');
      expect(cartoes[2].nome).toBe('Cartão C');
    });

    it('deve filtrar por instituição', async () => {
      const db = getDB();
      const inst2Id = crypto.randomUUID();

      await db.instituicoes.add({
        id: inst2Id,
        nome: 'Banco 2',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.cartoes_config.bulkAdd([
        {
          id: crypto.randomUUID(),
          instituicao_id: instituicaoId,
          nome: 'Cartão Inst1',
          limite_total: 5000,
          dia_fechamento: 15,
          dia_vencimento: 25,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          instituicao_id: inst2Id,
          nome: 'Cartão Inst2',
          limite_total: 3000,
          dia_fechamento: 10,
          dia_vencimento: 20,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const cartoes = await service.listCartoes({ instituicaoId: instituicaoId });

      expect(cartoes).toHaveLength(1);
      expect(cartoes[0].nome).toBe('Cartão Inst1');
    });
  });

  describe('Faturas - CRUD', () => {
    let cartaoId: string;

    beforeEach(async () => {
      const db = getDB();
      cartaoId = crypto.randomUUID();

      await db.cartoes_config.add({
        id: cartaoId,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('deve criar fatura', async () => {
      const data: CreateFaturaDTO = {
        cartao_id: cartaoId,
        mes_referencia: '2024-01',
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 0,
      };

      const fatura = await service.createFatura(data);

      expect(fatura.id).toBeDefined();
      expect(fatura.cartao_id).toBe(cartaoId);
      expect(fatura.mes_referencia).toBe('2024-01');
      expect(fatura.status).toBe('aberta');
      expect(fatura.valor_total).toBe(0);
    });

    it('deve listar faturas de um cartão', async () => {
      const db = getDB();

      await db.faturas.bulkAdd([
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-01',
          data_fechamento: new Date('2024-01-15'),
          data_vencimento: new Date('2024-01-25'),
          valor_total: 1500,
          status: 'aberta',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-02',
          data_fechamento: new Date('2024-02-15'),
          data_vencimento: new Date('2024-02-25'),
          valor_total: 2000,
          status: 'fechada',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const faturas = await service.listFaturas(cartaoId);

      expect(faturas).toHaveLength(2);
    });

    it('deve filtrar faturas por status', async () => {
      const db = getDB();

      await db.faturas.bulkAdd([
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-01',
          data_fechamento: new Date('2024-01-15'),
          data_vencimento: new Date('2024-01-25'),
          valor_total: 1500,
          status: 'aberta',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-02',
          data_fechamento: new Date('2024-02-15'),
          data_vencimento: new Date('2024-02-25'),
          valor_total: 2000,
          status: 'paga',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const faturas = await service.listFaturas(cartaoId, { status: 'aberta' });

      expect(faturas).toHaveLength(1);
      expect(faturas[0].status).toBe('aberta');
    });

    it('deve buscar fatura por ID', async () => {
      const db = getDB();
      const faturaId = crypto.randomUUID();

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: '2024-01',
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 1500,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const fatura = await service.getFaturaById(faturaId);

      expect(fatura).toBeDefined();
      expect(fatura?.mes_referencia).toBe('2024-01');
    });

    it('deve atualizar fatura', async () => {
      const db = getDB();
      const faturaId = crypto.randomUUID();

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: '2024-01',
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 1500,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const updated = await service.updateFatura(faturaId, {
        valor_total: 2000,
      });

      expect(updated.valor_total).toBe(2000);
    });

    it('deve fechar fatura', async () => {
      const db = getDB();
      const faturaId = crypto.randomUUID();

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: '2024-01',
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 1500,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const fechada = await service.fecharFatura(faturaId);

      expect(fechada.status).toBe('fechada');
    });
  });

  describe('Lançamentos', () => {
    let cartaoId: string;
    let faturaId: string;

    beforeEach(async () => {
      const db = getDB();
      cartaoId = crypto.randomUUID();
      faturaId = crypto.randomUUID();

      // Calcular mês de referência atual
      const hoje = new Date();
      const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

      await db.cartoes_config.add({
        id: cartaoId,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: mesReferencia,
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 0,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('deve criar lançamento', async () => {
      const data: CreateFaturaLancamentoDTO = {
        fatura_id: faturaId,
        data_compra: new Date('2024-01-10'),
        descricao: 'Compra Mercado',
        valor_brl: 150.50,
      };

      const lancamento = await service.createLancamento(data);

      expect(lancamento.id).toBeDefined();
      expect(lancamento.fatura_id).toBe(faturaId);
      expect(lancamento.descricao).toBe('Compra Mercado');
      expect(lancamento.valor_brl).toBe(150.50);
    });

    it('deve listar lançamentos de uma fatura', async () => {
      const db = getDB();

      await db.faturas_lancamentos.bulkAdd([
        {
          id: crypto.randomUUID(),
          fatura_id: faturaId,
          data_compra: new Date('2024-01-05'),
          descricao: 'Compra 1',
          valor_brl: 100,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          fatura_id: faturaId,
          data_compra: new Date('2024-01-10'),
          descricao: 'Compra 2',
          valor_brl: 200,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const lancamentos = await service.listLancamentos(faturaId);

      expect(lancamentos).toHaveLength(2);
    });

    it('deve atualizar lançamento', async () => {
      const db = getDB();
      const lancamentoId = crypto.randomUUID();

      await db.faturas_lancamentos.add({
        id: lancamentoId,
        fatura_id: faturaId,
        data_compra: new Date('2024-01-10'),
        descricao: 'Compra Original',
        valor_brl: 100,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const updated = await service.updateLancamento(lancamentoId, {
        descricao: 'Compra Atualizada',
        valor_brl: 150,
      });

      expect(updated.descricao).toBe('Compra Atualizada');
      expect(updated.valor_brl).toBe(150);
    });

    it('deve deletar lançamento', async () => {
      const db = getDB();
      const lancamentoId = crypto.randomUUID();

      await db.faturas_lancamentos.add({
        id: lancamentoId,
        fatura_id: faturaId,
        data_compra: new Date('2024-01-10'),
        descricao: 'Compra Delete',
        valor_brl: 100,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await service.deleteLancamento(lancamentoId);

      const lancamento = await db.faturas_lancamentos.get(lancamentoId);
      expect(lancamento).toBeUndefined();
    });
  });

  describe('Operações Especiais', () => {
    let cartaoId: string;
    let faturaId: string;

    beforeEach(async () => {
      const db = getDB();
      cartaoId = crypto.randomUUID();
      faturaId = crypto.randomUUID();

      // Calcular mês de referência atual
      const hoje = new Date();
      const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

      await db.cartoes_config.add({
        id: cartaoId,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: mesReferencia,
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 0,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('deve recalcular valor da fatura', async () => {
      const db = getDB();

      await db.faturas_lancamentos.bulkAdd([
        {
          id: crypto.randomUUID(),
          fatura_id: faturaId,
          data_compra: new Date('2024-01-05'),
          descricao: 'Compra 1',
          valor_brl: 150.50,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          fatura_id: faturaId,
          data_compra: new Date('2024-01-10'),
          descricao: 'Compra 2',
          valor_brl: 200.75,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      await service.recalcularValorFatura(faturaId);

      const fatura = await db.faturas.get(faturaId);
      expect(fatura?.valor_total).toBeCloseTo(351.25, 2);
    });

    it('deve calcular limite disponível', async () => {
      const db = getDB();

      // Adicionar lançamentos
      await db.faturas_lancamentos.bulkAdd([
        {
          id: crypto.randomUUID(),
          fatura_id: faturaId,
          data_compra: new Date('2024-01-05'),
          descricao: 'Compra 1',
          valor_brl: 1500,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          fatura_id: faturaId,
          data_compra: new Date('2024-01-10'),
          descricao: 'Compra 2',
          valor_brl: 2500,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Recalcular fatura
      await service.recalcularValorFatura(faturaId);

      const limite = await service.getLimiteDisponivel(cartaoId);

      expect(limite.limite_total).toBe(10000);
      expect(limite.limite_usado).toBe(4000);
      expect(limite.limite_disponivel).toBe(6000);
      expect(limite.percentual_usado).toBeCloseTo(40, 1);
    });

    it('deve pagar fatura e criar transação', async () => {
      const db = getDB();

      // Adicionar valor à fatura
      await db.faturas.update(faturaId, { valor_total: 1500 });

      await service.pagarFatura({
        fatura_id: faturaId,
        conta_pagamento_id: contaId,
        valor_pago: 1500,
        data_pagamento: new Date('2024-01-25'),
      });

      const fatura = await db.faturas.get(faturaId);
      expect(fatura?.status).toBe('paga');
      expect(fatura?.valor_pago).toBe(1500);
      expect(fatura?.data_pagamento).toBeDefined();

      // Verificar se transação foi criada
      const transacoes = await db.transacoes.toArray();
      expect(transacoes.length).toBeGreaterThan(0);
      expect(transacoes[0].valor).toBe(1500); // Service cria com valor positivo
      expect(transacoes[0].tipo).toBe('despesa');
    });

    it('deve criar fatura atual se não existir', async () => {
      const fatura = await service.getOrCreateFaturaAtual(cartaoId);

      expect(fatura).toBeDefined();
      expect(fatura.cartao_id).toBe(cartaoId);
      expect(fatura.status).toBe('aberta');
    });
  });

  describe('Validações', () => {
    it('deve lançar erro ao criar cartão sem dados obrigatórios', async () => {
      await expect(
        service.createCartao({} as CreateCartaoDTO)
      ).rejects.toThrow();
    });

    it('deve lançar erro ao atualizar cartão inexistente', async () => {
      await expect(
        service.updateCartao('id-inexistente', { nome: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError);
    });

    it('deve lançar erro ao pagar valor maior que total da fatura', async () => {
      const db = getDB();
      const cartaoId = crypto.randomUUID();
      const faturaId = crypto.randomUUID();

      await db.cartoes_config.add({
        id: cartaoId,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: '2024-01',
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 1000,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        service.pagarFatura({
          fatura_id: faturaId,
          conta_pagamento_id: contaId,
          valor_pago: 2000, // Maior que valor_total
          data_pagamento: new Date(),
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com paginação corretamente', async () => {
      const db = getDB();

      // Criar 10 cartões
      for (let i = 0; i < 10; i++) {
        await db.cartoes_config.add({
          id: crypto.randomUUID(),
          instituicao_id: instituicaoId,
          nome: `Cartão ${i}`,
          limite_total: 5000,
          dia_fechamento: 15,
          dia_vencimento: 25,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      const primeiroLote = await service.listCartoes({ limit: 5, offset: 0 });
      const segundoLote = await service.listCartoes({ limit: 5, offset: 5 });

      expect(primeiroLote).toHaveLength(5);
      expect(segundoLote).toHaveLength(5);
      expect(primeiroLote[0].id).not.toBe(segundoLote[0].id);
    });

    it('deve tratar lançamentos com valores decimais', async () => {
      const db = getDB();
      const cartaoId = crypto.randomUUID();
      const faturaId = crypto.randomUUID();

      await db.cartoes_config.add({
        id: cartaoId,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.faturas.add({
        id: faturaId,
        cartao_id: cartaoId,
        mes_referencia: '2024-01',
        data_fechamento: new Date('2024-01-15'),
        data_vencimento: new Date('2024-01-25'),
        valor_total: 0,
        status: 'aberta',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await service.createLancamento({
        fatura_id: faturaId,
        data_compra: new Date(),
        descricao: 'Compra',
        valor_brl: 99.99,
      });

      await service.recalcularValorFatura(faturaId);

      const fatura = await db.faturas.get(faturaId);
      expect(fatura?.valor_total).toBeCloseTo(99.99, 2);
    });

    it('deve listar faturas ordenadas por data de vencimento', async () => {
      const db = getDB();
      const cartaoId = crypto.randomUUID();

      await db.cartoes_config.add({
        id: cartaoId,
        instituicao_id: instituicaoId,
        nome: 'Cartão Teste',
        limite_total: 10000,
        dia_fechamento: 15,
        dia_vencimento: 25,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.faturas.bulkAdd([
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-03',
          data_fechamento: new Date('2024-03-15'),
          data_vencimento: new Date('2024-03-25'),
          valor_total: 1000,
          status: 'aberta',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-01',
          data_fechamento: new Date('2024-01-15'),
          data_vencimento: new Date('2024-01-25'),
          valor_total: 1500,
          status: 'aberta',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          cartao_id: cartaoId,
          mes_referencia: '2024-02',
          data_fechamento: new Date('2024-02-15'),
          data_vencimento: new Date('2024-02-25'),
          valor_total: 2000,
          status: 'aberta',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const faturas = await service.listFaturas(cartaoId, { sortBy: 'data_vencimento', sortOrder: 'asc' });

      expect(faturas[0].mes_referencia).toBe('2024-01');
      expect(faturas[1].mes_referencia).toBe('2024-02');
      expect(faturas[2].mes_referencia).toBe('2024-03');
    });
  });
});
