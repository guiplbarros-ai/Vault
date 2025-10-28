import { DashboardLayout } from "@/components/dashboard-layout"
import { OverviewCards } from "@/components/overview-cards"
import { CashFlowChart } from "@/components/cash-flow-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { BudgetOverview } from "@/components/budget-overview"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>

        <OverviewCards />

        <div className="grid gap-6 lg:grid-cols-2">
          <CashFlowChart />
          <BudgetOverview />
        </div>

        <RecentTransactions />
      </div>
    </DashboardLayout>
  )
}
