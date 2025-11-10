"use client"

import { useState, useEffect, useMemo } from "react"
import { useSetting } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, TrendingUp, TrendingDown, Sparkles, Clock, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { transacaoService } from "@/lib/services/transacao.service"
import { startOfMonth, endOfMonth, subMonths, differenceInDays, getDaysInMonth } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface BudgetData {
  categoria_id: string
  categoria_nome: string
  categoria_icone: string
  spent: number
  limit: number
  percentage: number
  color: string
  darkColor: string
  variacao_percentual?: number
  variacao_absoluta?: number
  previsao_fim_mes?: number
  ritmo_gasto?: number
  dias_restantes?: number
  dias_decorridos?: number
  tendencia?: 'acelerada' | 'normal' | 'controlada'
}

type ViewMode = 'valores_absolutos' | 'variacoes'

export function BudgetOverview() {
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('valores_absolutos')

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    let mounted = true

    const loadBudgetData = async () => {
      try {
        setLoading(true)

        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)

        if (viewMode === 'valores_absolutos') {
          // Modo: Maiores Valores Absolutos
          const gastos = await transacaoService.getGastosPorCategoria(monthStart, monthEnd)
          const top4 = gastos.slice(0, 4)

          // Calcular métricas de tempo
          const daysInMonth = getDaysInMonth(now)
          const diasDecorridos = now.getDate()
          const diasRestantes = daysInMonth - diasDecorridos

          const budgetData: BudgetData[] = top4.map(gasto => {
            const limit = Math.ceil(gasto.total_gasto * 1.2 / 100) * 100
            const percentage = limit > 0 ? Math.round((gasto.total_gasto / limit) * 100) : 0

            // Calcular previsões
            const ritmoGasto = diasDecorridos > 0 ? gasto.total_gasto / diasDecorridos : 0
            const previsaoFimMes = ritmoGasto * daysInMonth

            // Determinar tendência
            let tendencia: 'acelerada' | 'normal' | 'controlada' = 'normal'
            if (limit > 0) {
              const previsaoPercentual = (previsaoFimMes / limit) * 100
              if (previsaoPercentual > 110) {
                tendencia = 'acelerada'
              } else if (previsaoPercentual < 90) {
                tendencia = 'controlada'
              }
            }

            return {
              categoria_id: gasto.categoria_id,
              categoria_nome: gasto.categoria_nome,
              categoria_icone: gasto.categoria_icone,
              spent: gasto.total_gasto,
              limit: limit,
              percentage: percentage,
              color: gasto.categoria_cor,
              darkColor: gasto.categoria_cor,
              previsao_fim_mes: previsaoFimMes,
              ritmo_gasto: ritmoGasto,
              dias_restantes: diasRestantes,
              dias_decorridos: diasDecorridos,
              tendencia: tendencia,
            }
          })

          if (mounted) {
            setBudgets(budgetData)
          }
        } else {
          // Modo: Maiores Variações
          const mesAnterior = subMonths(now, 1)
          const prevMonthStart = startOfMonth(mesAnterior)
          const prevMonthEnd = endOfMonth(mesAnterior)

          const variacoes = await transacaoService.getVariacoesPorCategoria(
            monthStart,
            monthEnd,
            prevMonthStart,
            prevMonthEnd
          )

          const top4 = variacoes.slice(0, 4)

          // Calcular métricas de tempo
          const daysInMonth = getDaysInMonth(now)
          const diasDecorridos = now.getDate()
          const diasRestantes = daysInMonth - diasDecorridos

          const budgetData: BudgetData[] = top4.map(variacao => {
            // Para variações, usamos o gasto do mês anterior como "limite"
            const limit = variacao.total_gasto_anterior > 0
              ? variacao.total_gasto_anterior
              : variacao.total_gasto_atual * 1.2 // Se não havia gasto anterior, usa estimativa

            const percentage = limit > 0
              ? Math.round((variacao.total_gasto_atual / limit) * 100)
              : 0

            // Calcular previsões
            const ritmoGasto = diasDecorridos > 0 ? variacao.total_gasto_atual / diasDecorridos : 0
            const previsaoFimMes = ritmoGasto * daysInMonth

            // Determinar tendência
            let tendencia: 'acelerada' | 'normal' | 'controlada' = 'normal'
            if (limit > 0) {
              const previsaoPercentual = (previsaoFimMes / limit) * 100
              if (previsaoPercentual > 110) {
                tendencia = 'acelerada'
              } else if (previsaoPercentual < 90) {
                tendencia = 'controlada'
              }
            }

            return {
              categoria_id: variacao.categoria_id,
              categoria_nome: variacao.categoria_nome,
              categoria_icone: variacao.categoria_icone,
              spent: variacao.total_gasto_atual,
              limit: limit,
              percentage: percentage,
              color: variacao.categoria_cor,
              darkColor: variacao.categoria_cor,
              variacao_percentual: variacao.variacao_percentual,
              variacao_absoluta: variacao.variacao_absoluta,
              previsao_fim_mes: previsaoFimMes,
              ritmo_gasto: ritmoGasto,
              dias_restantes: diasRestantes,
              dias_decorridos: diasDecorridos,
              tendencia: tendencia,
            }
          })

          if (mounted) {
            setBudgets(budgetData)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados de orçamento:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadBudgetData()

    return () => {
      mounted = false
    }
  }, [viewMode])

  return (
    <Card className="p-6 shadow-md border-border overflow-hidden flex flex-col h-full bg-gradient-to-br from-card to-background" style={{
      minHeight: '520px'
    }}>
      <div className="mb-6 flex items-start justify-between gap-4 flex-shrink-0">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">Visão Geral do Orçamento</h3>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'valores_absolutos' ? 'Top 4 maiores gastos' : 'Top 4 maiores variações vs mês anterior'}
          </p>
        </div>
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <SelectTrigger className="w-[200px] h-9 text-xs font-medium bg-card border-border hover:bg-muted">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="valores_absolutos" className="text-sm font-medium cursor-pointer hover:bg-muted">
              Maiores Valores
            </SelectItem>
            <SelectItem value="variacoes" className="text-sm font-medium cursor-pointer hover:bg-muted">
              Maiores Variações
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-6 flex-1 flex flex-col justify-center">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!loading && budgets.length === 0 && (
        <div className="text-center py-8 flex-1 flex flex-col justify-center">
          <p className="text-muted-foreground">
            Nenhuma despesa registrada neste mês
          </p>
          <p className="text-xs mt-2 text-muted-foreground/60">
            Adicione transações para visualizar o orçamento
          </p>
        </div>
      )}

      {!loading && budgets.length > 0 && (
        <div className="space-y-6 flex-1 flex flex-col justify-center">
        {budgets.map((budget) => {
          const isNearLimit = budget.percentage >= 80
          const isOverLimit = budget.percentage >= 100
          const currentColor = isDark ? budget.darkColor : budget.color
          const remaining = budget.limit - budget.spent
          const isPositive = remaining > 0

          return (
            <div
              key={budget.categoria_id}
              className="group relative hover:scale-[1.01] transition-transform duration-200"
            >
              {/* Header com categoria e valores */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full shadow-lg ring-2 ring-offset-2 ring-offset-background flex items-center justify-center text-base"
                    style={{
                      backgroundColor: `${currentColor}20`,
                      borderColor: currentColor,
                      boxShadow: `0 0 8px ${currentColor}40`
                    }}
                  >
                    <span style={{ filter: 'grayscale(0%)' }}>{budget.categoria_icone}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{budget.categoria_nome}</span>
                      {isNearLimit && (
                        <AlertCircle
                          className={cn(
                            "h-4 w-4 animate-pulse",
                            isOverLimit ? "text-destructive" : "text-warning"
                          )}
                        />
                      )}
                      {viewMode === 'variacoes' && budget.variacao_percentual !== undefined && (
                        <span className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded",
                          budget.variacao_absoluta && budget.variacao_absoluta > 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : budget.variacao_absoluta && budget.variacao_absoluta < 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                          {budget.variacao_absoluta && budget.variacao_absoluta > 0 ? '↑' : budget.variacao_absoluta && budget.variacao_absoluta < 0 ? '↓' : '='} {Math.abs(budget.variacao_percentual).toFixed(0)}%
                        </span>
                      )}
                      {budget.tendencia && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 gap-1",
                            budget.tendencia === 'acelerada'
                              ? "border-red-500/50 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              : budget.tendencia === 'controlada'
                              ? "border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                              : "border-blue-500/50 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                          )}
                        >
                          {budget.tendencia === 'acelerada' && <TrendingUp className="w-3 h-3" />}
                          {budget.tendencia === 'controlada' && <TrendingDown className="w-3 h-3" />}
                          {budget.tendencia === 'normal' && <Target className="w-3 h-3" />}
                          {budget.tendencia === 'acelerada' ? 'Acelerada' : budget.tendencia === 'controlada' ? 'Controlada' : 'No ritmo'}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {viewMode === 'valores_absolutos'
                        ? `Limite: R$ ${budget.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `Mês anterior: R$ ${budget.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-base font-bold text-foreground">
                    R$ {budget.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-red-500" />
                    )}
                    <span className={cn(
                      "text-xs font-semibold",
                      isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {isPositive ? 'Disponível' : 'Excedido'} R$ {Math.abs(remaining).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de progresso com visual aprimorado */}
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress
                      value={Math.min(budget.percentage, 100)}
                      className="h-4 rounded-lg shadow-inner bg-muted/50"
                      indicatorColor={currentColor}
                      showGlow={isNearLimit}
                    />
                  </div>
                  <div
                    className={cn(
                      "min-w-[52px] text-right font-bold text-sm tabular-nums",
                      isOverLimit ? "text-red-600 dark:text-red-400" :
                      isNearLimit ? "text-orange-600 dark:text-orange-400" :
                      "text-foreground"
                    )}
                  >
                    {budget.percentage}%
                  </div>
                </div>

                {/* Indicador visual quando ultrapassa */}
                {isOverLimit && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-red-500/10 dark:bg-red-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-red-500/30">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        LIMITE EXCEDIDO
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de previsão e métricas */}
              {budget.previsao_fim_mes !== undefined && budget.ritmo_gasto !== undefined && budget.dias_restantes !== undefined && (
                <div className="mt-3 p-3 rounded-lg border bg-muted/40 border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-foreground">
                      Previsão de Fim de Mês
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium mb-1 text-muted-foreground">
                        Projeção
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        budget.previsao_fim_mes > budget.limit
                          ? "text-destructive"
                          : "text-success"
                      )}>
                        R$ {budget.previsao_fim_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Ritmo/dia
                        </span>
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        R$ {budget.ritmo_gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium mb-1 text-muted-foreground">
                        Dias restantes
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-foreground">
                          {budget.dias_restantes}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {budget.dias_decorridos! + budget.dias_restantes} dias
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Linha de alerta sutil abaixo */}
              {isNearLimit && !isOverLimit && (
                <div className="mt-2 flex items-center gap-2 text-xs text-warning">
                  <div className="h-1 flex-1 rounded-full bg-warning/20">
                    <div className="h-full w-1/2 rounded-full bg-warning animate-pulse" />
                  </div>
                  <span className="font-medium">Atenção ao limite</span>
                </div>
              )}
            </div>
          )
        })}
        </div>
      )}
    </Card>
  )
}

// ✅ Default export para dynamic import
export default BudgetOverview
