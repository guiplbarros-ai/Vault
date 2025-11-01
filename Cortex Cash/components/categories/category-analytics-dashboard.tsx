'use client';

/**
 * Dashboard de Análise por Categoria
 * Agent FINANCE: v0.2 - Classificação Manual
 *
 * Mostra estatísticas e gráficos de gastos por categoria
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { transacaoService } from '@/lib/services/transacao.service';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export function CategoryAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<CategoryData[]>([]);
  const [variacoes, setVariacoes] = useState<CategoryVariation[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const mesAtualInicio = startOfMonth(now);
      const mesAtualFim = endOfMonth(now);

      const mesAnterior = subMonths(now, 1);
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
      <Card
        style={{
          backgroundColor: 'rgb(15, 23, 42)',
          borderColor: 'rgb(30, 41, 59)',
        }}
      >
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (gastosPorCategoria.length === 0) {
    return (
      <Card
        style={{
          backgroundColor: 'rgb(15, 23, 42)',
          borderColor: 'rgb(30, 41, 59)',
        }}
      >
        <CardHeader>
          <CardTitle className="text-white">Análise por Categoria</CardTitle>
          <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
            Nenhuma despesa classificada neste mês
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalGastos = gastosPorCategoria.reduce((sum, cat) => sum + cat.total_gasto, 0);

  return (
    <div className="space-y-6">
      {/* Card de Resumo */}
      <Card
        style={{
          backgroundColor: 'rgb(15, 23, 42)',
          borderColor: 'rgb(30, 41, 59)',
        }}
      >
        <CardHeader>
          <CardTitle className="text-white">
            Gastos por Categoria - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
            Total: {formatCurrency(totalGastos)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-white text-lg">Distribuição de Gastos</CardTitle>
            <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
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
                    backgroundColor: 'rgb(30, 41, 59)',
                    border: '1px solid rgb(51, 65, 85)',
                    borderRadius: '6px',
                    color: 'white',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lista de Categorias */}
        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-white text-lg">Ranking de Gastos</CardTitle>
            <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
              Categorias ordenadas por valor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gastosPorCategoria.slice(0, 8).map((cat, index) => {
                const percentual = (cat.total_gasto / totalGastos) * 100;

                return (
                  <div key={cat.categoria_id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">#{index + 1}</span>
                        <span className="text-lg">{cat.categoria_icone}</span>
                        <span className="text-white font-medium">{cat.categoria_nome}</span>
                      </div>
                      <span className="text-white font-semibold">
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
                      <span className="text-gray-400 text-xs">{percentual.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Variações */}
      {variacoes.length > 0 && (
        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader>
            <CardTitle className="text-white text-lg">Comparação com Mês Anterior</CardTitle>
            <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
              Top 5 maiores variações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Barra de Gráfico */}
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                  <YAxis tick={{ fill: '#9CA3AF' }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgb(30, 41, 59)',
                      border: '1px solid rgb(51, 65, 85)',
                      borderRadius: '6px',
                      color: 'white',
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'white' }} />
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
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        backgroundColor: 'rgb(30, 41, 59)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{v.categoria_icone}</span>
                        <div>
                          <p className="text-white font-medium">{v.categoria_nome}</p>
                          <p className="text-gray-400 text-sm">
                            {v.quantidade_transacoes} transações
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatCurrency(v.total_gasto_atual)}
                          </p>
                          <p className="text-gray-400 text-sm">
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
