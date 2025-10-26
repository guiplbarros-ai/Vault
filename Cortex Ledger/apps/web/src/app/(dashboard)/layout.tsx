'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BudgetAlerts } from '@/components/orcamento/budget-alerts'

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
        {/* Sistema de Alertas de Orçamento */}
        <BudgetAlerts />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
