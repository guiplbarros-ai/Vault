'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { HealthCheckStatus } from '@/components/health-check-status'
import { PageHeader } from '@/components/ui/page-header'

export default function SystemHealthPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="System Health"
          description="Monitor the health and status of critical system components"
        />

        <HealthCheckStatus />
      </div>
    </DashboardLayout>
  )
}
