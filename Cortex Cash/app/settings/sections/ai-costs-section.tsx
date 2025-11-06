"use client";

/**
 * AI Costs Settings Section
 * Agent IA: Owner
 *
 * Configurações de IA e controle de custos
 */

import { SettingsCard, SettingsToggle, SettingsSelect, SettingsSlider } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

export function AICostsSection() {
  const [enabled, setEnabled] = useSetting<boolean>('aiCosts.enabled');
  const [defaultModel, setDefaultModel] = useSetting<'gpt-4o-mini' | 'gpt-4o'>('aiCosts.defaultModel');
  const [monthlyCostLimit, setMonthlyCostLimit] = useSetting<number>('aiCosts.monthlyCostLimit');
  const [allowOverride, setAllowOverride] = useSetting<boolean>('aiCosts.allowOverride');
  const [strategy, setStrategy] = useSetting<'aggressive' | 'balanced' | 'quality'>('aiCosts.strategy');
  const [cachePrompts, setCachePrompts] = useSetting<boolean>('aiCosts.cachePrompts');
  const [batchProcessing, setBatchProcessing] = useSetting<boolean>('aiCosts.batchProcessing');
  const [batchSize, setBatchSize] = useSetting<10 | 25 | 50 | 100>('aiCosts.batchSize');
  const [confidenceThreshold, setConfidenceThreshold] = useSetting<number>('aiCosts.confidenceThreshold');
  const [autoApplyOnImport, setAutoApplyOnImport] = useSetting<boolean>('aiCosts.autoApplyOnImport');

  // Check if API key is configured in environment
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  useEffect(() => {
    async function checkApiKey() {
      try {
        const response = await fetch('/api/ai/status');
        if (response.ok) {
          const data = await response.json();
          setApiKeyConfigured(data.apiKeyConfigured);
        }
      } catch (error) {
        console.error('Error checking API key status:', error);
      }
    }
    checkApiKey();
  }, []);

  return (
    <div className="space-y-6">
      <SettingsCard
        title="OpenAI API"
        description="Configure o modelo e recursos de IA"
      >
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              {apiKeyConfigured ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-sm font-medium">API Key configurada</p>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <p className="text-sm font-medium">API Key não configurada</p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {apiKeyConfigured
                ? 'A chave OpenAI está configurada no servidor.'
                : 'Adicione OPENAI_API_KEY no arquivo .env.local e reinicie o servidor.'}
            </p>
          </div>

          <SettingsToggle
            label="Ativar recursos de IA"
            description="Usa OpenAI para classificação e sugestões"
            value={enabled}
            onChange={setEnabled}
            badge={<Badge variant="secondary">v0.4+</Badge>}
          />

          {enabled && (
            <SettingsSelect
              label="Modelo padrão"
              description="Modelo da OpenAI para usar"
              value={defaultModel}
              options={[
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini (rápido e econômico)' },
                { value: 'gpt-4o', label: 'GPT-4o (melhor qualidade)' },
              ]}
              onChange={(value) => setDefaultModel(value as typeof defaultModel)}
            />
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Controle de Custos"
        description="Gerencie gastos com API da OpenAI"
      >
        <SettingsSlider
          label="Limite mensal"
          description="Gasto máximo por mês com API"
          value={monthlyCostLimit}
          min={0}
          max={100}
          step={5}
          unit=" USD"
          onChange={setMonthlyCostLimit}
        />

        <SettingsToggle
          label="Permitir override"
          description="Permite ultrapassar o limite se necessário"
          value={allowOverride}
          onChange={setAllowOverride}
        />

        <SettingsSelect
          label="Estratégia de uso"
          description="Balanceie velocidade, custo e qualidade"
          value={strategy}
          options={[
            { value: 'aggressive', label: 'Agressiva (usa IA sempre que possível)' },
            { value: 'balanced', label: 'Balanceada (equilibra custo e qualidade)' },
            { value: 'quality', label: 'Qualidade (prioriza melhores resultados)' },
          ]}
          onChange={(value) => setStrategy(value as typeof strategy)}
        />
      </SettingsCard>

      <SettingsCard
        title="Otimizações"
        description="Reduza custos sem perder funcionalidades"
      >
        <SettingsToggle
          label="Cache de prompts"
          description="Reutiliza respostas para prompts similares"
          value={cachePrompts}
          onChange={setCachePrompts}
        />

        <SettingsToggle
          label="Processamento em lote"
          description="Agrupa múltiplas solicitações em uma chamada"
          value={batchProcessing}
          onChange={setBatchProcessing}
        />

        {batchProcessing && (
          <SettingsSelect
            label="Tamanho do lote"
            description="Quantas transações processar por vez"
            value={String(batchSize)}
            options={[
              { value: '10', label: '10 transações' },
              { value: '25', label: '25 transações' },
              { value: '50', label: '50 transações' },
              { value: '100', label: '100 transações' },
            ]}
            onChange={(value) => setBatchSize(Number(value) as typeof batchSize)}
          />
        )}
      </SettingsCard>

      <SettingsCard
        title="Classificação Automática"
        description="Configure como a IA classifica transações"
      >
        <SettingsSlider
          label="Confiança mínima"
          description="Aceitar sugestões apenas acima deste nível de confiança (0-100%)"
          value={Math.round((confidenceThreshold || 0.7) * 100)}
          min={50}
          max={100}
          step={5}
          unit="%"
          onChange={(value) => setConfidenceThreshold(value / 100)}
        />

        <SettingsToggle
          label="Auto-aplicar na importação"
          description="Aplica automaticamente categorias sugeridas acima do threshold durante importação"
          value={autoApplyOnImport}
          onChange={setAutoApplyOnImport}
          badge={<Badge variant="secondary">Novo</Badge>}
        />

        <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">
            ℹ️ Como funciona
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Sugestões com confiança ≥ {Math.round((confidenceThreshold || 0.7) * 100)}% {autoApplyOnImport ? 'serão aplicadas automaticamente' : 'precisarão de confirmação manual'}
            </li>
            <li>
              Sugestões abaixo do threshold sempre exigem confirmação manual
            </li>
            <li>
              Você pode revisar e alterar classificações a qualquer momento
            </li>
          </ul>
        </div>
      </SettingsCard>
    </div>
  );
}
