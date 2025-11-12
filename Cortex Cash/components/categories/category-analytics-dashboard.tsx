'use client';

/**
 * Dashboard de Análise por Categoria
 * Agent FINANCE: v0.2 - Classificação Manual
 *
 * Mostra estatísticas e gráficos de gastos por categoria
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { transacaoService } from '@/lib/services/transacao.service';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { MonthPicker } from '@/components/ui/month-picker';
import { CategoryTrendChart } from './category-trend-chart';
import type { Categoria } from '@/lib/types';

interface CategoryData {
  categoria_id: string;
  categoria_nome: string;
  categoria_icone: string;
  categoria_cor: string;
  total_gasto: number;
  quantidade_transacoes: number;
}

interface CategoryVariation {
  categoria_id: string;
  categoria_nome: string;
  categoria_icone: string;
  categoria_cor: string;
  total_gasto_atual: number;
  total_gasto_anterior: number;
  variacao_absoluta: number;
  variacao_percentual: number;
  quantidade_transacoes: number;
}

interface CategoryAnalyticsDashboardProps {
  selectedCategoriaId?: string;
  selectedCategoria?: Categoria;
  onCategorySelect?: (categoria: Categoria) => void;
  onClearSelection?: () => void;
}

export function CategoryAnalyticsDashboard({
  selectedCategoriaId,
  selectedCategoria,
  onCategorySelect,
  onClearSelection
}: CategoryAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<CategoryData[]>([]);
  const [variacoes, setVariacoes] = useState<CategoryVariation[]>([]);
  const [mesReferencia, setMesReferencia] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
  }, [mesReferencia]);

  const loadData = async () => {
    try {
      setLoading(true);

      const mesAtualInicio = startOfMonth(mesReferencia);
      const mesAtualFim = endOfMonth(mesReferencia);

      const mesAnterior = subMonths(mesReferencia, 1);
      const mesAnteriorInicio = startOfMonth(mesAnterior);
      const mesAnteriorFim = endOfMonth(mesAnterior);

      const [gastos, vars] = await Promise.all([
        transacaoService.getGastosPorCategoria(mesAtualInicio, mesAtualFim),
        transacaoService.getVariacoesPorCategoria(
          mesAtualInicio,
          mesAtualFim,
          mesAnteriorInicio,
          mesAnteriorFim
        ),
      ]);

      setGastosPorCategoria(gastos);
      setVariacoes(vars.slice(0, 5)); // Top 5 maiores variações
    } catch (error) {
      console.error('Erro ao carregar análise de categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMesAnterior = () => {
    setMesReferencia(prev => subMonths(prev, 1));
  };

  const handleProximoMes = () => {
    const proximoMes = new Date(mesReferencia);
    proximoMes.setMonth(proximoMes.getMonth() + 1);

    // Não permitir ir além do mês atual
    const hoje = new Date();
    if (proximoMes <= hoje) {
      setMesReferencia(proximoMes);
    }
  };

  const handleMesAtual = () => {
    setMesReferencia(new Date());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  // Preparar dados para o gráfico de pizza
  const pieChartData = gastosPorCategoria.slice(0, 8).map((cat, index) => ({
    name: cat.categoria_nome,
    value: cat.total_gasto,
    fill: COLORS[index % COLORS.length],
  }));

  // Preparar dados para o gráfico de barras (variações)
  const barChartData = variacoes.map((v) => ({
    name: v.categoria_nome,
    atual: v.total_gasto_atual,
    anterior: v.total_gasto_anterior,
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (gastosPorCategoria.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise por Categoria</CardTitle>
          <CardDescription>
            Nenhuma despesa classificada neste mês
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Se uma categoria foi selecionada, mostra apenas o gráfico de evolução
  if (selectedCategoriaId && selectedCategoria) {
    return (
      <div className="space-y-6">
        {/* Botão para voltar */}
        <Button
          variant="outline"
          onClick={onClearSelection}
          style={{
            borderColor: 'rgb(51, 65, 85)',
            color: 'white',
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para visão geral
        </Button>

        {/* Gráfico de evolução da categoria selecionada */}
        <CategoryTrendChart
          categoriaId={selectedCategoriaId}
          categoriaNome={selectedCategoria.nome}
          categoriaIcone={selectedCategoria.icone}
        />
      </div>
    );
  }

  const totalGastos = gastosPorCategoria.reduce((sum, cat) => sum + cat.total_gasto, 0);

  return (
    <div className="space-y-6">
      {/* Card de Resumo com Seletor de Período */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Gastos por Categoria
              </CardTitle>
              <CardDescription>
                Total: {formatCurrency(totalGastos)}
              </CardDescription>
            </div>

            {/* Controles de Período */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMesAnterior}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Mês anterior</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleMesAtual}
                className="min-w-[150px]"
              >
                {format(mesReferencia, 'MMMM yyyy', { locale: ptBR })}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleProximoMes}
                disabled={mesReferencia.getMonth() === new Date().getMonth() &&
                          mesReferencia.getFullYear() === new Date().getFullYear()}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Próximo mês</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Gastos</CardTitle>
            <CardDescription>
              Top 8 categorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(18, 50, 44, 0.99)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-md)',
                    color: 'hsl(var(--fg-primary))',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
                    padding: '14px',
                  }}
                  labelStyle={{ color: 'hsl(var(--fg-primary))', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lista de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking de Gastos</CardTitle>
            <CardDescription>
              Categorias ordenadas por valor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gastosPorCategoria.slice(0, 8).map((cat, index) => {
                const percentual = (cat.total_gasto / totalGastos) * 100;

                return (
                  <div
                    key={cat.categoria_id}
                    className="space-y-1 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      // Simula um objeto Categoria para passar para o CategoryTrendChart
                      const categoriaObj: Categoria = {
                        id: cat.categoria_id,
                        nome: cat.categoria_nome,
                        icone: cat.categoria_icone,
                        cor: cat.categoria_cor,
                        tipo: 'despesa',
                        ordem: 0,
                        ativa: true,
                        is_sistema: false,
                        created_at: new Date(),
                        updated_at: new Date(),
                      };
                      onCategorySelect?.(categoriaObj);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">#{index + 1}</span>
                        <span className="text-lg">{cat.categoria_icone}</span>
                        <span className="font-medium">{cat.categoria_nome}</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(cat.total_gasto)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${percentual}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-muted-foreground text-xs">{percentual.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-muted-foreground text-sm text-center mt-4">
                Clique em uma categoria para ver evolução mensal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Variações */}
      {variacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparação com Mês Anterior</CardTitle>
            <CardDescription>
              Top 5 maiores variações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Barra de Gráfico */}
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(18, 50, 44, 0.99)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '2px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-md)',
                      color: 'hsl(var(--fg-primary))',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
                      padding: '14px',
                    }}
                    labelStyle={{ color: 'hsl(var(--fg-primary))', fontWeight: 600 }}
                  />
                  <Legend />
                  <Bar dataKey="anterior" name="Mês Anterior" fill="#6B7280" />
                  <Bar dataKey="atual" name="Mês Atual" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>

              {/* Lista de Variações */}
              <div className="space-y-2">
                {variacoes.map((v) => {
                  const isIncrease = v.variacao_absoluta > 0;
                  const isDecrease = v.variacao_absoluta < 0;

                  return (
                    <div
                      key={v.categoria_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{v.categoria_icone}</span>
                        <div>
                          <p className="font-medium">{v.categoria_nome}</p>
                          <p className="text-muted-foreground text-sm">
                            {v.quantidade_transacoes} transações
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(v.total_gasto_atual)}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            anterior: {formatCurrency(v.total_gasto_anterior)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {isIncrease && <TrendingUp className="w-5 h-5 text-red-500" />}
                          {isDecrease && <TrendingDown className="w-5 h-5 text-green-500" />}
                          {!isIncrease && !isDecrease && <Minus className="w-5 h-5 text-gray-400" />}

                          <span
                            className={`font-semibold ${
                              isIncrease
                                ? 'text-red-500'
                                : isDecrease
                                ? 'text-green-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {isIncrease && '+'}
                            {v.variacao_percentual.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
