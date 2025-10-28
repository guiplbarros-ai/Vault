'use client'

import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import type { ReportSummary } from '@/lib/hooks/use-report-data'

interface ReportSummaryCardsProps {
  summary: ReportSummary
  isLoading?: boolean
}

export function ReportSummaryCards({ summary, isLoading }: ReportSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-6"
          >
            <div className="h-4 w-20 rounded bg-slate-100 dark:bg-graphite-700" />
            <div className="mt-2 h-8 w-32 rounded bg-slate-100 dark:bg-graphite-700" />
          </div>
        ))}
      </div>
    )
  }

  // Taxa de poupança: (Receitas - Despesas) / Receitas * 100
  const taxaPoupanca = summary.totalReceitas > 0
    ? ((summary.saldo / summary.totalReceitas) * 100)
    : 0

  const cards = [
    {
      title: 'Total Receitas',
      value: summary.totalReceitas,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-slate-100 dark:bg-graphite-700',
      format: 'currency',
    },
    {
      title: 'Total Despesas',
      value: summary.totalDespesas,
      icon: TrendingDown,
      color: 'text-error-600',
      bgColor: 'bg-slate-100 dark:bg-graphite-700',
      format: 'currency',
    },
    {
      title: 'Saldo',
      value: summary.saldo,
      icon: DollarSign,
      color: summary.saldo >= 0 ? 'text-success' : 'text-error-600',
      bgColor: 'bg-slate-100 dark:bg-graphite-700',
      format: 'currency',
    },
    {
      title: 'Taxa de Poupança',
      value: taxaPoupanca,
      icon: Percent,
      color: taxaPoupanca >= 20 ? 'text-success' : taxaPoupanca >= 10 ? 'text-warning' : 'text-error-600',
      bgColor: 'bg-slate-100 dark:bg-graphite-700',
      format: 'percent',
    },
  ] as const

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-graphite-300">
                {card.title}
              </p>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>
                {card.format === 'currency'
                  ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(card.value)
                  : `${card.value.toFixed(1)}%`}
              </p>
            </div>
            <div className={`rounded-full p-3 ${card.bgColor}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
