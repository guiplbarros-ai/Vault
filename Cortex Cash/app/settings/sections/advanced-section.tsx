"use client";

/**
 * Advanced Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações avançadas e modo desenvolvedor
 */

import { SettingsCard, SettingsToggle, SettingsSelect } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';
import { Badge } from '@/components/ui/badge';

export function AdvancedSection() {
  const [devMode, setDevMode] = useSetting<boolean>('advanced.devMode');
  const [logLevel, setLogLevel] = useSetting<'error' | 'warn' | 'info' | 'debug'>('advanced.logLevel');

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Modo Desenvolvedor"
        description="Recursos avançados para desenvolvedores e debugging"
      >
        <SettingsToggle
          label="Ativar modo desenvolvedor"
          description="Exibe informações técnicas e ferramentas de debug"
          value={devMode}
          onChange={setDevMode}
          badge={<Badge variant="destructive">Avançado</Badge>}
        />

        {devMode && (
          <SettingsSelect
            label="Nível de log"
            description="Quantidade de informações no console"
            value={logLevel}
            options={[
              { value: 'error', label: 'Error (apenas erros)' },
              { value: 'warn', label: 'Warn (avisos e erros)' },
              { value: 'info', label: 'Info (informações gerais)' },
              { value: 'debug', label: 'Debug (tudo)' },
            ]}
            onChange={(value) => setLogLevel(value as typeof logLevel)}
          />
        )}
      </SettingsCard>

      <SettingsCard
        title="Informações do Sistema"
        description="Detalhes sobre o aplicativo e armazenamento"
      >
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Versão:</span>
            <span className="font-medium">v0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Build:</span>
            <span className="font-medium">Development</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database:</span>
            <span className="font-medium">Dexie.js (IndexedDB)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Storage:</span>
            <span className="font-medium">Local (localStorage + IndexedDB)</span>
          </div>
        </div>
      </SettingsCard>

      {devMode && (
        <SettingsCard
          title="Experimentos"
          description="Features experimentais em desenvolvimento"
        >
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>⚠️ Aviso:</strong> Recursos experimentais podem ser instáveis ou mudar a qualquer momento.
            </p>
          </div>

          <div className="text-sm text-muted-foreground text-center py-4">
            Nenhum experimento disponível no momento
          </div>
        </SettingsCard>
      )}
    </div>
  );
}
