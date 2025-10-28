'use client'

import { memo } from 'react'
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
  Wallet,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/home', icon: LayoutDashboard },
  { name: 'Transações', href: '/transacoes', icon: Receipt },
  { name: 'Contas', href: '/contas', icon: Wallet },
  { name: 'Cartões', href: '/cartoes', icon: CreditCard },
  { name: 'Orçamento', href: '/orcamento', icon: PieChart },
  { name: 'Relatórios', href: '/relatorios', icon: TrendingUp },
  { name: 'Importar', href: '/importar', icon: Upload },
  { name: 'Categorias', href: '/categorias', icon: Tags },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 dark:border-graphite-700 px-6">
          <img src="/icon-64x64.png" alt="Cortex Ledger" className="h-8 w-8 rounded-lg" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-graphite-100">Cortex Ledger</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            // Check if current path matches (handles both exact match and subpaths)
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-[color:var(--brand-contrast)]'
                    : 'text-slate-700 dark:text-graphite-200 hover:bg-slate-100 dark:hover:bg-graphite-700'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-graphite-700 p-4">
          <div className="text-xs text-slate-600 dark:text-graphite-300">
            <div className="font-medium">Cortex Ledger v1.0</div>
            <div className="mt-1">Local-first finance</div>
          </div>
        </div>
      </div>
    </aside>
  )
})
