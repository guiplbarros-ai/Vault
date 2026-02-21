'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SavingData {
  period: string
  income: number
  expenses: number
  saving: number
  rate: number
}

export function SavingRateCard() {
  const [savingData, setSavingData] = useState<SavingData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSaving, setCurrentSaving] = useState<SavingData | null>(null)
  const [avgRate, setAvgRate] = useState(0)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadSavingData()
  }, [])

  const loadSavingData = async () => {
    try {
      setLoading(true)

      const transacoes = await transacaoService.listTransacoes()

      const data: SavingData[] = []
      const now = new Date()

      // Analisa últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR })

        // Filtra transações do período
        const periodTransactions = transacoes.filter((t) => {
          const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
          return transactionDate >= monthStart && transactionDate <= monthEnd
        })

        // Calcula receitas
        const income = periodTransactions
          .filter((t) => t.tipo === 'receita')
          .reduce((acc, t) => acc + (Number(t.valor) || 0), 0)

        // Calcula despesas
        const expenses = periodTransactions
          .filter((t) => t.tipo === 'despesa')
          .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)

        // Calcula economias
        const saving = income - expenses

        // Taxa de saving = (receitas - despesas) / receitas * 100
        const rate = income > 0 ? (saving / income) * 100 : 0

        data.push({
          period: monthLabel,
          income,
          expenses,
          saving,
          rate,
        })
      }

      // Define o mês atual como o último da lista
      const current = data[data.length - 1]
      setCurrentSaving(current ?? null)

      // Calcula taxa média
      const avgR = data.reduce((acc, d) => acc + d.rate, 0) / data.length
      setAvgRate(avgR)

      setSavingData(data)
    } catch (error) {
      console.error('Erro ao carregar taxa de saving:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  const getRateColor = (rate: number) => {
    if (rate >= 20) return 'text-green-500'
    if (rate >= 10) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Taxa de Economias</h3>
        <p className="text-sm text-muted-foreground">Análise dos últimos 6 meses</p>
      </div>

      {currentSaving && (
        <div className="space-y-6">
          {/* Período atual */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6 pb-6 border-b">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Período</p>
              <p className="text-lg font-semibold">{currentSaving.period}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Receitas</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(currentSaving.income)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Despesas</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(currentSaving.expenses)}
              </p>
            </div>
          </div>

          {/* Taxa atual */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Economias no período</p>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-4xl font-bold ${getRateColor(currentSaving.rate)}`}>
                {currentSaving.rate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                de {formatCurrency(currentSaving.income)}
              </p>
            </div>
            <p className="text-sm font-semibold mt-2 text-green-600">
              Você economizou: {formatCurrency(Math.max(currentSaving.saving, 0))}
            </p>
          </div>

          {/* Taxa média */}
          <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Taxa média: <span className="text-lg font-bold">{avgRate.toFixed(1)}%</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {avgRate >= 20
                  ? '✓ Excelente taxa de economias!'
                  : avgRate >= 10
                    ? '→ Boa taxa, há espaço para melhorar'
                    : '⚠ Considere reduzir despesas ou aumentar receitas'}
              </p>
            </div>
          </div>

          {/* Histórico */}
          <div className="mt-6">
            <p className="text-sm font-medium mb-3">Histórico dos últimos 6 meses</p>
            <div className="space-y-2">
              {savingData.map((data, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between pb-2 border-b last:border-0"
                >
                  <span className="text-xs text-muted-foreground">{data.period}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getRateColor(data.rate).replace('text', 'bg')}`}
                        style={{ width: `${Math.min(data.rate, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold w-12 text-right ${getRateColor(data.rate)}`}
                    >
                      {data.rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!currentSaving && savingData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes para calcular a taxa de poupança
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Importe transações de receita e despesa para ver a análise
          </p>
        </div>
      )}
    </Card>
  )
}

export default SavingRateCard
