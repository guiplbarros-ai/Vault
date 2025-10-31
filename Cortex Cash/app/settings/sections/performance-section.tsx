"use client";

/**
 * Performance Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações de performance e otimizações
 */

import { useState } from 'react';
import { SettingsCard, SettingsToggle, SettingsSelect, SettingsSlider } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PerformanceSection() {
  const [clearing, setClearing] = useState(false);
  const [cache, setCache] = useSetting<boolean>('performance.cache');
  const [cacheTTL, setCacheTTL] = useSetting<number>('performance.cacheTTL');
  const [lazyLoading, setLazyLoading] = useSetting<boolean>('performance.lazyLoading');
  const [pagination, setPagination] = useSetting<25 | 50 | 100 | 200>('performance.pagination');
  const [chartAnimations, setChartAnimations] = useSetting<boolean>('performance.chartAnimations');
  const [preloadDashboards, setPreloadDashboards] = useSetting<boolean>('performance.preloadDashboards');
  const [autoClearCache, setAutoClearCache] = useSetting<boolean>('performance.autoClearCache');
  const [cacheClearFrequency, setCacheClearFrequency] = useSetting<'on_close' | 'daily' | 'weekly'>('performance.cacheClearFrequency');

  const handleClearCache = async () => {
    const confirmClear = confirm(
      '⚠️ Tem certeza que deseja limpar todo o cache?\n\n' +
      'Isso pode temporariamente deixar a aplicação mais lenta até que o cache seja reconstruído.'
    );

    if (!confirmClear) return;

    setClearing(true);

    try {
      // Limpa localStorage (exceto settings)
      const settings = localStorage.getItem('cortex_settings');
      const initialized = localStorage.getItem('cortex-cash-initialized');

      localStorage.clear();

      // Restaura settings
      if (settings) localStorage.setItem('cortex_settings', settings);
      if (initialized) localStorage.setItem('cortex-cash-initialized', initialized);

      // Limpa sessionStorage
      sessionStorage.clear();

      // Limpa cache do navegador se disponível
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      toast.success('Cache limpo com sucesso!');

      // Aguarda 1 segundo e recarrega
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      toast.error('Erro ao limpar cache');
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Cache"
        description="Configure o cache para melhorar a performance"
      >
        <SettingsToggle
          label="Ativar cache"
          description="Armazena dados temporariamente para acesso mais rápido"
          value={cache}
          onChange={setCache}
        />

        {cache && (
          <>
            <SettingsSlider
              label="Tempo de vida do cache"
              description="Quanto tempo manter dados em cache"
              value={cacheTTL}
              min={1}
              max={60}
              step={1}
              unit=" min"
              onChange={setCacheTTL}
            />

            <SettingsToggle
              label="Limpar cache automaticamente"
              description="Remove cache antigo periodicamente"
              value={autoClearCache}
              onChange={setAutoClearCache}
            />

            {autoClearCache && (
              <SettingsSelect
                label="Frequência de limpeza"
                description="Com que frequência limpar o cache"
                value={cacheClearFrequency}
                options={[
                  { value: 'on_close', label: 'Ao fechar o app' },
                  { value: 'daily', label: 'Diariamente' },
                  { value: 'weekly', label: 'Semanalmente' },
                ]}
                onChange={(value) => setCacheClearFrequency(value as typeof cacheClearFrequency)}
              />
            )}

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white mb-1">
                    Limpar cache agora
                  </div>
                  <div className="text-xs text-white/60">
                    Remove todos os dados em cache e recarrega a aplicação
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={clearing}
                  className="flex-shrink-0 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Cache
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </SettingsCard>

      <SettingsCard
        title="Carregamento"
        description="Configure como os dados são carregados"
      >
        <SettingsToggle
          label="Lazy loading"
          description="Carrega dados sob demanda ao invés de tudo de uma vez"
          value={lazyLoading}
          onChange={setLazyLoading}
        />

        <SettingsSelect
          label="Itens por página"
          description="Quantos itens mostrar em listas"
          value={String(pagination)}
          options={[
            { value: '25', label: '25 itens' },
            { value: '50', label: '50 itens' },
            { value: '100', label: '100 itens' },
            { value: '200', label: '200 itens' },
          ]}
          onChange={(value) => setPagination(Number(value) as typeof pagination)}
        />

        <SettingsToggle
          label="Pré-carregar dashboards"
          description="Carrega dados dos dashboards antecipadamente"
          value={preloadDashboards}
          onChange={setPreloadDashboards}
        />
      </SettingsCard>

      <SettingsCard
        title="Animações"
        description="Configure animações visuais"
      >
        <SettingsToggle
          label="Animações de gráficos"
          description="Anima transições em gráficos e charts"
          value={chartAnimations}
          onChange={setChartAnimations}
        />
      </SettingsCard>
    </div>
  );
}
