'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { PerformanceDashboard } from '@/components/performance-dashboard';

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
  );
}
