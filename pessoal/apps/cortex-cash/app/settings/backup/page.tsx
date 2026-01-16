'use client'

import { BackupManager } from '@/components/backup-manager'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'

export default function BackupPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Backup & Restore"
          description="Export, import, and manage your financial data backups"
        />

        <BackupManager />
      </div>
    </DashboardLayout>
  )
}
