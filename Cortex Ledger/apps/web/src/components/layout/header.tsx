'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Search, Bell, User, LogOut, Settings, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/lib/hooks/use-theme'

export const Header = memo(function Header() {
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-graphite-800/95">
      {/* Search */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-graphite-400" />
          <input
            type="text"
            placeholder="Buscar transações, categorias..."
            className="w-full h-10 px-3 pl-10 rounded-lg bg-slate-50 dark:bg-graphite-700 border border-slate-300 dark:border-graphite-600 text-slate-900 dark:text-graphite-100 placeholder:text-slate-500 dark:placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-xl"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error-600" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900 dark:text-graphite-100">
                  {user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-slate-600 dark:text-graphite-300">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes" className="cursor-pointer flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="cursor-pointer text-error-600 focus:text-error-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
})
