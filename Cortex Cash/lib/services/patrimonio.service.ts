/**
 * Serviço de Patrimônio
 * Agent CORE: Implementador
 *
 * Fornece cálculos agregados de patrimônio total (contas + investimentos)
 */

import { getDB } from '../db/client';
import type {
  PatrimonioTotal,
  PatrimonioPorTipo,
  PatrimonioPorInstituicao,
  RentabilidadeHistorico,
  TipoInvestimento,
} from '../types';
import { contaService } from './conta.service';
import { investimentoService } from './investimento.service';

export class PatrimonioService {
  /**
   * Calcula o patrimônio total (contas + investimentos)
   */
  async getPatrimonioTotal(): Promise<PatrimonioTotal> {
    // Busca todas as contas ativas e soma seus saldos
    const contas = await contaService.listContas({ incluirInativas: false });
    const saldo_contas = contas.reduce((total, conta) => total + conta.saldo_atual, 0);
    
    const saldo_investimentos = await investimentoService.getValorTotalAtual();
    const patrimonio_total = saldo_contas + saldo_investimentos;

    // Calcular variação do mês (simplificado - pode ser melhorado com histórico)
    const valor_aplicado = await investimentoService.getValorTotalInvestido();
    const rentabilidade_investimentos =
      valor_aplicado > 0 ? ((saldo_investimentos - valor_aplicado) / valor_aplicado) * 100 : 0;

    // TODO: Implementar cálculo de variação mensal quando tivermos histórico
    const variacao_mes = 0;
    const variacao_mes_percentual = 0;

    return {
      saldo_contas,
      saldo_investimentos,
      patrimonio_total,
      variacao_mes,
      variacao_mes_percentual,
      rentabilidade_investimentos,
      ultima_atualizacao: new Date(),
    };
  }

  /**
   * Agrupa investimentos por tipo
   */
  async getPatrimonioPorTipo(): Promise<PatrimonioPorTipo[]> {
    const investimentos = await investimentoService.getInvestimentosAtivos();

    // Agrupar por tipo
    const grouped = new Map<TipoInvestimento, PatrimonioPorTipo>();

    for (const inv of investimentos) {
      if (!grouped.has(inv.tipo)) {
        grouped.set(inv.tipo, {
          tipo: inv.tipo,
          valor_aplicado: 0,
          valor_atual: 0,
          rentabilidade: 0,
          rentabilidade_percentual: 0,
          quantidade_ativos: 0,
          investimentos: [],
        });
      }

      const grupo = grouped.get(inv.tipo)!;
      grupo.valor_aplicado += inv.valor_aplicado;
      grupo.valor_atual += inv.valor_atual;
      grupo.quantidade_ativos += 1;
      grupo.investimentos.push(inv);
    }

    // Calcular rentabilidades
    const result: PatrimonioPorTipo[] = [];
    for (const grupo of grouped.values()) {
      grupo.rentabilidade = grupo.valor_atual - grupo.valor_aplicado;
      grupo.rentabilidade_percentual =
        grupo.valor_aplicado > 0 ? (grupo.rentabilidade / grupo.valor_aplicado) * 100 : 0;
      result.push(grupo);
    }

    // Ordenar por valor atual (maior primeiro)
    result.sort((a, b) => b.valor_atual - a.valor_atual);

    return result;
  }

  /**
   * Agrupa patrimônio por instituição (contas + investimentos)
   */
  async getPatrimonioPorInstituicao(): Promise<PatrimonioPorInstituicao[]> {
    const db = getDB();

    const contas = await contaService.listContas({ incluirInativas: false });
    const investimentos = await investimentoService.getInvestimentosAtivos();

    // Buscar todas as instituições únicas
    const instituicaoIds = new Set<string>();
    contas.forEach((c) => instituicaoIds.add(c.instituicao_id));
    investimentos.forEach((i) => instituicaoIds.add(i.instituicao_id));

    const result: PatrimonioPorInstituicao[] = [];
    let patrimonio_total = 0;

    for (const inst_id of instituicaoIds) {
      const instituicao = await db.instituicoes.get(inst_id);
      if (!instituicao) continue;

      const contas_instituicao = contas.filter((c) => c.instituicao_id === inst_id);
      const investimentos_instituicao = investimentos.filter((i) => i.instituicao_id === inst_id);

      const valor_contas = contas_instituicao.reduce((sum, c) => sum + c.saldo_atual, 0);
      const valor_investimentos = investimentos_instituicao.reduce((sum, i) => sum + i.valor_atual, 0);
      const valor_total = valor_contas + valor_investimentos;

      patrimonio_total += valor_total;

      result.push({
        instituicao,
        valor_contas,
        valor_investimentos,
        valor_total,
        percentual_patrimonio: 0, // Será calculado depois
        contas: contas_instituicao,
        investimentos: investimentos_instituicao,
      });
    }

    // Calcular percentuais
    for (const item of result) {
      item.percentual_patrimonio =
        patrimonio_total > 0 ? (item.valor_total / patrimonio_total) * 100 : 0;
    }

    // Ordenar por valor total (maior primeiro)
    result.sort((a, b) => b.valor_total - a.valor_total);

    return result;
  }

