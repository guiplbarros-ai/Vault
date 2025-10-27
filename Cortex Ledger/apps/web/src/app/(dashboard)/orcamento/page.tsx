'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { BudgetForm } from '@/components/orcamento/budget-form'
import { BudgetList } from '@/components/orcamento/budget-list'
import { BudgetOverview } from '@/components/orcamento/budget-overview'
import { BudgetAlerts } from '@/components/orcamento/budget-alerts'
import { BudgetVsActualChart } from '@/components/dashboard/budget-vs-actual-chart'
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Orçamento</h1>
          <p className="text-muted mt-1">Configure e acompanhe seu orçamento mensal por categoria</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-3 p-4 bg-surface rounded-2xl border border-line/25">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousMonth}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <Calendar className="h-4 w-4 text-muted" />
          <span className="text-sm font-semibold text-text capitalize">
            {format(mesRef, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="gap-1"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="hidden sm:block w-px h-6 bg-line/25" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentMonth}
          className="hidden sm:flex"
        >
          Mês Atual
        </Button>
      </div>

      {/* Budget Overview Cards */}
      <BudgetOverview mesRef={mesRef} />

      {/* Chart - Orçado vs Realizado */}
      <BudgetVsActualChart />

      {/* Budget List */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-text">
          Orçamentos Detalhados
        </h2>
        <BudgetList mesRef={mesRef} onEdit={handleEdit} />
      </div>

      {/* Budget Alerts (floating) */}
      <BudgetAlerts />

      {/* Modal - Budget Form */}
      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
        size="md"
      >
        <BudgetForm budget={editingBudget} onClose={handleCloseForm} mesRef={mesRef} />
      </Modal>
    </div>
  )
}
