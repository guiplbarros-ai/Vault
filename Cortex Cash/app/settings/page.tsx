"use client";

/**
 * Settings Page
 * Agent IMPORT: Owner
 *
 * Página principal de configurações com sidebar de navegação
 * APENAS configurações pessoais de usuário
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { brandNavyAlpha } from '@/lib/constants/colors';
import {
  Palette,
  Globe,
  Upload,
  DollarSign,
  User
} from 'lucide-react';
import type { SettingsCategory, UICategory } from '@/lib/types/settings';

// Import sections (ONLY user-level settings)
import { ProfileSection } from './sections/profile-section';
import { AppearanceSection } from './sections/appearance-section';
import { LocalizationSection } from './sections/localization-section';
import { ImportSection } from './sections/import-section';
import { BudgetAlertsSection } from './sections/budget-alerts-section';

const CATEGORIES: Array<{
  key: UICategory;
  label: string;
  description: string;
  icon: any;
}> = [
  {
    key: 'profile',
    label: 'Perfil',
    description: 'Foto e informações pessoais',
    icon: User,
  },
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
];

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<UICategory>('profile');
  const searchParams = useSearchParams();

  // Check for tab parameter in URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && CATEGORIES.some(cat => cat.key === tab)) {
      setActiveCategory(tab as UICategory);
    }
  }, [searchParams]);

  const renderSection = () => {
    switch (activeCategory) {
      case 'profile':
        return <ProfileSection />;
      case 'appearance':
        return <AppearanceSection />;
      case 'localization':
        return <LocalizationSection />;
      case 'importClassification':
        return <ImportSection />;
      case 'budgetAlerts':
        return <BudgetAlertsSection />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-foreground/70">
            Personalize sua experiência no Cortex Cash
          </p>
        </div>

        {/* Main Card Container */}
        <div
          className="rounded-xl overflow-hidden bg-card border border-border"
        >
          <div className="flex min-h-[600px]">
            {/* Sidebar Navigation */}
            <aside
              className="w-80 p-4 bg-background border-r border-border"
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
                          ? "bg-primary shadow-md"
                          : "bg-transparent hover:bg-muted"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mt-0.5 flex-shrink-0 transition-colors",
                          isActive ? "text-foreground" : "text-secondary"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "font-semibold text-sm transition-colors text-foreground",
                            isActive ? "opacity-100" : "opacity-80"
                          )}
                        >
                          {category.label}
                        </div>
                        <div
                          className={cn(
                            "text-xs mt-1 transition-colors text-foreground",
                            isActive ? "opacity-90" : "opacity-50"
                          )}
                        >
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
                        {Icon && <Icon className="w-6 h-6 text-primary" />}
                        <h2 className="text-2xl font-bold text-foreground">{current?.label}</h2>
                      </div>
                    );
                  })()}
                  <p className="text-sm text-foreground/60">
                    {CATEGORIES.find(c => c.key === activeCategory)?.description}
                  </p>
                </div>

                <Separator className="bg-border" />
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
