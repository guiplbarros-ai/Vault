'use client';

/**
 * Gráfico de Evolução Mensal de Categoria
 * Mostra os últimos 12 meses de gastos de uma categoria ou subcategoria
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { transacaoService } from '@/lib/services/transacao.service';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CategoryTrendChartProps {
  categoriaId: string;
  categoriaNome: string;
  categoriaIcone?: string;
}

interface MonthlyData {
  mes: string;
  mesLabel: string;
  total: number;
}

export function CategoryTrendChart({ categoriaId, categoriaNome, categoriaIcone }: CategoryTrendChartProps) {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState({
    media: 0,
    maiorGasto: 0,
    menorGasto: 0,
    tendencia: 0, // Percentual de variação últimos 3 meses vs anteriores
  });

  useEffect(() => {
    loadMonthlyData();
  }, [categoriaId]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);

      // Buscar últimos 12 meses
      const hoje = new Date();
      const mesesData: MonthlyData[] = [];

      for (let i = 11; i >= 0; i--) {
        const mes = subMonths(hoje, i);
        const inicio = startOfMonth(mes);
        const fim = endOfMonth(mes);

        // Buscar transações do mês para a categoria
        const transacoes = await transacaoService.listTransacoes({
          dataInicio: inicio,
          dataFim: fim,
          categoriaId: categoriaId,
          tipo: 'despesa', // Analisando apenas despesas
        });

        const total = transacoes.reduce((sum, t) => sum + Math.abs(t.valor), 0);

        mesesData.push({
          mes: format(mes, 'yyyy-MM'),
          mesLabel: format(mes, 'MMM/yy', { locale: ptBR }),
          total,
        });
      }

      setMonthlyData(mesesData);

      // Calcular estatísticas
      const valores = mesesData.map((m) => m.total);
      const soma = valores.reduce((a, b) => a + b, 0);
      const media = soma / valores.length;
      const maiorGasto = Math.max(...valores);
      const menorGasto = Math.min(...valores);

      // Tendência: comparar últimos 3 meses com 3 anteriores
      const ultimos3 = valores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const anteriores3 = valores.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      const tendencia = anteriores3 > 0 ? ((ultimos3 - anteriores3) / anteriores3) * 100 : 0;

      setStats({
        media,
        maiorGasto,
        menorGasto,
        tendencia,
      });
    } catch (error) {
      console.error('Erro ao carregar evolução mensal:', error);
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

  const tendenciaIcon =
    stats.tendencia > 5 ? (
      <TrendingUp className="w-5 h-5 text-red-500" />
    ) : stats.tendencia < -5 ? (
      <TrendingDown className="w-5 h-5 text-green-500" />
    ) : (
      <Minus className="w-5 h-5 text-gray-400" />
    );

  const tendenciaColor =
    stats.tendencia > 5 ? 'text-red-500' : stats.tendencia < -5 ? 'text-green-500' : 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <Card
        style={{
          backgroundColor: 'rgb(15, 23, 42)',
          borderColor: 'rgb(30, 41, 59)',
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {categoriaIcone && <span className="text-3xl">{categoriaIcone}</span>}
              <div>
                <CardTitle className="text-white">{categoriaNome}</CardTitle>
                <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
                  Evolução dos últimos 12 meses
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {tendenciaIcon}
              <div className="text-right">
                <p className={`text-lg font-semibold ${tendenciaColor}`}>
                  {stats.tendencia > 0 && '+'}
                  {stats.tendencia.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">últimos 3 meses</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Gráfico de Evolução */}
      <Card
        style={{
          backgroundColor: 'rgb(15, 23, 42)',
          borderColor: 'rgb(30, 41, 59)',
        }}
      >
        <CardHeader>
          <CardTitle className="text-white text-lg">Evolução Mensal</CardTitle>
          <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>
            Total gasto por mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="mesLabel"
                tick={{ fill: '#9CA3AF' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Mês: ${label}`}
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
              <Legend wrapperStyle={{ color: 'white' }} />
              <Line
                type="monotone"
                dataKey="total"
                name="Gasto Total"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>Média Mensal</CardDescription>
            <CardTitle className="text-2xl text-white">
              {formatCurrency(stats.media)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>Maior Gasto</CardDescription>
            <CardTitle className="text-2xl text-red-400">
              {formatCurrency(stats.maiorGasto)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription style={{ color: 'rgb(148, 163, 184)' }}>Menor Gasto</CardDescription>
            <CardTitle className="text-2xl text-green-400">
              {formatCurrency(stats.menorGasto)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
