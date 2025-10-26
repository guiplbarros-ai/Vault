'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  Upload,
  PieChart,
  Tags,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transações', href: '/transacoes', icon: Receipt },
  { name: 'Orçamento', href: '/orcamento', icon: PieChart },
  { name: 'Relatórios', href: '/relatorios', icon: TrendingUp },
  { name: 'Importar', href: '/importar', icon: Upload },
  { name: 'Categorias', href: '/categorias', icon: Tags },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
          <h1 className="text-xl font-bold text-primary-500">Cortex Ledger</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400'
                    : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <div className="font-medium">Cortex Ledger v1.0</div>
            <div className="mt-1">Local-first finance</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
