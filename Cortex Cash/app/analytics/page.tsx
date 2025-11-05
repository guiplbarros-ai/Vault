"use client";

/**
 * Analytics Dashboard Page
 * Agent APP: Owner
 *
 * Dashboard consolidado de métricas de classificação automática e IA
 */

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  Award,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useSetting } from '@/app/providers/settings-provider';
import { getDB } from '@/lib/db/client';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    total_classifications: number;
    by_rules: number;
    by_ai: number;
    manual: number;
    accuracy_rate: number;
    total_cost_usd: number;
    avg_confidence: number;
  };
  timeline: Array<{
    month: string;
    rules: number;
    ai: number;
    manual: number;
    accuracy: number;
  }>;
  costs: Array<{
    month: string;
    cost: number;
    requests: number;
  }>;
  performance: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m');
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme');

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const db = getDB();

      // Calcula período
      const now = new Date();
      const monthsToSubtract = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
      const startDate = subMonths(now, monthsToSubtract);

      // Busca transações e logs de IA
      const transacoes = await db.transacoes
        .where('data')
        .between(startDate, now)
        .toArray();

      const aiLogs = await db.logs_ia
        .where('created_at')
        .between(startDate, now)
        .toArray();

      // Calcula overview
      const byRules = transacoes.filter(t => t.classificacao_origem === 'regra').length;
      const byAI = transacoes.filter(t => t.classificacao_origem === 'ia').length;
      const manual = transacoes.filter(t => t.classificacao_origem === 'manual').length;
      const total = transacoes.length;

      const confirmedAI = aiLogs.filter(log => log.confirmada).length;
      const accuracyRate = byAI > 0 ? (confirmedAI / byAI) * 100 : 0;

      const totalCost = aiLogs.reduce((sum, log) => sum + (log.custo_usd || 0), 0);
      const avgConfidence = byAI > 0
        ? transacoes
            .filter(t => t.classificacao_origem === 'ia' && t.classificacao_confianca)
            .reduce((sum, t) => sum + (t.classificacao_confianca || 0), 0) / byAI
        : 0;

      // Timeline por mês
      const timeline = [];
      for (let i = 0; i < monthsToSubtract; i++) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthLabel = format(monthStart, 'MMM/yy', { locale: ptBR });

        const monthTransactions = transacoes.filter(t => {
          const tDate = t.data instanceof Date ? t.data : new Date(t.data);
          return tDate >= monthStart && tDate <= monthEnd;
        });

        const monthRules = monthTransactions.filter(t => t.classificacao_origem === 'regra').length;
        const monthAI = monthTransactions.filter(t => t.classificacao_origem === 'ia').length;
        const monthManual = monthTransactions.filter(t => t.classificacao_origem === 'manual').length;

        const monthAILogs = aiLogs.filter(log => {
          const logDate = log.created_at instanceof Date ? log.created_at : new Date(log.created_at);
          return logDate >= monthStart && logDate <= monthEnd;
        });

        const monthConfirmed = monthAILogs.filter(log => log.confirmada).length;
        const monthAccuracy = monthAI > 0 ? (monthConfirmed / monthAI) * 100 : 0;

        timeline.unshift({
          month: monthLabel,
          rules: monthRules,
          ai: monthAI,
          manual: monthManual,
          accuracy: Math.round(monthAccuracy),
        });
      }

      // Custos por mês
      const costs = [];
      for (let i = 0; i < monthsToSubtract; i++) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthLabel = format(monthStart, 'MMM/yy', { locale: ptBR });

        const monthLogs = aiLogs.filter(log => {
          const logDate = log.created_at instanceof Date ? log.created_at : new Date(log.created_at);
          return logDate >= monthStart && logDate <= monthEnd;
        });

        const monthCost = monthLogs.reduce((sum, log) => sum + (log.custo_usd || 0), 0);

        costs.unshift({
          month: monthLabel,
          cost: monthCost,
          requests: monthLogs.length,
        });
      }

      // Performance (pie chart)
      const performance = [
        { name: 'Regras', value: byRules, color: '#3B82F6' },
        { name: 'IA', value: byAI, color: '#A855F7' },
        { name: 'Manual', value: manual, color: '#6B7280' },
      ];

      setData({
        overview: {
          total_classifications: total,
          by_rules: byRules,
          by_ai: byAI,
          manual,
          accuracy_rate: Math.round(accuracyRate),
          total_cost_usd: totalCost,
          avg_confidence: Math.round(avgConfidence),
        },
        timeline,
        costs,
        performance,
      });
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-white/60">Carregando analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-white/60">Erro ao carregar dados de analytics</p>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, timeline, costs, performance } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Brain className="w-8 h-8" style={{ color: '#18B0A4' }} />
              Analytics de IA
            </h1>
            <p className="text-white/70">
              Métricas consolidadas de classificação automática
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('3m')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                timeRange === '3m'
                  ? 'bg-[#18B0A4] text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              3 meses
            </button>
            <button
              onClick={() => setTimeRange('6m')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                timeRange === '6m'
                  ? 'bg-[#18B0A4] text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              6 meses
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                timeRange === '12m'
                  ? 'bg-[#18B0A4] text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              12 meses
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: '#18B0A4' }} />
                Total de Classificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#18B0A4' }}>
                {overview.total_classifications}
              </div>
              <p className="text-xs text-white/60 mt-1">
                {overview.by_rules + overview.by_ai} automáticas ({Math.round(((overview.by_rules + overview.by_ai) / overview.total_classifications) * 100)}%)
              </p>
            </CardContent>
          </Card>

          <Card
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-green-400" />
                Taxa de Acurácia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {overview.accuracy_rate}%
              </div>
              <p className="text-xs text-white/60 mt-1">
                Confiança média: {overview.avg_confidence}%
              </p>
            </CardContent>
          </Card>

          <Card
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                Custo Total (IA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">
                ${overview.total_cost_usd.toFixed(2)}
              </div>
              <p className="text-xs text-white/60 mt-1">
                {overview.by_ai} classificações com IA
              </p>
            </CardContent>
          </Card>

          <Card
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Economia (Regras)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {overview.by_rules}
              </div>
              <p className="text-xs text-white/60 mt-1">
                Classificações sem custo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="bg-white/10">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)'
                  : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              }}
            >
              <CardHeader>
                <CardTitle>Classificações ao Longo do Tempo</CardTitle>
                <CardDescription>
                  Distribuição de classificações por origem (últimos {timeRange === '3m' ? '3' : timeRange === '6m' ? '6' : '12'} meses)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="rules" name="Regras" fill="#3B82F6" stackId="a" />
                    <Bar dataKey="ai" name="IA" fill="#A855F7" stackId="a" />
                    <Bar dataKey="manual" name="Manual" fill="#6B7280" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)'
                  : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              }}
            >
              <CardHeader>
                <CardTitle>Taxa de Acurácia ao Longo do Tempo</CardTitle>
                <CardDescription>
                  Percentual de sugestões da IA aceitas pelo usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      name="Acurácia (%)"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="space-y-4">
            <Card
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)'
                  : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              }}
            >
              <CardHeader>
                <CardTitle>Custos de IA por Mês</CardTitle>
                <CardDescription>
                  Gastos em dólares (USD) com API da OpenAI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costs}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `$${value.toFixed(3)}`}
                    />
                    <Legend />
                    <Bar dataKey="cost" name="Custo (USD)" fill="#FBBF24" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                    : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {costs.reduce((sum, c) => sum + c.requests, 0)}
                  </div>
                  <p className="text-xs text-white/60 mt-1">Chamadas à API</p>
                </CardContent>
              </Card>

              <Card
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                    : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custo Médio/Requisição</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">
                    ${(overview.total_cost_usd / overview.by_ai).toFixed(4)}
                  </div>
                  <p className="text-xs text-white/60 mt-1">Por classificação</p>
                </CardContent>
              </Card>

              <Card
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
                    : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Economia com Regras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    ${((overview.by_rules * overview.total_cost_usd) / overview.by_ai).toFixed(2)}
                  </div>
                  <p className="text-xs text-white/60 mt-1">Custo evitado</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)'
                    : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                }}
              >
                <CardHeader>
                  <CardTitle>Distribuição por Origem</CardTitle>
                  <CardDescription>
                    Como as transações estão sendo classificadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={performance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {performance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)'
                    : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                }}
              >
                <CardHeader>
                  <CardTitle>Eficiência do Sistema</CardTitle>
                  <CardDescription>
                    Métricas de automação e performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Automação Total</span>
                      <span className="font-semibold text-white">
                        {Math.round(((overview.by_rules + overview.by_ai) / overview.total_classifications) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                          width: `${((overview.by_rules + overview.by_ai) / overview.total_classifications) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Classificações por Regras</span>
                      <span className="font-semibold text-blue-400">
                        {Math.round((overview.by_rules / overview.total_classifications) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${(overview.by_rules / overview.total_classifications) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Classificações por IA</span>
                      <span className="font-semibold text-purple-400">
                        {Math.round((overview.by_ai / overview.total_classifications) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{
                          width: `${(overview.by_ai / overview.total_classifications) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">ROI das Regras</span>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Alto
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">Acurácia da IA</span>
                      <Badge
                        className={cn(
                          overview.accuracy_rate >= 80
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        )}
                      >
                        {overview.accuracy_rate >= 80 ? 'Excelente' : 'Boa'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
