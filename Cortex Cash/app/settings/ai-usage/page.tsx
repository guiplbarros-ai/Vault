"use client";

/**
 * AI Usage & Audit Page
 * Agent APP: Owner
 *
 * Página de auditoria de uso e custos de IA
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { getDB } from '@/lib/db/client';
import type { LogIA } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_brl: number;
  confirmed_suggestions: number;
  rejected_suggestions: number;
  average_confidence: number;
}

interface DailyUsage {
  date: string;
  requests: number;
  cost_brl: number;
  tokens: number;
}

export default function AIUsagePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [logs, setLogs] = useState<LogIA[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [cacheStats, setCacheStats] = useState<{
    size: number;
    max_size: number;
  } | null>(null);

  // Carrega dados
  const loadData = async () => {
    try {
      setLoading(true);
      const db = getDB();

      // Busca todos os logs do mês atual
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const allLogs = await db.logs_ia.toArray();
      const monthLogs = allLogs.filter(log => {
        const logDate = log.created_at instanceof Date ? log.created_at : new Date(log.created_at);
        return logDate >= startOfMonth;
      });

      // Calcula stats
      const USD_TO_BRL = 6.0; // TODO: pegar taxa atual
      const total_tokens = monthLogs.reduce((sum, log) => sum + log.tokens_total, 0);
      const total_cost_usd = monthLogs.reduce((sum, log) => sum + log.custo_usd, 0);
      const suggestions = monthLogs.filter(log => log.categoria_sugerida_id);
      const confirmed = suggestions.filter(log => log.confirmada).length;
      const rejected = suggestions.length - confirmed;
      const confidences = monthLogs
        .filter(log => log.confianca !== null && log.confianca !== undefined)
        .map(log => log.confianca!);
      const avg_confidence = confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 0;

      setStats({
        total_requests: monthLogs.length,
        total_tokens,
        total_cost_usd,
        total_cost_brl: total_cost_usd * USD_TO_BRL,
        confirmed_suggestions: confirmed,
        rejected_suggestions: rejected,
        average_confidence: avg_confidence,
      });

      // Agrupa por dia
      const dailyMap = new Map<string, { requests: number; cost_brl: number; tokens: number }>();
      monthLogs.forEach(log => {
        const date = log.created_at instanceof Date ? log.created_at : new Date(log.created_at);
        const dateKey = format(date, 'yyyy-MM-dd');
        const existing = dailyMap.get(dateKey) || { requests: 0, cost_brl: 0, tokens: 0 };
        dailyMap.set(dateKey, {
          requests: existing.requests + 1,
          cost_brl: existing.cost_brl + (log.custo_usd * USD_TO_BRL),
          tokens: existing.tokens + log.tokens_total,
        });
      });

      const daily = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyUsage(daily);
      setLogs(monthLogs.slice(0, 50)); // Últimas 50

      // Cache stats (mock, pois cache é server-side)
      setCacheStats({
        size: 0, // TODO: endpoint para cache stats
        max_size: 1000,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de uso de IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Uso de IA e Custos</h1>
            <p className="text-white/70">
              Auditoria de uso e gastos com OpenAI (mês atual)
            </p>
          </div>

          <Button
            onClick={loadData}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <div className="text-white/60 text-sm font-medium">Requisições</div>
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_requests}</div>
              <div className="text-xs text-white/40 mt-1">
                {stats.total_tokens.toLocaleString()} tokens
              </div>
            </div>

            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <div className="text-white/60 text-sm font-medium">Custo Total</div>
              </div>
              <div className="text-2xl font-bold text-green-400">
                R$ {stats.total_cost_brl.toFixed(2)}
              </div>
              <div className="text-xs text-white/40 mt-1">
                ${stats.total_cost_usd.toFixed(4)} USD
              </div>
            </div>

            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="text-white/60 text-sm font-medium">Taxa de Aceitação</div>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.confirmed_suggestions + stats.rejected_suggestions > 0
                  ? ((stats.confirmed_suggestions / (stats.confirmed_suggestions + stats.rejected_suggestions)) * 100).toFixed(0)
                  : 0}%
              </div>
              <div className="text-xs text-white/40 mt-1">
                {stats.confirmed_suggestions} confirmadas / {stats.rejected_suggestions} rejeitadas
              </div>
            </div>

            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" style={{ color: '#18B0A4' }} />
                <div className="text-white/60 text-sm font-medium">Confiança Média</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: '#18B0A4' }}>
                {(stats.average_confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-white/40 mt-1">
                {stats.average_confidence >= 0.8 ? 'Excelente' : stats.average_confidence >= 0.6 ? 'Boa' : 'Regular'}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {dailyUsage.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requisições por Dia */}
            <div
              className="p-6 rounded-xl border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Requisições por Dia</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1a252f',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                    labelFormatter={(value) =>
                      format(new Date(value as string), "dd 'de' MMMM", { locale: ptBR })
                    }
                  />
                  <Line type="monotone" dataKey="requests" stroke="#18B0A4" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Custos por Dia */}
            <div
              className="p-6 rounded-xl border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Custos por Dia (BRL)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1a252f',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                    labelFormatter={(value) =>
                      format(new Date(value as string), "dd 'de' MMMM", { locale: ptBR })
                    }
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  />
                  <Bar dataKey="cost_brl" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Logs */}
        <div
          className="rounded-xl border border-white/20 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
          }}
        >
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Logs Recentes (últimos 50)</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-white/60">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <Brain className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">Nenhum uso de IA registrado este mês</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#1a252f] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Custo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Confiança
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => {
                    const logDate = log.created_at instanceof Date ? log.created_at : new Date(log.created_at);
                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-sm text-white/80">
                          {format(logDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.modelo}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/60">
                          {log.tokens_total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">
                          R$ {(log.custo_usd * 6.0).toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.confianca !== null && log.confianca !== undefined ? (
                            <Badge
                              className={cn(
                                log.confianca >= 0.8
                                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                  : log.confianca >= 0.5
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              )}
                            >
                              {(log.confianca * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.confirmada ? (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Confirmada
                            </Badge>
                          ) : log.categoria_sugerida_id ? (
                            <Badge variant="outline" className="border-white/30 text-white/50">
                              Pendente
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1">
                              <XCircle className="w-3 h-3" />
                              Sem sugestão
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
