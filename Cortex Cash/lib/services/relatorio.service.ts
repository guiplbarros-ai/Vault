/**
 * Serviço de Relatórios
 * Agent FINANCE: Owner
 *
 * Gera relatórios de gastos, receitas e comparações mensais
 */

import { getDB } from '../db/client';
import type { Transacao, Categoria } from '../types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface GastoPorCategoria {
  categoria_id: string;
  categoria_nome: string;
  categoria_icone?: string;
  categoria_cor?: string;
  valor_total: number;
  quantidade_transacoes: number;
  percentual: number; // % do total de gastos
}

export interface ComparacaoMensal {
  categoria_id: string;
  categoria_nome: string;
  mes_atual: number;
  mes_anterior: number;
  variacao_absoluta: number; // mes_atual - mes_anterior
  variacao_percentual: number; // ((mes_atual - mes_anterior) / mes_anterior) * 100
  tendencia: 'aumento' | 'reducao' | 'estavel';
}

export interface RelatorioMensal {
  mes_referencia: string; // 'YYYY-MM'
  mes_formatado: string; // 'Janeiro de 2025'

  // Totais
  total_receitas: number;
  total_despesas: number;
  total_transferencias: number;
  saldo_liquido: number; // receitas - despesas

  // Por categoria
  gastos_por_categoria: GastoPorCategoria[];
  receitas_por_categoria: GastoPorCategoria[];

  // Transações
  total_transacoes: number;
  transacoes_receita: number;
  transacoes_despesa: number;
}

export interface RelatorioComparativo {
  mes_atual: RelatorioMensal;
  mes_anterior: RelatorioMensal;
  comparacoes: ComparacaoMensal[];

  // Resumo de variações
  variacao_total_despesas: number;
  variacao_total_receitas: number;
  variacao_saldo_liquido: number;

  // Destaques
  maiores_aumentos: ComparacaoMensal[]; // Top 3
  maiores_reducoes: ComparacaoMensal[]; // Top 3
}

class RelatorioService {
  /**
   * Gera relatório de um mês específico
   */
  async gerarRelatorioMensal(
    mesReferencia: string // 'YYYY-MM'
  ): Promise<RelatorioMensal> {
    const db = getDB();

    // Parse data
    const [ano, mes] = mesReferencia.split('-').map(Number);
    const dataInicio = startOfMonth(new Date(ano, mes - 1));
    const dataFim = endOfMonth(new Date(ano, mes - 1));

    // Busca transações do mês
    const transacoes = await db.transacoes
      .where('data')
      .between(dataInicio, dataFim, true, true)
      .toArray();

    // Busca todas as categorias (para nomes)
    const categorias = await db.categorias.toArray();
    const categoriasMap = new Map(categorias.map(c => [c.id, c]));

    // Separa por tipo
    const receitas = transacoes.filter(t => t.tipo === 'receita');
    const despesas = transacoes.filter(t => t.tipo === 'despesa');
    const transferencias = transacoes.filter(t => t.tipo === 'transferencia');

    // Calcula totais
    const total_receitas = receitas.reduce((sum, t) => sum + Math.abs(t.valor), 0);
    const total_despesas = despesas.reduce((sum, t) => sum + Math.abs(t.valor), 0);
    const total_transferencias = transferencias.reduce((sum, t) => sum + Math.abs(t.valor), 0);
    const saldo_liquido = total_receitas - total_despesas;

    // Agrupa gastos por categoria
    const gastos_por_categoria = this.agruparPorCategoria(
      despesas,
      categoriasMap,
      total_despesas
    );

    // Agrupa receitas por categoria
    const receitas_por_categoria = this.agruparPorCategoria(
      receitas,
      categoriasMap,
      total_receitas
    );

    return {
      mes_referencia: mesReferencia,
      mes_formatado: format(dataInicio, "MMMM 'de' yyyy", { locale: ptBR }),
      total_receitas,
      total_despesas,
      total_transferencias,
      saldo_liquido,
      gastos_por_categoria,
      receitas_por_categoria,
      total_transacoes: transacoes.length,
      transacoes_receita: receitas.length,
      transacoes_despesa: despesas.length,
    };
  }

