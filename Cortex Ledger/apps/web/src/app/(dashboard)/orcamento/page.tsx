'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BudgetForm } from '@/components/orcamento/budget-form'
import { BudgetList } from '@/components/orcamento/budget-list'
import { BudgetVsActualChart } from '@/components/dashboard/budget-vs-actual-chart'
import { Plus, Calendar } from 'lucide-react'
import { startOfMonth, addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Budget } from '@/lib/hooks/use-budget-mutations'
import { useBudgetAlerts } from '@/lib/hooks/use-budget-alerts'

export default function OrcamentoPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [mesRef, setMesRef] = useState(startOfMonth(new Date()))

  useBudgetAlerts()

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingBudget(null)
  }

  const handlePreviousMonth = () => {
    setMesRef((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setMesRef((prev) => addMonths(prev, 1))
  }

  const handleCurrentMonth = () => {
    setMesRef(startOfMonth(new Date()))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamento</h1>
          <p className="text-neutral-500 mt-1">
            Configure e acompanhe seu orçamento mensal por categoria
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
          ← Anterior
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-neutral-500" />
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {format(mesRef, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleNextMonth}>
          Próximo →
        </Button>
        <Button variant="outline" size="sm" onClick={handleCurrentMonth}>
          Hoje
        </Button>
      </div>

      {/* Chart - Orçado vs Realizado */}
      <BudgetVsActualChart />

      {/* Form */}
      {showForm && (
        <BudgetForm
          budget={editingBudget}
          onClose={handleCloseForm}
          mesRef={mesRef}
        />
      )}

      {/* Budget List */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Orçamentos Configurados
        </h2>
        <BudgetList mesRef={mesRef} onEdit={handleEdit} />
      </div>
    </div>
  )
}
