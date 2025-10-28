import { ReactNode, memo } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardLayoutProps {
  children: ReactNode
}

export const DashboardLayout = memo(function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-graphite-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden pl-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
})
