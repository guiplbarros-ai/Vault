'use client'

/**
 * Admin Settings Page
 * Configurações exclusivas para administradores
 */

import { RequireAdmin } from '@/components/auth/require-admin'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Brain,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  TestTube,
  Zap,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AdminSection } from '../settings/sections/admin-section'
import { AdvancedSection } from '../settings/sections/advanced-section'
import { AICostsSection } from '../settings/sections/ai-costs-section'
import { AnalyticsSection } from '../settings/sections/analytics-section'
// Import admin-only sections
import { DataPrivacySection } from '../settings/sections/data-privacy-section'
import { DemoModeSection } from '../settings/sections/demo-mode-section'
import { PerformanceSection } from '../settings/sections/performance-section'

type AdminCategory =
  | 'dataPrivacy'
  | 'aiCosts'
  | 'analytics'
  | 'performance'
  | 'demoMode'
  | 'admin'
  | 'advanced'

const ADMIN_CATEGORIES: Array<{
  key: AdminCategory
  label: string
  description: string
  icon: any
}> = [
  {
    key: 'dataPrivacy',
    label: 'Dados e Privacidade',
    description: 'Backup, storage e telemetria',
    icon: Shield,
  },
  {
    key: 'aiCosts',
    label: 'IA e Custos',
    description: 'OpenAI, modelos e limites',
    icon: Brain,
  },
  {
    key: 'analytics',
    label: 'Analytics de IA',
    description: 'Métricas e performance da IA',
    icon: BarChart3,
  },
  {
    key: 'performance',
    label: 'Performance',
    description: 'Cache, paginação e otimizações',
    icon: Zap,
  },
  {
    key: 'demoMode',
    label: 'Modo Demo',
    description: 'Dados de exemplo e testes',
    icon: TestTube,
  },
  {
    key: 'admin',
    label: 'Gerenciar Admins',
    description: 'Promover/remover administradores',
    icon: ShieldCheck,
  },
  {
    key: 'advanced',
    label: 'Avançado',
    description: 'Modo dev, logs e experimentos',
    icon: SettingsIcon,
  },
]

export default function AdminSettingsPage() {
  const [activeCategory, setActiveCategory] = useState<AdminCategory>('dataPrivacy')
  const searchParams = useSearchParams()

  // Check for tab parameter in URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ADMIN_CATEGORIES.some((cat) => cat.key === tab)) {
      setActiveCategory(tab as AdminCategory)
    }
  }, [searchParams])

  const renderSection = () => {
    switch (activeCategory) {
      case 'dataPrivacy':
        return <DataPrivacySection />
      case 'aiCosts':
        return <AICostsSection />
      case 'analytics':
        return <AnalyticsSection />
      case 'performance':
        return <PerformanceSection />
      case 'demoMode':
        return <DemoModeSection />
      case 'admin':
        return <AdminSection />
      case 'advanced':
        return <AdvancedSection />
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <RequireAdmin>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Admin</h1>
            </div>
            <p className="text-foreground/70">
              Configurações exclusivas para administradores do sistema
            </p>
          </div>

          {/* Main Card Container */}
          <div className="rounded-xl overflow-hidden bg-card border border-border">
            <div className="flex min-h-[600px]">
              {/* Sidebar Navigation */}
              <aside className="w-80 p-4 bg-background border-r border-border">
                <nav className="space-y-1">
                  {ADMIN_CATEGORIES.map((category) => {
                    const isActive = activeCategory === category.key
                    const Icon = category.icon

                    return (
                      <button
                        key={category.key}
                        onClick={() => setActiveCategory(category.key)}
                        className={cn(
                          'w-full flex items-start gap-3 p-4 rounded-lg transition-all text-left',
                          isActive ? 'bg-primary shadow-md' : 'bg-transparent hover:bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-5 h-5 mt-0.5 flex-shrink-0 transition-colors',
                            isActive ? 'text-foreground' : 'text-secondary'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              'font-semibold text-sm transition-colors text-foreground',
                              isActive ? 'opacity-100' : 'opacity-80'
                            )}
                          >
                            {category.label}
                          </div>
                          <div
                            className={cn(
                              'text-xs mt-1 transition-colors text-foreground',
                              isActive ? 'opacity-90' : 'opacity-50'
                            )}
                          >
                            {category.description}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </nav>
              </aside>

              {/* Content Area */}
              <main className="flex-1 flex flex-col overflow-hidden">
                <div className="p-8 pb-4">
                  {/* Section Header */}
                  <div className="mb-4">
                    {(() => {
                      const current = ADMIN_CATEGORIES.find((c) => c.key === activeCategory)
                      const Icon = current?.icon
                      return (
                        <div className="flex items-center gap-3 mb-2">
                          {Icon && <Icon className="w-6 h-6 text-primary" />}
                          <h2 className="text-2xl font-bold text-foreground">{current?.label}</h2>
                        </div>
                      )
                    })()}
                    <p className="text-sm text-foreground/60">
                      {ADMIN_CATEGORIES.find((c) => c.key === activeCategory)?.description}
                    </p>
                  </div>

                  <Separator className="bg-border" />
                </div>

                {/* Section Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                  <div className="space-y-6">{renderSection()}</div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </RequireAdmin>
    </DashboardLayout>
  )
}
