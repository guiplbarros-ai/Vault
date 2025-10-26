'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBudgets, useDeleteBudget } from '@/lib/hooks/use-budget-mutations'
import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Budget } from '@/lib/hooks/use-budget-mutations'

interface BudgetListProps {
  mesRef?: Date
  onEdit: (budget: Budget) => void
}

export function BudgetList({ mesRef, onEdit }: BudgetListProps) {
  const { data: budgets, isLoading, error } = useBudgets(mesRef)
  const deleteMutation = useDeleteBudget()
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
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
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
            Nenhum orçamento configurado{mesRef ? ' para este mês' : ''}.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {budgets.map((budget) => (
        <Card key={budget.id} className="hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-50">
                      {budget.categoria?.nome || 'Categoria não encontrada'}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {budget.categoria?.grupo || ''} •{' '}
                      {format(new Date(budget.mes_ref), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Planejado</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                      {formatCurrency(budget.valor_planejado)}
                    </p>
                  </div>

                  <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />

                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Alerta 80%
                    </p>
                    <p className="text-sm font-medium text-warning-600 dark:text-warning-400">
                      {formatCurrency(budget.valor_alerta_80)}
                    </p>
                  </div>

                  <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />

                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Alerta 100%
                    </p>
                    <p className="text-sm font-medium text-error-600 dark:text-error-400">
                      {formatCurrency(budget.valor_alerta_100)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(budget)}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(budget.id, budget.categoria?.nome || 'esta categoria')}
                  disabled={deletingId === budget.id}
                  title="Excluir"
                  className="text-error-600 hover:bg-error-50"
                >
                  {deletingId === budget.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
