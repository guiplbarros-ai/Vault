"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useDB } from "@/app/providers/db-provider"
import { useAuth } from "@/app/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, CreditCard, Settings, Menu, X, FolderTree, Hash, TrendingUp, FileText, Target, BarChart, Wrench, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"
import { ProfileMenu } from "@/components/profile-menu"
import { AuthGuard } from "@/components/auth-guard"
import { FinancialAlertsProvider } from "@/components/financial-alerts-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { GlobalErrorHandler } from "@/components/global-error-handler"
import { DemoModeBanner } from "@/components/demo/demo-mode-banner"
import { getAIUsageSummary, checkAIBudgetLimit } from "@/lib/services/ai-usage.service"
import { USD_TO_BRL } from "@/lib/config/currency"

const navigationBase = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: ArrowLeftRight },
  { name: "Cartões de Crédito", href: "/credit-cards", icon: CreditCard },
  { name: "Contas", href: "/accounts", icon: Wallet },
  { name: "Categorias", href: "/categories", icon: FolderTree },
  { name: "Tags", href: "/tags", icon: Hash },
  { name: "Orçamentos", href: "/budgets", icon: PieChart },
  { name: "Planejamento", href: "/planejamento", icon: Target },
  { name: "Evolução Patrimonial", href: "/wealth", icon: TrendingUp },
  { name: "Imposto de Renda", href: "/tax", icon: FileText },
  { name: "Relatórios", href: "/reports", icon: BarChart },
  { name: "Configurações", href: "/settings", icon: Settings },
]

const adminNavigation = [
  { name: "Configurações Admin", href: "/admin-settings", icon: ShieldCheck, adminOnly: true },
  { name: "Dev Tools", href: "/dev-tools", icon: Wrench, adminOnly: true },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { isInitialized, error } = useDB()
  const { isAdmin } = useAuth()
  const [aiLoading, setAiLoading] = useState(true)
  const [aiUsage, setAiUsage] = useState<{
    usedBrl: number
    limitBrl: number
    percentage: number
  } | null>(null)

  // Get AI settings from localStorage
  function getAISettings() {
    if (typeof window === "undefined") return null
    try {
      const settings = localStorage.getItem("cortex_settings")
      if (!settings) return null
      const parsed = JSON.parse(settings)
      return parsed.aiCosts || null
    } catch {
      return null
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchAIUsage() {
      if (!isInitialized) {
        setAiLoading(false)
        return
      }
      setAiLoading(true)
      try {
        const aiSettings = getAISettings()
        const limitUsd = aiSettings?.monthlyCostLimit ?? 10.0
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const summary = await getAIUsageSummary(start, end, USD_TO_BRL)
        const budget = await checkAIBudgetLimit(now, limitUsd, 0.8, USD_TO_BRL)
        if (!cancelled) {
          setAiUsage({
            usedBrl: summary.total_cost_brl,
            limitBrl: limitUsd * USD_TO_BRL,
            percentage: budget.percentageUsed,
          })
        }
      } catch {
        if (!cancelled) {
          const aiSettings = getAISettings()
          const limitUsd = aiSettings?.monthlyCostLimit ?? 10.0
          setAiUsage({
            usedBrl: 0,
            limitBrl: limitUsd * USD_TO_BRL,
            percentage: 0,
          })
        }
      } finally {
        if (!cancelled) setAiLoading(false)
      }
    }
    fetchAIUsage()
    return () => {
      cancelled = true
    }
  }, [isInitialized])

  // Mostra erro se houver
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">Erro ao inicializar o banco de dados</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <ErrorBoundary>
        <GlobalErrorHandler />
        <FinancialAlertsProvider enabled={isInitialized}>
          <DemoModeBanner />
          <div className="min-h-screen bg-background text-foreground">
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
          "glass-sidebar fixed inset-y-0 left-0 z-50 w-64 text-foreground transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
            <img
              src="/logo.png"
              alt="Cortex Cash"
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold leading-none text-foreground">CORTEX</h1>
              <p className="text-xs leading-none mt-0.5 text-secondary">CASH</p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {/* Main navigation */}
            {navigationBase.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-foreground/85 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}

            {/* Admin navigation (separador) */}
            {isAdmin && (
              <>
                <div className="my-4 border-t border-border" />
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-foreground/85 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/20 text-secondary">
                        Admin
                      </span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="rounded-lg p-3 bg-background border border-border">
              <p className="text-xs font-medium text-foreground">Uso de IA</p>
              {aiLoading || !aiUsage ? (
                <div className="mt-2">
                  <div className="h-3 w-24 rounded animate-pulse bg-border" />
                  <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden bg-border">
                    <div className="h-full w-0 rounded-full bg-primary" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-secondary">
                      {`R$ ${aiUsage.usedBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${aiUsage.limitBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                    <span className="text-xs font-medium text-gold">
                      {Math.min(100, Math.max(0, Math.round(aiUsage.percentage)))}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden bg-border">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.max(0, aiUsage.percentage))}%`
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="glass-header sticky top-0 z-30 flex h-16 items-center gap-4 px-6 text-foreground">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <ProfileMenu />
        </header>

        {/* Page content */}
        <main className="p-6 min-h-screen bg-background text-foreground">{children}</main>
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
    </AuthGuard>
  )
}
