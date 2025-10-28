"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useDatabase } from "@/hooks/use-database"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, CreditCard, Settings, Upload, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"

const navigation = [
  { name: "Painel", href: "/", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: ArrowLeftRight },
  { name: "Contas", href: "/accounts", icon: Wallet },
  { name: "Orçamentos", href: "/budgets", icon: PieChart },
  { name: "Cartões de Crédito", href: "/credit-cards", icon: CreditCard },
  { name: "Importar", href: "/import", icon: Upload },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { isInitialized, isLoading, error } = useDatabase()

  // Mostra loading enquanto inicializa o banco
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicializando sistema...</p>
        </div>
      </div>
    )
  }

  // Mostra erro se houver
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">Erro ao inicializar o banco de dados</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <img
              src="/logo.png"
              alt="Cortex Cash"
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-primary leading-none">CORTEX</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">CASH</p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-foreground">Uso de IA</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">R$ 2,34 / R$ 10,00</span>
                <span className="text-xs font-medium text-accent">23%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div className="h-full w-[23%] bg-accent rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <Button variant="outline" size="sm">
            Sincronizar
          </Button>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </div>
  )
}