  /**
   * Gera relatório comparativo entre mês atual e anterior
   */
  async gerarRelatorioComparativo(
    mesReferencia: string // 'YYYY-MM'
  ): Promise<RelatorioComparativo> {
    // Gera relatório do mês atual
    const mes_atual = await this.gerarRelatorioMensal(mesReferencia);

    // Calcula mês anterior
    const [ano, mes] = mesReferencia.split('-').map(Number);
    const dataAtual = new Date(ano, mes - 1);
    const dataAnterior = subMonths(dataAtual, 1);
    const mesAnteriorRef = format(dataAnterior, 'yyyy-MM');

    // Gera relatório do mês anterior
    const mes_anterior = await this.gerarRelatorioMensal(mesAnteriorRef);

    // Calcula comparações por categoria
    const comparacoes = this.calcularComparacoes(
      mes_atual.gastos_por_categoria,
      mes_anterior.gastos_por_categoria
    );

    // Calcula variações totais
    const variacao_total_despesas = mes_atual.total_despesas - mes_anterior.total_despesas;
    const variacao_total_receitas = mes_atual.total_receitas - mes_anterior.total_receitas;
    const variacao_saldo_liquido = mes_atual.saldo_liquido - mes_anterior.saldo_liquido;

    // Destaques (top 3 aumentos e reduções)
    const comparacoesOrdenadas = [...comparacoes].sort(
      (a, b) => b.variacao_absoluta - a.variacao_absoluta
    );

    const maiores_aumentos = comparacoesOrdenadas
      .filter(c => c.tendencia === 'aumento')
      .slice(0, 3);

    const maiores_reducoes = comparacoesOrdenadas
      .filter(c => c.tendencia === 'reducao')
      .sort((a, b) => a.variacao_absoluta - b.variacao_absoluta)
      .slice(0, 3);

    return {
      mes_atual,
      mes_anterior,
      comparacoes,
      variacao_total_despesas,
      variacao_total_receitas,
      variacao_saldo_liquido,
      maiores_aumentos,
      maiores_reducoes,
    };
  }

  /**
   * Exporta relatório para CSV
   */
  exportarParaCSV(relatorio: RelatorioMensal): string {
    const linhas: string[] = [];

    // Header
    linhas.push(`Relatório Mensal - ${relatorio.mes_formatado}`);
    linhas.push('');

    // Resumo
    linhas.push('RESUMO');
    linhas.push('Tipo,Valor');
    linhas.push(`Receitas,${relatorio.total_receitas.toFixed(2)}`);
    linhas.push(`Despesas,${relatorio.total_despesas.toFixed(2)}`);
    linhas.push(`Saldo Líquido,${relatorio.saldo_liquido.toFixed(2)}`);
    linhas.push('');

    // Gastos por categoria
    linhas.push('GASTOS POR CATEGORIA');
    linhas.push('Categoria,Valor,Quantidade,Percentual');

    relatorio.gastos_por_categoria.forEach(gasto => {
      linhas.push(
        `${gasto.categoria_nome},${gasto.valor_total.toFixed(2)},${gasto.quantidade_transacoes},${gasto.percentual.toFixed(1)}%`
      );
    });

    linhas.push('');

    // Receitas por categoria
    if (relatorio.receitas_por_categoria.length > 0) {
      linhas.push('RECEITAS POR CATEGORIA');
      linhas.push('Categoria,Valor,Quantidade,Percentual');

      relatorio.receitas_por_categoria.forEach(receita => {
        linhas.push(
          `${receita.categoria_nome},${receita.valor_total.toFixed(2)},${receita.quantidade_transacoes},${receita.percentual.toFixed(1)}%`
        );
      });
    }

    return linhas.join('\n');
  }

  /**
   * Exporta relatório comparativo para CSV
   */
  exportarComparativoParaCSV(relatorio: RelatorioComparativo): string {
    const linhas: string[] = [];

    // Header
    linhas.push(`Relatório Comparativo`);
    linhas.push(`${relatorio.mes_anterior.mes_formatado} vs ${relatorio.mes_atual.mes_formatado}`);
    linhas.push('');

    // Resumo de variações
    linhas.push('RESUMO DE VARIAÇÕES');
    linhas.push('Tipo,Mês Anterior,Mês Atual,Variação Absoluta,Variação %');

    const varPercDespesas = relatorio.mes_anterior.total_despesas > 0
      ? ((relatorio.variacao_total_despesas / relatorio.mes_anterior.total_despesas) * 100).toFixed(1)
      : '0.0';

    const varPercReceitas = relatorio.mes_anterior.total_receitas > 0
      ? ((relatorio.variacao_total_receitas / relatorio.mes_anterior.total_receitas) * 100).toFixed(1)
      : '0.0';

    linhas.push(
      `Despesas,${relatorio.mes_anterior.total_despesas.toFixed(2)},${relatorio.mes_atual.total_despesas.toFixed(2)},${relatorio.variacao_total_despesas.toFixed(2)},${varPercDespesas}%`
    );

    linhas.push(
      `Receitas,${relatorio.mes_anterior.total_receitas.toFixed(2)},${relatorio.mes_atual.total_receitas.toFixed(2)},${relatorio.variacao_total_receitas.toFixed(2)},${varPercReceitas}%`
    );

    linhas.push(
      `Saldo Líquido,${relatorio.mes_anterior.saldo_liquido.toFixed(2)},${relatorio.mes_atual.saldo_liquido.toFixed(2)},${relatorio.variacao_saldo_liquido.toFixed(2)},-`
    );

    linhas.push('');

    // Comparações por categoria
    linhas.push('COMPARAÇÃO POR CATEGORIA');
    linhas.push('Categoria,Mês Anterior,Mês Atual,Variação Absoluta,Variação %,Tendência');

    relatorio.comparacoes.forEach(comp => {
      linhas.push(
        `${comp.categoria_nome},${comp.mes_anterior.toFixed(2)},${comp.mes_atual.toFixed(2)},${comp.variacao_absoluta.toFixed(2)},${comp.variacao_percentual.toFixed(1)}%,${comp.tendencia}`
      );
    });

    linhas.push('');

    // Destaques
    if (relatorio.maiores_aumentos.length > 0) {
      linhas.push('MAIORES AUMENTOS');
      linhas.push('Categoria,Variação Absoluta,Variação %');

      relatorio.maiores_aumentos.forEach(dest => {
        linhas.push(
          `${dest.categoria_nome},${dest.variacao_absoluta.toFixed(2)},${dest.variacao_percentual.toFixed(1)}%`
        );
      });

      linhas.push('');
    }

    if (relatorio.maiores_reducoes.length > 0) {
      linhas.push('MAIORES REDUÇÕES');
      linhas.push('Categoria,Variação Absoluta,Variação %');

      relatorio.maiores_reducoes.forEach(dest => {
        linhas.push(
          `${dest.categoria_nome},${dest.variacao_absoluta.toFixed(2)},${dest.variacao_percentual.toFixed(1)}%`
        );
      });
    }

    return linhas.join('\n');
  }

