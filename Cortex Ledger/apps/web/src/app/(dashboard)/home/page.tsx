import { AccountsOverview } from '@/components/dashboard/accounts-overview'
import { DFCChart } from '@/components/dashboard/dfc-chart'
import { BudgetVsActualChart } from '@/components/dashboard/budget-vs-actual-chart'
import { TopExpensesCard } from '@/components/dashboard/top-expenses-card'
import { EvolutionChart } from '@/components/dashboard/evolution-chart'
import { UpcomingTransactionsCard } from '@/components/dashboard/upcoming-transactions-card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Dashboard</h1>
        <p className="text-muted">Visão geral das suas finanças</p>
      </div>

      {/* Saldo por Conta */}
      <AccountsOverview />

      {/* DFC e Orçamento */}
      <div className="grid gap-6 md:grid-cols-2">
        <DFCChart />
        <BudgetVsActualChart />
      </div>

      {/* Evolução M/M */}
      <EvolutionChart />

      {/* Próximos Lançamentos e Top 5 Despesas */}
      <div className="grid gap-6 md:grid-cols-2">
        <UpcomingTransactionsCard />
        <TopExpensesCard />
      </div>
    </div>
  )
}
