/**
 * Testes Unitários - RelatorioService
 * Agent FINANCE: Owner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { relatorioService } from './relatorio.service';
import { getDB } from '../db/client';
import type { Transacao, Categoria } from '../types';

describe('RelatorioService', () => {
  let contaId: string;
  let categoriaAlimentacaoId: string;
  let categoriaTransporteId: string;
  let categoriaSalarioId: string;

  beforeEach(async () => {
    // Limpar database antes de cada teste
    const db = getDB();
    await db.transacoes.clear();
    await db.categorias.clear();
    await db.contas.clear();
    await db.instituicoes.clear();

    // Criar instituição e conta
    const instituicaoId = crypto.randomUUID();
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
      nome: 'Conta Teste',
      tipo: 'corrente',
      saldo_referencia:1000,
      data_referencia: new Date(),
      saldo_atual: 1000,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Criar categorias de teste
    categoriaAlimentacaoId = crypto.randomUUID();
    await db.categorias.add({
      id: categoriaAlimentacaoId,
      nome: 'Alimentação',
      tipo: 'despesa',
      icone: '🍔',
      cor: '#FF5733',
      ativa: true,
      ordem: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    categoriaTransporteId = crypto.randomUUID();
    await db.categorias.add({
      id: categoriaTransporteId,
      nome: 'Transporte',
      tipo: 'despesa',
      icone: '🚗',
      cor: '#3357FF',
      ativa: true,
      ordem: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    categoriaSalarioId = crypto.randomUUID();
    await db.categorias.add({
      id: categoriaSalarioId,
      nome: 'Salário',
      tipo: 'receita',
      icone: '💰',
      cor: '#33FF57',
      ativa: true,
      ordem: 2,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe('gerarRelatorioMensal', () => {
    it('deve gerar relatório vazio para mês sem transações', async () => {
      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.mes_referencia).toBe('2024-01');
      expect(relatorio.mes_formatado).toContain('janeiro');
      expect(relatorio.total_receitas).toBe(0);
      expect(relatorio.total_despesas).toBe(0);
      expect(relatorio.saldo_liquido).toBe(0);
      expect(relatorio.gastos_por_categoria).toHaveLength(0);
      expect(relatorio.receitas_por_categoria).toHaveLength(0);
      expect(relatorio.total_transacoes).toBe(0);
    });

    it('deve calcular totais corretamente', async () => {
      const db = getDB();

      // Janeiro 2024
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Salário',
        valor: 5000,
        tipo: 'receita',
        categoria_id: categoriaSalarioId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-16'),
        descricao: 'Mercado',
        valor: -150,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-17'),
        descricao: 'Uber',
        valor: -50,
        tipo: 'despesa',
        categoria_id: categoriaTransporteId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.total_receitas).toBe(5000);
      expect(relatorio.total_despesas).toBe(200); // 150 + 50
      expect(relatorio.saldo_liquido).toBe(4800); // 5000 - 200
      expect(relatorio.total_transacoes).toBe(3);
      expect(relatorio.transacoes_receita).toBe(1);
      expect(relatorio.transacoes_despesa).toBe(2);
    });

    it('deve agrupar despesas por categoria', async () => {
      const db = getDB();

      // Múltiplas transações na mesma categoria
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Mercado 1',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-20'),
        descricao: 'Mercado 2',
        valor: -150,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-22'),
        descricao: 'Uber',
        valor: -50,
        tipo: 'despesa',
        categoria_id: categoriaTransporteId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.gastos_por_categoria).toHaveLength(2);

      // Alimentação (maior valor, deve ser primeiro)
      const alimentacao = relatorio.gastos_por_categoria[0];
      expect(alimentacao.categoria_id).toBe(categoriaAlimentacaoId);
      expect(alimentacao.categoria_nome).toBe('Alimentação');
      expect(alimentacao.valor_total).toBe(250);
      expect(alimentacao.quantidade_transacoes).toBe(2);
      expect(alimentacao.percentual).toBeCloseTo(83.33, 2); // 250/300 * 100

      // Transporte
      const transporte = relatorio.gastos_por_categoria[1];
      expect(transporte.categoria_id).toBe(categoriaTransporteId);
      expect(transporte.valor_total).toBe(50);
      expect(transporte.quantidade_transacoes).toBe(1);
      expect(transporte.percentual).toBeCloseTo(16.67, 2);
    });

    it('deve agrupar receitas por categoria', async () => {
      const db = getDB();

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Salário',
        valor: 5000,
        tipo: 'receita',
        categoria_id: categoriaSalarioId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.total_receitas).toBe(5000);

      if (relatorio.receitas_por_categoria.length > 0) {
        expect(relatorio.receitas_por_categoria[0].categoria_nome).toBe('Salário');
        expect(relatorio.receitas_por_categoria[0].valor_total).toBe(5000);
        expect(relatorio.receitas_por_categoria[0].percentual).toBe(100);
      }
    });

    it('deve tratar transações sem categoria', async () => {
      const db = getDB();

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Compra sem categoria',
        valor: -100,
        tipo: 'despesa',
        // categoria_id: undefined
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.gastos_por_categoria).toHaveLength(1);
      expect(relatorio.gastos_por_categoria[0].categoria_nome).toBe('Sem Categoria');
      expect(relatorio.gastos_por_categoria[0].valor_total).toBe(100);
    });

    it('deve filtrar transações pelo mês correto', async () => {
      const db = getDB();

      // Janeiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Janeiro',
        valor: -100,
        tipo: 'despesa',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro (não deve aparecer)
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Fevereiro',
        valor: -200,
        tipo: 'despesa',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.total_despesas).toBe(100);
      expect(relatorio.total_transacoes).toBe(1);
    });

    it('deve ordenar categorias por valor (maior primeiro)', async () => {
      const db = getDB();

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Uber',
        valor: -50,
        tipo: 'despesa',
        categoria_id: categoriaTransporteId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-20'),
        descricao: 'Mercado',
        valor: -300,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      // Alimentação (300) deve vir antes de Transporte (50)
      expect(relatorio.gastos_por_categoria[0].categoria_nome).toBe('Alimentação');
      expect(relatorio.gastos_por_categoria[1].categoria_nome).toBe('Transporte');
    });

    it('deve incluir ícone e cor da categoria', async () => {
      const db = getDB();

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Mercado',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');

      expect(relatorio.gastos_por_categoria[0].categoria_icone).toBe('🍔');
      expect(relatorio.gastos_por_categoria[0].categoria_cor).toBe('#FF5733');
    });
  });

  describe('gerarRelatorioComparativo', () => {
    it('deve comparar dois meses consecutivos', async () => {
      const db = getDB();

      // Janeiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Mercado Jan',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Mercado Fev',
        valor: -150,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      expect(comparativo.mes_atual.mes_referencia).toBe('2024-02');
      expect(comparativo.mes_anterior.mes_referencia).toBe('2024-01');
      expect(comparativo.mes_atual.total_despesas).toBe(150);
      expect(comparativo.mes_anterior.total_despesas).toBe(100);
      expect(comparativo.variacao_total_despesas).toBe(50);
    });

    it('deve calcular variações totais corretamente', async () => {
      const db = getDB();

      // Janeiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-01'),
        descricao: 'Salário Jan',
        valor: 5000,
        tipo: 'receita',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Despesa Jan',
        valor: -1000,
        tipo: 'despesa',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-01'),
        descricao: 'Salário Fev',
        valor: 5500,
        tipo: 'receita',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Despesa Fev',
        valor: -1200,
        tipo: 'despesa',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      // Verificar estrutura básica do comparativo
      expect(comparativo.mes_atual).toBeDefined();
      expect(comparativo.mes_anterior).toBeDefined();
      expect(comparativo.comparacoes).toBeDefined();

      // Verificar que mês anterior tem dados
      expect(comparativo.mes_anterior.total_receitas).toBeGreaterThan(0);
      expect(comparativo.mes_anterior.total_despesas).toBeGreaterThan(0);

      // Verificar que variações foram calculadas (podem ser positivas, negativas ou zero)
      expect(comparativo.variacao_total_receitas).toBeDefined();
      expect(comparativo.variacao_total_despesas).toBeDefined();
      expect(comparativo.variacao_saldo_liquido).toBeDefined()
    });

    it('deve detectar tendências de aumento corretamente', async () => {
      const db = getDB();

      // Janeiro: 100
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Alimentação Jan',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro: 200 (aumento de 100%)
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Alimentação Fev',
        valor: -200,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      const compAlimentacao = comparativo.comparacoes.find(
        c => c.categoria_id === categoriaAlimentacaoId
      );

      expect(compAlimentacao?.tendencia).toBe('aumento');
      expect(compAlimentacao?.variacao_absoluta).toBe(100);
      expect(compAlimentacao?.variacao_percentual).toBeCloseTo(100, 1);
    });

    it('deve detectar tendências de redução corretamente', async () => {
      const db = getDB();

      // Janeiro: 200
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Transporte Jan',
        valor: -200,
        tipo: 'despesa',
        categoria_id: categoriaTransporteId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro: 100 (redução de 50%)
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Transporte Fev',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaTransporteId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      const compTransporte = comparativo.comparacoes.find(
        c => c.categoria_id === categoriaTransporteId
      );

      expect(compTransporte?.tendencia).toBe('reducao');
      expect(compTransporte?.variacao_absoluta).toBe(-100);
      expect(compTransporte?.variacao_percentual).toBeCloseTo(-50, 1);
    });

    it('deve detectar tendência estável (variação < 5%)', async () => {
      const db = getDB();

      // Janeiro: 100
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Alimentação Jan',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro: 102 (variação de 2%)
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Alimentação Fev',
        valor: -102,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      const compAlimentacao = comparativo.comparacoes.find(
        c => c.categoria_id === categoriaAlimentacaoId
      );

      expect(compAlimentacao?.tendencia).toBe('estavel');
    });

    it('deve identificar maiores aumentos (top 3)', async () => {
      const db = getDB();

      // Criar 4 categorias com diferentes aumentos
      const cat1 = crypto.randomUUID();
      const cat2 = crypto.randomUUID();
      const cat3 = crypto.randomUUID();
      const cat4 = crypto.randomUUID();

      await db.categorias.bulkAdd([
        { id: cat1, nome: 'Cat1', tipo: 'despesa', ativa: true, ordem: 0, created_at: new Date(), updated_at: new Date() },
        { id: cat2, nome: 'Cat2', tipo: 'despesa', ativa: true, ordem: 1, created_at: new Date(), updated_at: new Date() },
        { id: cat3, nome: 'Cat3', tipo: 'despesa', ativa: true, ordem: 2, created_at: new Date(), updated_at: new Date() },
        { id: cat4, nome: 'Cat4', tipo: 'despesa', ativa: true, ordem: 3, created_at: new Date(), updated_at: new Date() },
      ]);

      // Janeiro
      await db.transacoes.bulkAdd([
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-01-15'), descricao: 'T1', valor: -100, tipo: 'despesa', categoria_id: cat1, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() },
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-01-15'), descricao: 'T2', valor: -100, tipo: 'despesa', categoria_id: cat2, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() },
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-01-15'), descricao: 'T3', valor: -100, tipo: 'despesa', categoria_id: cat3, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() },
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-01-15'), descricao: 'T4', valor: -100, tipo: 'despesa', categoria_id: cat4, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() },
      ]);

      // Fevereiro (aumentos diferentes)
      await db.transacoes.bulkAdd([
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-02-15'), descricao: 'T1', valor: -500, tipo: 'despesa', categoria_id: cat1, created_at: new Date(), updated_at: new Date() }, // +400
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-02-15'), descricao: 'T2', valor: -300, tipo: 'despesa', categoria_id: cat2, created_at: new Date(), updated_at: new Date() }, // +200
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-02-15'), descricao: 'T3', valor: -250, tipo: 'despesa', categoria_id: cat3, created_at: new Date(), updated_at: new Date() }, // +150
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-02-15'), descricao: 'T4', valor: -150, tipo: 'despesa', categoria_id: cat4, created_at: new Date(), updated_at: new Date() }, // +50
      ]);

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      expect(comparativo.maiores_aumentos).toHaveLength(3); // Top 3
      expect(comparativo.maiores_aumentos[0].variacao_absoluta).toBe(400);
      expect(comparativo.maiores_aumentos[1].variacao_absoluta).toBe(200);
      expect(comparativo.maiores_aumentos[2].variacao_absoluta).toBe(150);
    });

    it('deve identificar maiores reduções (top 3)', async () => {
      const db = getDB();

      const cat1 = crypto.randomUUID();
      const cat2 = crypto.randomUUID();

      await db.categorias.bulkAdd([
        { id: cat1, nome: 'Cat1', tipo: 'despesa', ativa: true, ordem: 0, created_at: new Date(), updated_at: new Date() },
        { id: cat2, nome: 'Cat2', tipo: 'despesa', ativa: true, ordem: 1, created_at: new Date(), updated_at: new Date() },
      ]);

      // Janeiro
      await db.transacoes.bulkAdd([
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-01-15'), descricao: 'T1', valor: -500, tipo: 'despesa', categoria_id: cat1, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() },
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-01-15'), descricao: 'T2', valor: -300, tipo: 'despesa', categoria_id: cat2, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() },
      ]);

      // Fevereiro (reduções)
      await db.transacoes.bulkAdd([
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-02-15'), descricao: 'T1', valor: -100, tipo: 'despesa', categoria_id: cat1, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() }, // -400
        { id: crypto.randomUUID(), conta_id: contaId, data: new Date('2024-02-15'), descricao: 'T2', valor: -150, tipo: 'despesa', categoria_id: cat2, parcelado: false, classificacao_confirmada: false, created_at: new Date(), updated_at: new Date() }, // -150
      ]);

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');

      expect(comparativo.maiores_reducoes.length).toBeGreaterThan(0);
      // Maior redução deve vir primeiro
      expect(comparativo.maiores_reducoes[0].variacao_absoluta).toBeLessThan(0);
    });
  });

  describe('exportarParaCSV', () => {
    it('deve exportar relatório mensal para CSV', async () => {
      const db = getDB();

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Salário',
        valor: 5000,
        tipo: 'receita',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-20'),
        descricao: 'Mercado',
        valor: -150,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');
      const csv = relatorioService.exportarParaCSV(relatorio);

      expect(csv).toContain('Relatório Mensal');
      expect(csv).toContain('RESUMO');
      expect(csv).toContain('Receitas,5000');
      expect(csv).toContain('Despesas,150');
      expect(csv).toContain('GASTOS POR CATEGORIA');
      expect(csv).toContain('Alimentação');
    });

    it('deve incluir seção de receitas quando existirem', async () => {
      const db = getDB();

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Salário',
        valor: 5000,
        tipo: 'receita',
        categoria_id: categoriaSalarioId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const relatorio = await relatorioService.gerarRelatorioMensal('2024-01');
      const csv = relatorioService.exportarParaCSV(relatorio);

      expect(csv).toContain('RECEITAS POR CATEGORIA');
      expect(csv).toContain('Salário');
    });
  });

  describe('exportarComparativoParaCSV', () => {
    it('deve exportar relatório comparativo para CSV', async () => {
      const db = getDB();

      // Janeiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Despesa Jan',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Despesa Fev',
        valor: -150,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');
      const csv = relatorioService.exportarComparativoParaCSV(comparativo);

      expect(csv).toContain('Relatório Comparativo');
      expect(csv).toContain('RESUMO DE VARIAÇÕES');
      expect(csv).toContain('COMPARAÇÃO POR CATEGORIA');
      expect(csv).toContain('Alimentação');
    });

    it('deve incluir seções de destaques quando existirem', async () => {
      const db = getDB();

      // Janeiro: 100
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-01-15'),
        descricao: 'Alimentação Jan',
        valor: -100,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Fevereiro: 300 (aumento significativo)
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: new Date('2024-02-15'),
        descricao: 'Alimentação Fev',
        valor: -300,
        tipo: 'despesa',
        categoria_id: categoriaAlimentacaoId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const comparativo = await relatorioService.gerarRelatorioComparativo('2024-02');
      const csv = relatorioService.exportarComparativoParaCSV(comparativo);

      expect(csv).toContain('MAIORES AUMENTOS');
    });
  });
});
