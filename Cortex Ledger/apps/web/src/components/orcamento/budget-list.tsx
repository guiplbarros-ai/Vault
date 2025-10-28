'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBudgets, useDeleteBudget } from '@/lib/hooks/use-budget-mutations'
import { useBudgetData } from '@/lib/hooks/use-budget-data'
import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash2, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Budget } from '@/lib/hooks/use-budget-mutations'

interface BudgetListProps {
  mesRef?: Date
  onEdit: (budget: Budget) => void
}

export function BudgetList({ mesRef, onEdit }: BudgetListProps) {
  const { data: budgets, isLoading, error } = useBudgets(mesRef)
  const { data: budgetData } = useBudgetData(mesRef)
  const deleteMutation = useDeleteBudget()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Mapear dados de realizado por categoria
  const realizadoMap = useMemo(() => {
    if (!budgetData) return new Map()
    return new Map(
      budgetData.map((item) => [item.categoria, { realizado: item.realizado, percentual: item.percentual }])
    )
  }, [budgetData])

  const handleDelete = async (id: string, categoriaNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o orçamento de "${categoriaNome}"?`)) {
      return
    }

    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting budget:', error)
      alert('Erro ao excluir orçamento')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-2 text-error-600">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Erro ao carregar orçamentos</span>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (!budgets || budgets.length === 0) {
    return (
      <Card>
        <CardBody className="p-6">
          <p className="text-center text-sm text-slate-600 dark:text-graphite-300">
            Nenhum orçamento configurado{mesRef ? ' para este mês' : ''}.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {budgets.map((budget) => {
        const categoriaNome = budget.categoria?.nome || 'Categoria não encontrada'
        const realizadoData = realizadoMap.get(categoriaNome)
        const realizado = realizadoData?.realizado || 0
        const percentual = realizadoData?.percentual || 0
        const disponivel = budget.valor_alvo - realizado

        return (
          <Card key={budget.id} className="hover:shadow-card-hover transition-shadow">
            <CardBody className="p-5">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-graphite-100">
                        {categoriaNome}
                      </h4>
                      {percentual > 100 && (
                        <Badge variant="error" className="text-xs">
                          Excedido
                        </Badge>
                      )}
                      {percentual > 80 && percentual <= 100 && (
                        <Badge variant="warning" className="text-xs">
                          Atenção
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-graphite-300 mt-0.5">
                      {budget.categoria?.grupo || ''} •{' '}
                      {format(new Date(budget.mes), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(budget)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleDelete(budget.id, budget.categoria?.nome || 'esta categoria')
                      }
                      disabled={deletingId === budget.id}
                      title="Excluir"
                      className="text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      {deletingId === budget.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-graphite-300">Orçado</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-graphite-100">
                      {formatCurrency(budget.valor_alvo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-graphite-300">Realizado</p>
                    <p
                      className={`text-lg font-semibold ${
                        percentual > 100
                          ? 'text-error-600'
                          : percentual > 80
                          ? 'text-warning'
                          : 'text-success'
                      }`}
                    >
                      {formatCurrency(realizado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-graphite-300">Disponível</p>
                    <p
                      className={`text-lg font-semibold ${
                        disponivel < 0
                          ? 'text-error-600'
                          : 'text-success'
                      }`}
                    >
                      {formatCurrency(disponivel)}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-graphite-300">Progresso</span>
                    <span
                      className={`font-semibold ${
                        percentual > 100
                          ? 'text-error-600'
                          : percentual > 80
                          ? 'text-warning'
                          : 'text-slate-900 dark:text-graphite-100'
                      }`}
                    >
                      {percentual.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-graphite-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentual > 100
                          ? 'bg-error-600'
                          : percentual > 80
                          ? 'bg-warning'
                          : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(percentual, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