  /**
   * Helper: Agrupa transações por categoria
   */
  private agruparPorCategoria(
    transacoes: Transacao[],
    categoriasMap: Map<string, Categoria>,
    total: number
  ): GastoPorCategoria[] {
    // Agrupa por categoria_id
    const grupos = new Map<string, Transacao[]>();

    transacoes.forEach(t => {
      const catId = t.categoria_id || 'sem_categoria';
      if (!grupos.has(catId)) {
        grupos.set(catId, []);
      }
      grupos.get(catId)!.push(t);
    });

    // Calcula totais por categoria
    const resultado: GastoPorCategoria[] = [];

    grupos.forEach((transacoesCategoria, catId) => {
      const categoria = categoriasMap.get(catId);
      const valor_total = transacoesCategoria.reduce(
        (sum, t) => sum + Math.abs(t.valor),
        0
      );
      const percentual = total > 0 ? (valor_total / total) * 100 : 0;

      resultado.push({
        categoria_id: catId,
        categoria_nome: categoria?.nome || 'Sem Categoria',
        categoria_icone: categoria?.icone,
        categoria_cor: categoria?.cor,
        valor_total,
        quantidade_transacoes: transacoesCategoria.length,
        percentual,
      });
    });

    // Ordena por valor (maior primeiro)
    resultado.sort((a, b) => b.valor_total - a.valor_total);

    return resultado;
  }

  /**
   * Helper: Calcula comparações entre dois meses
   */
  private calcularComparacoes(
    gastosAtual: GastoPorCategoria[],
    gastosAnterior: GastoPorCategoria[]
  ): ComparacaoMensal[] {
    const comparacoes: ComparacaoMensal[] = [];

    // Cria map de gastos anteriores para lookup rápido
    const anteriorMap = new Map(
      gastosAnterior.map(g => [g.categoria_id, g.valor_total])
    );

    // Todas as categorias únicas (atual + anterior)
    const todasCategorias = new Set([
      ...gastosAtual.map(g => g.categoria_id),
      ...gastosAnterior.map(g => g.categoria_id),
    ]);

    todasCategorias.forEach(catId => {
      const gastoAtual = gastosAtual.find(g => g.categoria_id === catId);
      const valorAtual = gastoAtual?.valor_total || 0;
      const valorAnterior = anteriorMap.get(catId) || 0;

      const variacao_absoluta = valorAtual - valorAnterior;
      const variacao_percentual = valorAnterior > 0
        ? ((variacao_absoluta / valorAnterior) * 100)
        : (valorAtual > 0 ? 100 : 0);

      // Define tendência (tolerância de 5% para "estável")
      let tendencia: 'aumento' | 'reducao' | 'estavel';
      if (Math.abs(variacao_percentual) < 5) {
        tendencia = 'estavel';
      } else if (variacao_absoluta > 0) {
        tendencia = 'aumento';
      } else {
        tendencia = 'reducao';
      }

      comparacoes.push({
        categoria_id: catId,
        categoria_nome: gastoAtual?.categoria_nome || 'Sem Categoria',
        mes_atual: valorAtual,
        mes_anterior: valorAnterior,
        variacao_absoluta,
        variacao_percentual,
        tendencia,
      });
    });

    // Ordena por variação absoluta (maior primeiro)
    comparacoes.sort((a, b) => Math.abs(b.variacao_absoluta) - Math.abs(a.variacao_absoluta));

    return comparacoes;
  }
}

export const relatorioService = new RelatorioService();
