"use client"

import type React from "react"

import { useState } from "react"
import { useDB } from "@/app/providers/db-provider"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, CreditCard, Settings, Upload, Menu, X, FolderTree, Hash, TrendingUp, FileText, Target } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import { FinancialAlertsProvider } from "@/components/financial-alerts-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { GlobalErrorHandler } from "@/components/global-error-handler"
import { DemoModeBanner } from "@/components/demo/demo-mode-banner"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: ArrowLeftRight },
  { name: "Categorias", href: "/categories", icon: FolderTree },
  { name: "Tags", href: "/tags", icon: Hash },
  { name: "Contas", href: "/accounts", icon: Wallet },
  { name: "Cartões de Crédito", href: "/credit-cards", icon: CreditCard },
  { name: "Orçamentos", href: "/budgets", icon: PieChart },
  { name: "Planejamento", href: "/planejamento", icon: Target },
  { name: "Evolução Patrimonial", href: "/wealth", icon: TrendingUp },
  { name: "Imposto de Renda", href: "/tax", icon: FileText },
  { name: "Importar", href: "/import", icon: Upload },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { isInitialized, error } = useDB()

  // Mostra erro se houver
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">Erro ao inicializar o banco de dados</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <GlobalErrorHandler />
      <FinancialAlertsProvider enabled={isInitialized}>
        <DemoModeBanner />
        <div className="min-h-screen">
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-black/40 backdrop-blur-md border-r border-white/20 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-white/20 px-6">
            <img
              src="/logo.png"
              alt="Cortex Cash"
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-white leading-none">CORTEX</h1>
              <p className="text-xs text-white/70 leading-none mt-0.5">CASH</p>
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
                      ? "bg-white/15 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/20 p-4">
            <div className="rounded-lg bg-white/10 backdrop-blur-sm p-3">
              <p className="text-xs font-medium text-white">Uso de IA</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-white/70">R$ 2,34 / R$ 10,00</span>
                <span className="text-xs font-medium text-primary">23%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-[23%] bg-primary rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/20 bg-black/40 backdrop-blur-sm text-white px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <ThemeToggle />

          <Button variant="outline" size="sm" className="text-white border-white hover:bg-white/10">
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
          closeButton
        />
      </div>
      </FinancialAlertsProvider>
    </ErrorBoundary>
  )
}
