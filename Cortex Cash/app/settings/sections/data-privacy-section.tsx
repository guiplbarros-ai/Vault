"use client";

/**
 * Data Privacy Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações de backup, storage e privacidade
 */

import { SettingsCard, SettingsSelect, SettingsToggle, SettingsSlider } from '@/components/settings';
import { useSetting, useSettings } from '@/app/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function DataPrivacySection() {
  const { exportSettings, importSettings, resetSettings } = useSettings();

  const [autoBackup, setAutoBackup] = useSetting<boolean>('dataPrivacy.autoBackup');
  const [backupFrequency, setBackupFrequency] = useSetting<'daily' | 'weekly' | 'monthly'>('dataPrivacy.backupFrequency');
  const [backupRetention, setBackupRetention] = useSetting<number>('dataPrivacy.backupRetention');
  const [telemetry, setTelemetry] = useSetting<boolean>('dataPrivacy.telemetry');
  const [encryption, setEncryption] = useSetting<boolean>('dataPrivacy.encryption');

  const handleExport = () => {
    try {
      const json = exportSettings();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cortex-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Configurações exportadas com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar configurações');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await importSettings(text);
        toast.success('Configurações importadas com sucesso');
      } catch (error) {
        toast.error('Erro ao importar configurações');
      }
    };
    input.click();
  };

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja restaurar todas as configurações padrão?')) {
      try {
        await resetSettings();
        toast.success('Configurações restauradas');
      } catch (error) {
        toast.error('Erro ao restaurar configurações');
      }
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Backup Automático"
        description="Configure backups periódicos dos seus dados"
      >
        <SettingsToggle
          label="Backup automático"
          description="Cria backups automáticos dos seus dados localmente"
          value={autoBackup}
          onChange={setAutoBackup}
        />

        {autoBackup && (
          <>
            <SettingsSelect
              label="Frequência"
              description="Com que frequência fazer backups"
              value={backupFrequency}
              options={[
                { value: 'daily', label: 'Diariamente' },
                { value: 'weekly', label: 'Semanalmente' },
                { value: 'monthly', label: 'Mensalmente' },
              ]}
              onChange={(value) => setBackupFrequency(value as typeof backupFrequency)}
            />

            <SettingsSlider
              label="Retenção"
              description="Quantos dias manter backups antigos"
              value={backupRetention}
              min={1}
              max={90}
              step={1}
              unit=" dias"
              onChange={setBackupRetention}
            />
          </>
        )}
      </SettingsCard>

      <SettingsCard
        title="Privacidade"
        description="Controle de dados e telemetria"
      >
        <SettingsToggle
          label="Telemetria"
          description="Ajude a melhorar o app compartilhando dados anônimos de uso"
          value={telemetry}
          onChange={setTelemetry}
        />

        <SettingsToggle
          label="Criptografia local"
          description="Criptografa dados sensíveis no dispositivo"
          value={encryption}
          onChange={setEncryption}
          badge={<Badge variant="secondary">v1.0+</Badge>}
        />
      </SettingsCard>

      <SettingsCard
        title="Gerenciar Dados"
        description="Exportar, importar ou restaurar configurações"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Exportar configurações</p>
              <p className="text-sm text-white/70">
                Salvar suas configurações em arquivo JSON
              </p>
            </div>
            <Button onClick={handleExport} variant="outline" className="text-white border-white/20 hover:bg-white/10">
              Exportar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Importar configurações</p>
              <p className="text-sm text-white/70">
                Restaurar configurações de um arquivo
              </p>
            </div>
            <Button onClick={handleImport} variant="outline" className="text-white border-white/20 hover:bg-white/10">
              Importar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Restaurar padrões</p>
              <p className="text-sm text-white/70">
                Voltar às configurações de fábrica
              </p>
            </div>
            <Button onClick={handleReset} variant="destructive">
              Restaurar
            </Button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
