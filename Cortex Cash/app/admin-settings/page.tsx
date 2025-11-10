"use client";

/**
 * Admin Settings Page
 * Configurações exclusivas para administradores
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { brandNavyAlpha } from '@/lib/constants/colors';
import {
  Shield,
  Brain,
  BarChart3,
  Zap,
  TestTube,
  ShieldCheck,
  Settings as SettingsIcon,
} from 'lucide-react';
import { RequireAdmin } from '@/components/auth/require-admin';

// Import admin-only sections
import { DataPrivacySection } from '../settings/sections/data-privacy-section';
import { AICostsSection } from '../settings/sections/ai-costs-section';
import { AnalyticsSection } from '../settings/sections/analytics-section';
import { PerformanceSection } from '../settings/sections/performance-section';
import { DemoModeSection } from '../settings/sections/demo-mode-section';
import { AdminSection } from '../settings/sections/admin-section';
import { AdvancedSection } from '../settings/sections/advanced-section';

type AdminCategory =
  | 'dataPrivacy'
  | 'aiCosts'
  | 'analytics'
  | 'performance'
  | 'demoMode'
  | 'admin'
  | 'advanced';

const ADMIN_CATEGORIES: Array<{
  key: AdminCategory;
  label: string;
  description: string;
  icon: any;
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
];

export default function AdminSettingsPage() {
  const [activeCategory, setActiveCategory] = useState<AdminCategory>('dataPrivacy');
  const searchParams = useSearchParams();

  // Check for tab parameter in URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ADMIN_CATEGORIES.some(cat => cat.key === tab)) {
      setActiveCategory(tab as AdminCategory);
    }
  }, [searchParams]);

  const renderSection = () => {
    switch (activeCategory) {
      case 'dataPrivacy':
        return <DataPrivacySection />;
      case 'aiCosts':
        return <AICostsSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'performance':
        return <PerformanceSection />;
      case 'demoMode':
        return <DemoModeSection />;
      case 'admin':
        return <AdminSection />;
      case 'advanced':
        return <AdvancedSection />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <RequireAdmin>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8" style={{ color: '#18B0A4' }} />
              <h1 className="text-3xl font-bold text-white">Configurações Admin</h1>
            </div>
            <p className="text-white/70">
              Configurações exclusivas para administradores do sistema
            </p>
          </div>

          {/* Main Card Container */}
          <div
            className="rounded-xl border border-white/20 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              backgroundColor: '#2C3E50'
            }}
          >
            <div className="flex min-h-[600px]">
              {/* Sidebar Navigation */}
              <aside
                className="w-80 border-r border-white/20 p-4"
                style={{
                  backgroundColor: brandNavyAlpha(0.2)
                }}
              >
                <nav className="space-y-1">
                  {ADMIN_CATEGORIES.map((category) => {
                    const isActive = activeCategory === category.key;
                    const Icon = category.icon;

                    return (
                      <button
                        key={category.key}
                        onClick={() => setActiveCategory(category.key)}
                        className={cn(
                          "w-full flex items-start gap-3 p-4 rounded-lg transition-all text-left",
                          isActive
                            ? "shadow-lg"
                            : "hover:bg-white/5"
                        )}
                        style={
                          isActive
                            ? {
                                background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
                                backgroundColor: '#18B0A4'
                              }
                            : undefined
                        }
                      >
                        <Icon className={cn(
                          "w-5 h-5 mt-0.5 flex-shrink-0 transition-colors",
                          isActive ? "text-white" : "text-white/60"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-semibold text-sm transition-colors",
                            isActive ? "text-white" : "text-white/80"
                          )}>
                            {category.label}
                          </div>
                          <div className={cn(
                            "text-xs mt-1 transition-colors",
                            isActive ? "text-white/90" : "text-white/50"
                          )}>
                            {category.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* Content Area */}
              <main className="flex-1 flex flex-col overflow-hidden">
                <div className="p-8 pb-4">
                  {/* Section Header */}
                  <div className="mb-4">
                    {(() => {
                      const current = ADMIN_CATEGORIES.find(c => c.key === activeCategory);
                      const Icon = current?.icon;
                      return (
                        <div className="flex items-center gap-3 mb-2">
                          {Icon && <Icon className="w-6 h-6 text-white" style={{ color: '#18B0A4' }} />}
                          <h2 className="text-2xl font-bold text-white">{current?.label}</h2>
                        </div>
                      );
                    })()}
                    <p className="text-white/60 text-sm">
                      {ADMIN_CATEGORIES.find(c => c.key === activeCategory)?.description}
                    </p>
                  </div>

                  <Separator className="bg-white/10" />
                </div>

                {/* Section Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                  <div className="space-y-6">
                    {renderSection()}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </RequireAdmin>
    </DashboardLayout>
  );
}
