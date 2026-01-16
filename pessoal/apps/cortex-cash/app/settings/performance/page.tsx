'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { PerformanceDashboard } from '@/components/performance-dashboard'
import { PageHeader } from '@/components/ui/page-header'

export default function PerformancePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Performance Monitoring"
          description="Monitor application performance and identify bottlenecks"
        />

        <PerformanceDashboard />
      </div>
    </DashboardLayout>
  )
}
