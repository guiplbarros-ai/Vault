"use client";

/**
 * Localization Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações de idioma, moeda e formatos regionais
 */

import { SettingsCard, SettingsSelect, SettingsToggle } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';

export function LocalizationSection() {
  const [language, setLanguage] = useSetting<'pt-BR' | 'en-US' | 'es'>('localization.language');
  const [dateFormat, setDateFormat] = useSetting<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('localization.dateFormat');
  const [timeFormat, setTimeFormat] = useSetting<'24h' | '12h'>('localization.timeFormat');
  const [currency, setCurrency] = useSetting<'BRL' | 'USD' | 'EUR' | 'GBP'>('localization.currency');
  const [decimalSeparator, setDecimalSeparator] = useSetting<',' | '.'>('localization.decimalSeparator');
  const [firstDayOfWeek, setFirstDayOfWeek] = useSetting<0 | 1>('localization.firstDayOfWeek');
  const [hideDecimals, setHideDecimals] = useSetting<boolean>('localization.hideDecimals');

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Idioma e Região"
        description="Configure o idioma e formatos regionais"
      >
        <SettingsSelect
          label="Idioma"
          description="Idioma da interface"
          value={language}
          options={[
            { value: 'pt-BR', label: 'Português (Brasil)' },
            { value: 'en-US', label: 'English (US)' },
            { value: 'es', label: 'Español' },
          ]}
          onChange={(value) => setLanguage(value as typeof language)}
        />

        <SettingsSelect
          label="Moeda"
          description="Moeda padrão para exibição de valores"
          value={currency}
          options={[
            { value: 'BRL', label: 'Real (R$)' },
            { value: 'USD', label: 'Dólar ($)' },
            { value: 'EUR', label: 'Euro (€)' },
            { value: 'GBP', label: 'Libra (£)' },
          ]}
          onChange={(value) => setCurrency(value as typeof currency)}
        />
      </SettingsCard>

      <SettingsCard
        title="Formatos de Data e Hora"
        description="Personalize como datas e horas são exibidas"
      >
        <SettingsSelect
          label="Formato de data"
          description="Como as datas serão exibidas"
          value={dateFormat}
          options={[
            { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA (31/12/2024)' },
            { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA (12/31/2024)' },
            { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD (2024-12-31)' },
          ]}
          onChange={(value) => setDateFormat(value as typeof dateFormat)}
        />

        <SettingsSelect
          label="Formato de hora"
          description="Sistema de 12h ou 24h"
          value={timeFormat}
          options={[
            { value: '24h', label: '24 horas (14:30)' },
            { value: '12h', label: '12 horas (2:30 PM)' },
          ]}
          onChange={(value) => setTimeFormat(value as typeof timeFormat)}
        />

        <SettingsSelect
          label="Primeiro dia da semana"
          description="Início da semana em calendários"
          value={String(firstDayOfWeek)}
          options={[
            { value: '0', label: 'Domingo' },
            { value: '1', label: 'Segunda-feira' },
          ]}
          onChange={(value) => setFirstDayOfWeek(Number(value) as typeof firstDayOfWeek)}
        />
      </SettingsCard>

      <SettingsCard
        title="Formatos Numéricos"
        description="Configure separadores e exibição de valores"
      >
        <SettingsSelect
          label="Separador decimal"
          description="Caractere usado para separar decimais"
          value={decimalSeparator}
          options={[
            { value: ',', label: 'Vírgula (1.234,56)' },
            { value: '.', label: 'Ponto (1,234.56)' },
          ]}
          onChange={(value) => setDecimalSeparator(value as typeof decimalSeparator)}
        />

        <SettingsToggle
          label="Ocultar casas decimais"
          description="Exibe valores monetários sem centavos em toda a aplicação (ex: R$ 1.234 ao invés de R$ 1.234,56)"
          value={hideDecimals}
          onChange={setHideDecimals}
        />
      </SettingsCard>
    </div>
  );
}
