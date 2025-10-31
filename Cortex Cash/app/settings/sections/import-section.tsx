"use client";

/**
 * Import Classification Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações de importação e classificação
 */

import { SettingsCard, SettingsToggle, SettingsSlider } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';
import { Badge } from '@/components/ui/badge';

export function ImportSection() {
  const [autoDetectDuplicates, setAutoDetectDuplicates] = useSetting<boolean>('importClassification.autoDetectDuplicates');
  const [createPendingTransactions, setCreatePendingTransactions] = useSetting<boolean>('importClassification.createPendingTransactions');
  const [autoApplyRules, setAutoApplyRules] = useSetting<boolean>('importClassification.autoApplyRules');
  const [aiSuggestions, setAiSuggestions] = useSetting<boolean>('importClassification.aiSuggestions');
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useSetting<number>('importClassification.aiConfidenceThreshold');
  const [autoSaveTemplates, setAutoSaveTemplates] = useSetting<boolean>('importClassification.autoSaveTemplates');
  const [skipInvalidLines, setSkipInvalidLines] = useSetting<boolean>('importClassification.skipInvalidLines');

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Importação"
        description="Configure como importar transações"
      >
        <SettingsToggle
          label="Detecção automática de duplicatas"
          description="Identifica e alerta sobre transações duplicadas"
          value={autoDetectDuplicates}
          onChange={setAutoDetectDuplicates}
        />

        <SettingsToggle
          label="Criar transações pendentes"
          description="Transações importadas iniciam como pendentes"
          value={createPendingTransactions}
          onChange={setCreatePendingTransactions}
        />

        <SettingsToggle
          label="Pular linhas inválidas"
          description="Continua importação mesmo com erros em algumas linhas"
          value={skipInvalidLines}
          onChange={setSkipInvalidLines}
        />

        <SettingsToggle
          label="Salvar templates automaticamente"
          description="Salva mapeamento de colunas para próximas importações"
          value={autoSaveTemplates}
          onChange={setAutoSaveTemplates}
        />
      </SettingsCard>

      <SettingsCard
        title="Classificação Automática"
        description="Configure regras de classificação"
      >
        <SettingsToggle
          label="Aplicar regras automaticamente"
          description="Classifica transações baseado em regras salvas"
          value={autoApplyRules}
          onChange={setAutoApplyRules}
        />

        <SettingsToggle
          label="Sugestões por IA"
          description="Usa IA para sugerir categorias e descrições"
          value={aiSuggestions}
          onChange={setAiSuggestions}
          badge={<Badge variant="secondary">v0.4+</Badge>}
        />

        {aiSuggestions && (
          <SettingsSlider
            label="Confiança mínima da IA"
            description="Só aceita sugestões acima deste nível"
            value={aiConfidenceThreshold}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={setAiConfidenceThreshold}
          />
        )}
      </SettingsCard>
    </div>
  );
}
