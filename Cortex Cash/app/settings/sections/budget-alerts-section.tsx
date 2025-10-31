"use client";

/**
 * Budget Alerts Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações de alertas de orçamento
 */

import { SettingsCard, SettingsToggle, SettingsSelect } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';

export function BudgetAlertsSection() {
  const [enabled, setEnabled] = useSetting<boolean>('budgetAlerts.enabled');
  const [alert80, setAlert80] = useSetting<boolean>('budgetAlerts.alert80');
  const [alert100, setAlert100] = useSetting<boolean>('budgetAlerts.alert100');
  const [alert120, setAlert120] = useSetting<boolean>('budgetAlerts.alert120');
  const [calculationMethod, setCalculationMethod] = useSetting<'cash' | 'accrual'>('budgetAlerts.calculationMethod');
  const [considerTransfers, setConsiderTransfers] = useSetting<boolean>('budgetAlerts.considerTransfers');
  const [autoProjection, setAutoProjection] = useSetting<boolean>('budgetAlerts.autoProjection');
  const [projectionMethod, setProjectionMethod] = useSetting<'avg3months' | 'avg6months' | 'lastMonth' | 'manual'>('budgetAlerts.projectionMethod');
  const [resetMonthly, setResetMonthly] = useSetting<boolean>('budgetAlerts.resetMonthly');

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Alertas"
        description="Configure quando ser notificado sobre orçamentos"
      >
        <SettingsToggle
          label="Ativar alertas"
          description="Receba notificações sobre uso de orçamento"
          value={enabled}
          onChange={setEnabled}
        />

        {enabled && (
          <>
            <SettingsToggle
              label="Alerta aos 80%"
              description="Notifica quando atingir 80% do orçamento"
              value={alert80}
              onChange={setAlert80}
            />

            <SettingsToggle
              label="Alerta aos 100%"
              description="Notifica quando atingir 100% do orçamento"
              value={alert100}
              onChange={setAlert100}
            />

            <SettingsToggle
              label="Alerta aos 120%"
              description="Notifica quando ultrapassar 120% do orçamento"
              value={alert120}
              onChange={setAlert120}
            />
          </>
        )}
      </SettingsCard>

      <SettingsCard
        title="Cálculo"
        description="Como calcular o uso do orçamento"
      >
        <SettingsSelect
          label="Método de cálculo"
          description="Regime de caixa ou competência"
          value={calculationMethod}
          options={[
            { value: 'cash', label: 'Regime de Caixa (data efetiva)' },
            { value: 'accrual', label: 'Regime de Competência (data vencimento)' },
          ]}
          onChange={(value) => setCalculationMethod(value as typeof calculationMethod)}
        />

        <SettingsToggle
          label="Considerar transferências"
          description="Incluir transferências no cálculo de orçamento"
          value={considerTransfers}
          onChange={setConsiderTransfers}
        />

        <SettingsToggle
          label="Reset mensal automático"
          description="Reinicia orçamentos no início do mês"
          value={resetMonthly}
          onChange={setResetMonthly}
        />
      </SettingsCard>

      <SettingsCard
        title="Projeções"
        description="Projeção automática de gastos futuros"
      >
        <SettingsToggle
          label="Projeção automática"
          description="Estima gastos futuros baseado em histórico"
          value={autoProjection}
          onChange={setAutoProjection}
        />

        {autoProjection && (
          <SettingsSelect
            label="Método de projeção"
            description="Como calcular a projeção"
            value={projectionMethod}
            options={[
              { value: 'avg3months', label: 'Média dos últimos 3 meses' },
              { value: 'avg6months', label: 'Média dos últimos 6 meses' },
              { value: 'lastMonth', label: 'Baseado no mês anterior' },
              { value: 'manual', label: 'Manual' },
            ]}
            onChange={(value) => setProjectionMethod(value as typeof projectionMethod)}
          />
        )}
      </SettingsCard>
    </div>
  );
}
