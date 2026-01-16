'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { categoriaService } from '@/lib/services/categoria.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TopExpense {
  id: string
  descricao: string
  valor: number
  categoria: string
  data: Date
  conta?: string
}

export function TopExpensesWidget() {
  const [expenses, setExpenses] = useState<TopExpense[]>([])
  const [loading, setLoading] = useState(true)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadTopExpenses()
  }, [])

  const loadTopExpenses = async () => {
    try {
      setLoading(true)

      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      // Filtra apenas despesas do mês atual
      const now = new Date()
      const currentMonth = format(now, 'yyyy-MM')

      const monthExpenses = transacoes
        .filter((t) => {
          const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
          const transactionMonth = format(transactionDate, 'yyyy-MM')
          return t.tipo === 'despesa' && transactionMonth === currentMonth
        })
        .map((t) => {
          const categoria = categorias.find((c) => c.id === t.categoria_id)
          const parentCategory = categoria?.pai_id
            ? categorias.find((c) => c.id === categoria.pai_id)
            : categoria

          return {
            id: t.id,
            descricao: t.descricao,
            valor: Math.abs(Number(t.valor) || 0),
            categoria: parentCategory?.nome || 'Sem categoria',
            data: t.data instanceof Date ? t.data : new Date(t.data),
            conta: t.conta_id,
          }
        })
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10)

      setExpenses(monthExpenses)
    } catch (error) {
      console.error('Erro ao carregar top despesas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  const totalExpenses = expenses.reduce((acc, e) => acc + e.valor, 0)

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Top 10 Maiores Despesas</h3>
        <p className="text-sm text-muted-foreground">Mês atual</p>
      </div>

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa este mês</p>
        ) : (
          expenses.map((expense, index) => {
            const percentage = (expense.valor / totalExpenses) * 100
            return (
              <div key={expense.id} className="flex items-center gap-3 pb-3 border-b last:border-0">
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-medium truncate">{expense.descricao}</p>
                      <p className="text-xs text-muted-foreground">{expense.categoria}</p>
                    </div>
                    <p className="text-sm font-semibold text-right flex-shrink-0">
                      {formatCurrency(expense.valor)}
                    </p>
                  </div>
                  <div className="mt-1 w-full h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(expense.data, 'dd MMM', { locale: ptBR })} • {percentage.toFixed(0)}%
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {expenses.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total do mês</span>
            <span className="text-lg font-semibold">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

export default TopExpensesWidget
