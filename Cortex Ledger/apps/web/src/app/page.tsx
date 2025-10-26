import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AccountsOverview } from '@/components/dashboard/accounts-overview'
import { DFCChart } from '@/components/dashboard/dfc-chart'
import { BudgetVsActualChart } from '@/components/dashboard/budget-vs-actual-chart'

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Dashboard
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Visão geral das suas finanças
          </p>
        </div>

        {/* Saldo por conta */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Saldo por Conta
          </h2>
          <AccountsOverview />
        </section>

        {/* Gráficos */}
        <section className="grid gap-6 lg:grid-cols-2">
          <DFCChart />
          <BudgetVsActualChart />
        </section>
      </div>
    </DashboardLayout>
  )
}
