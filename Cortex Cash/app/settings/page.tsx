"use client";

/**
 * Settings Page
 * Agent IMPORT: Owner
 *
 * Página principal de configurações com sidebar de navegação
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Palette,
  Globe,
  Shield,
  Upload,
  DollarSign,
  Brain,
  BarChart3,
  Zap,
  Settings as SettingsIcon,
  TestTube
} from 'lucide-react';
import type { SettingsCategory, UICategory } from '@/lib/types/settings';

// Import sections
import { AppearanceSection } from './sections/appearance-section';
import { LocalizationSection } from './sections/localization-section';
import { DataPrivacySection } from './sections/data-privacy-section';
import { ImportSection } from './sections/import-section';
import { BudgetAlertsSection } from './sections/budget-alerts-section';
import { AICostsSection } from './sections/ai-costs-section';
import { AnalyticsSection } from './sections/analytics-section';
import { PerformanceSection } from './sections/performance-section';
import { AdvancedSection } from './sections/advanced-section';
import { DemoModeSection } from './sections/demo-mode-section';

const CATEGORIES: Array<{
  key: UICategory;
  label: string;
  description: string;
  icon: any;
}> = [
  {
    key: 'appearance',
    label: 'Aparência',
    description: 'Tema, densidade e tipografia',
    icon: Palette,
  },
  {
    key: 'localization',
    label: 'Localização',
    description: 'Idioma, moeda e formatos',
    icon: Globe,
  },
  {
    key: 'dataPrivacy',
    label: 'Dados e Privacidade',
    description: 'Backup, storage e telemetria',
    icon: Shield,
  },
  {
    key: 'importClassification',
    label: 'Importação',
    description: 'Duplicatas, regras e templates',
    icon: Upload,
  },
  {
    key: 'budgetAlerts',
    label: 'Orçamento',
    description: 'Alertas e projeções',
    icon: DollarSign,
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
    key: 'advanced',
    label: 'Avançado',
    description: 'Modo dev, logs e experimentos',
    icon: SettingsIcon,
  },
];

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<UICategory>('appearance');

  const renderSection = () => {
    switch (activeCategory) {
      case 'appearance':
        return <AppearanceSection />;
      case 'localization':
        return <LocalizationSection />;
      case 'dataPrivacy':
        return <DataPrivacySection />;
      case 'importClassification':
        return <ImportSection />;
      case 'budgetAlerts':
        return <BudgetAlertsSection />;
      case 'aiCosts':
        return <AICostsSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'performance':
        return <PerformanceSection />;
      case 'demoMode':
        return <DemoModeSection />;
      case 'advanced':
        return <AdvancedSection />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-white/70">
            Personalize sua experiência no Cortex Cash
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
                backgroundColor: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              <nav className="space-y-1">
                {CATEGORIES.map((category) => {
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
                    const current = CATEGORIES.find(c => c.key === activeCategory);
                    const Icon = current?.icon;
                    return (
                      <div className="flex items-center gap-3 mb-2">
                        {Icon && <Icon className="w-6 h-6 text-white" style={{ color: '#18B0A4' }} />}
                        <h2 className="text-2xl font-bold text-white">{current?.label}</h2>
                      </div>
                    );
                  })()}
                  <p className="text-white/60 text-sm">
                    {CATEGORIES.find(c => c.key === activeCategory)?.description}
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
    </DashboardLayout>
  );
}
