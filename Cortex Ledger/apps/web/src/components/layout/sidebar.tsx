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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/home', icon: LayoutDashboard },
  { name: 'Transações', href: '/transacoes', icon: Receipt },
  { name: 'Orçamento', href: '/orcamento', icon: PieChart },
  { name: 'Relatórios', href: '/relatorios', icon: TrendingUp },
  { name: 'Importar', href: '/importar', icon: Upload },
  { name: 'Categorias', href: '/categorias', icon: Tags },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-line/25 bg-surface">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-line/25 px-6">
          <h1 className="text-xl font-bold text-brand">Cortex Ledger</h1>
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
                  'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand text-brand-contrast'
                    : 'text-text hover:bg-elev'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-line/25 p-4">
          <div className="text-xs text-muted">
            <div className="font-medium">Cortex Ledger v1.0</div>
            <div className="mt-1">Local-first finance</div>
          </div>
        </div>
      </div>
    </aside>
  )
})
