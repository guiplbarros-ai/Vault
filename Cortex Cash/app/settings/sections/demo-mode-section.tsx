"use client";

/**
 * Demo Mode Section
 * Agent APP: Owner
 *
 * Seção de configurações para modo demo
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Trash2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { contaService } from '@/lib/services/conta.service';
import { transacaoService } from '@/lib/services/transacao.service';

interface DemoModeSettings {
  enabled: boolean;
  lastPopulated?: Date;
}

export function DemoModeSection() {
  const [demoMode, setDemoMode] = useState<DemoModeSettings>({ enabled: false });
  const [loading, setLoading] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  // Carregar configurações do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('demo_mode_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      setDemoMode({
        enabled: parsed.enabled || false,
        lastPopulated: parsed.lastPopulated ? new Date(parsed.lastPopulated) : undefined,
      });
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const contas = await contaService.listContas({ incluirInativas: true });
      const transacoes = await transacaoService.listTransacoes({ limit: 10000 });
      setAccountCount(contas.length);
      setTransactionCount(transacoes.length);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleToggleDemoMode = async (enabled: boolean) => {
    setLoading(true);
    try {
      const newSettings: DemoModeSettings = {
        enabled,
        lastPopulated: demoMode.lastPopulated,
      };
      localStorage.setItem('demo_mode_settings', JSON.stringify(newSettings));
      setDemoMode(newSettings);

      toast.success(enabled ? 'Modo demo ativado' : 'Modo demo desativado', {
        description: enabled
          ? 'Agora você pode popular o banco com dados de exemplo.'
          : 'Modo demo foi desativado.',
      });
    } catch (error) {
      console.error('Erro ao alternar modo demo:', error);
      toast.error('Erro ao alternar modo demo');
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateDemoData = async () => {
    setPopulating(true);
    try {
      // Importar e executar seed de dados demo
      const { seedDemoData } = await import('@/lib/db/seed-demo');
      await seedDemoData();

      const newSettings: DemoModeSettings = {
        enabled: true,
        lastPopulated: new Date(),
      };
      localStorage.setItem('demo_mode_settings', JSON.stringify(newSettings));
      setDemoMode(newSettings);

      await loadStats();

      toast.success('Dados de exemplo carregados', {
        description: 'O banco de dados foi populado com dados de demonstração.',
      });
    } catch (error) {
      console.error('Erro ao popular dados demo:', error);
      toast.error('Erro ao carregar dados de exemplo', {
        description: 'Não foi possível popular o banco de dados. Tente novamente.',
      });
    } finally {
      setPopulating(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    setClearing(true);
    try {
      // Limpar todas as tabelas
      const { getDB } = await import('@/lib/db/client');
      const db = getDB();

      await db.transaction('rw', [db.transacoes, db.contas], async () => {
        await db.transacoes.clear();
        await db.contas.clear();
      });

      // Atualiza lastPopulated mas mantém o estado do modo demo
      const newSettings: DemoModeSettings = {
        enabled: demoMode.enabled,
        lastPopulated: undefined,
      };
      localStorage.setItem('demo_mode_settings', JSON.stringify(newSettings));
      setDemoMode(newSettings);

      await loadStats();

      toast.success('Dados limpos', {
        description: 'Todos os dados foram removidos do banco.',
      });
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error('Erro ao limpar dados', {
        description: 'Não foi possível limpar os dados. Tente novamente.',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-white">Modo Demonstração</h3>
        <p className="text-sm text-white/70 mt-1">
          Ative o modo demo para experimentar o sistema com dados de exemplo.
        </p>
      </div>

      <Separator className="bg-white/10" />

      {/* Demo Mode Banner */}
      {demoMode.enabled && (
        <Card className="border-teal-500/50 bg-teal-500/10">
          <div className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-teal-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-teal-400">Modo Demo Ativo</h4>
              <p className="text-sm text-white/70 mt-1">
                Você está no modo de demonstração. Os dados são apenas para exemplo.
              </p>
              {demoMode.lastPopulated && (
                <p className="text-xs text-white/60 mt-2">
                  Última população: {new Date(demoMode.lastPopulated).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <Badge className="bg-teal-500 text-white">DEMO</Badge>
          </div>
        </Card>
      )}

      {/* Toggle Switch */}
      <div className="flex items-center justify-between rounded-lg border border-white/20 p-4 bg-white/5">
        <div className="space-y-0.5">
          <Label htmlFor="demo-mode" className="text-base text-white">
            Ativar Modo Demo
          </Label>
          <p className="text-sm text-white/60">
            Habilita o botão para popular dados de exemplo
          </p>
        </div>
        <Switch
          id="demo-mode"
          checked={demoMode.enabled}
          onCheckedChange={handleToggleDemoMode}
          disabled={loading}
        />
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-white/20 bg-white/5">
          <div className="p-4">
            <p className="text-sm font-medium text-white/70">Contas</p>
            <p className="text-2xl font-bold text-white mt-2">{accountCount}</p>
          </div>
        </Card>
        <Card className="border-white/20 bg-white/5">
          <div className="p-4">
            <p className="text-sm font-medium text-white/70">Transações</p>
            <p className="text-2xl font-bold text-white mt-2">{transactionCount}</p>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handlePopulateDemoData}
          disabled={!demoMode.enabled || populating}
          className="w-full text-white"
          style={{
            backgroundColor: demoMode.enabled ? '#18B0A4' : '#6b7280',
          }}
        >
          {populating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Populando banco...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Popular com Dados de Exemplo
            </>
          )}
        </Button>

        <Button
          onClick={handleClearDemoData}
          disabled={clearing || accountCount === 0}
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
        >
          {clearing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Limpando dados...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Dados Demo
            </>
          )}
        </Button>
      </div>

      {/* Warning */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
          <div className="text-sm text-white/80">
            <p className="font-semibold text-amber-400 mb-1">Atenção</p>
            <p>
              O botão "Limpar Dados" irá <strong>remover TODAS as contas e transações</strong> do banco de dados,
              independentemente do modo demo estar ativo ou não. Certifique-se de fazer backup antes se necessário.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
