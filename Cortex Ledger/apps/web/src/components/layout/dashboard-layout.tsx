import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden pl-64">
        <Header />
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6 dark:bg-neutral-950">
          {children}
        </main>
      </div>
    </div>
  )
}