  /**
   * Retorna histórico de rentabilidade dos investimentos
   * (Por enquanto retorna apenas um snapshot atual, pode ser expandido com histórico real)
   */
  async getRentabilidadeHistorico(): Promise<RentabilidadeHistorico[]> {
    const investimentos = await investimentoService.getInvestimentosAtivos();

    // Por enquanto, retorna apenas um ponto com os dados atuais
    // No futuro, pode usar a tabela historico_investimentos para gerar série temporal
    const valor_aplicado = investimentos.reduce((sum, i) => sum + i.valor_aplicado, 0);
    const valor_atual = investimentos.reduce((sum, i) => sum + i.valor_atual, 0);
    const rentabilidade = valor_atual - valor_aplicado;
    const rentabilidade_percentual = valor_aplicado > 0 ? (rentabilidade / valor_aplicado) * 100 : 0;

    return [
      {
        data: new Date(),
        valor_aplicado,
        valor_atual,
        rentabilidade,
        rentabilidade_percentual,
      },
    ];
  }

  /**
   * Calcula diversificação do patrimônio
   */
  async getDiversificacao(): Promise<{
    por_tipo_conta: Array<{ tipo: string; valor: number; percentual: number }>;
    por_tipo_investimento: Array<{ tipo: string; valor: number; percentual: number }>;
    contas_vs_investimentos: {
      contas: number;
      investimentos: number;
      percentual_contas: number;
      percentual_investimentos: number;
    };
  }> {
    const contas = await contaService.listContas({ incluirInativas: false });
    const investimentos = await investimentoService.getInvestimentosAtivos();

    const saldo_total_contas = contas.reduce((sum, c) => sum + c.saldo_atual, 0);
    const saldo_total_investimentos = investimentos.reduce((sum, i) => sum + i.valor_atual, 0);
    const patrimonio_total = saldo_total_contas + saldo_total_investimentos;

    // Diversificação por tipo de conta
    const por_tipo_conta_map = new Map<string, number>();
    for (const conta of contas) {
      const current = por_tipo_conta_map.get(conta.tipo) || 0;
      por_tipo_conta_map.set(conta.tipo, current + conta.saldo_atual);
    }

    const por_tipo_conta = Array.from(por_tipo_conta_map.entries()).map(([tipo, valor]) => ({
      tipo,
      valor,
      percentual: patrimonio_total > 0 ? (valor / patrimonio_total) * 100 : 0,
    }));

    // Diversificação por tipo de investimento
    const por_tipo_investimento_map = new Map<string, number>();
    for (const inv of investimentos) {
      const current = por_tipo_investimento_map.get(inv.tipo) || 0;
      por_tipo_investimento_map.set(inv.tipo, current + inv.valor_atual);
    }

    const por_tipo_investimento = Array.from(por_tipo_investimento_map.entries()).map(
      ([tipo, valor]) => ({
        tipo,
        valor,
        percentual: patrimonio_total > 0 ? (valor / patrimonio_total) * 100 : 0,
      })
    );

    // Contas vs Investimentos
    const contas_vs_investimentos = {
      contas: saldo_total_contas,
      investimentos: saldo_total_investimentos,
      percentual_contas: patrimonio_total > 0 ? (saldo_total_contas / patrimonio_total) * 100 : 0,
      percentual_investimentos:
        patrimonio_total > 0 ? (saldo_total_investimentos / patrimonio_total) * 100 : 0,
    };

    return {
      por_tipo_conta,
      por_tipo_investimento,
      contas_vs_investimentos,
    };
  }

  /**
   * Retorna resumo do patrimônio para dashboard
   */
  async getResumoPatrimonio(): Promise<{
    patrimonio_total: number;
    contas: number;
    investimentos: number;
    rentabilidade_total: number;
    rentabilidade_percentual: number;
    maior_investimento: { nome: string; valor: number } | null;
    maior_conta: { nome: string; valor: number } | null;
  }> {
    const patrimonioTotal = await this.getPatrimonioTotal();
    const investimentos = await investimentoService.getInvestimentosAtivos();
    const contas = await contaService.listContas({ incluirInativas: false });

    // Maior investimento
    let maior_investimento = null;
    if (investimentos.length > 0) {
      const maior = investimentos.reduce((max, inv) =>
        inv.valor_atual > max.valor_atual ? inv : max
      );
      maior_investimento = { nome: maior.nome, valor: maior.valor_atual };
    }

    // Maior conta
    let maior_conta = null;
    if (contas.length > 0) {
      const maior = contas.reduce((max, conta) => (conta.saldo_atual > max.saldo_atual ? conta : max));
      maior_conta = { nome: maior.nome, valor: maior.saldo_atual };
    }

    const valor_aplicado = await investimentoService.getValorTotalInvestido();
    const rentabilidade_total = patrimonioTotal.saldo_investimentos - valor_aplicado;

    return {
      patrimonio_total: patrimonioTotal.patrimonio_total,
      contas: patrimonioTotal.saldo_contas,
      investimentos: patrimonioTotal.saldo_investimentos,
      rentabilidade_total,
      rentabilidade_percentual: patrimonioTotal.rentabilidade_investimentos,
      maior_investimento,
      maior_conta,
    };
  }
}

// Singleton instance
export const patrimonioService = new PatrimonioService();
