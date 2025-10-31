"use client";

/**
 * Appearance Settings Section
 * Agent IMPORT: Owner
 *
 * Configurações de tema, densidade e tipografia
 */

import { useSettingsCategory } from '@/app/providers/settings-provider';
import { SettingsCard, SettingsSelect, SettingsToggle, SettingsSlider } from '@/components/settings';
import { useSetting } from '@/app/providers/settings-provider';
import { Badge } from '@/components/ui/badge';

export function AppearanceSection() {
  const [density, setDensity] = useSetting<'compact' | 'comfortable' | 'spacious'>('appearance.density');
  const [fontSize, setFontSize] = useSetting<90 | 100 | 110 | 120>('appearance.fontSize');
  const [pixelArtMode, setPixelArtMode] = useSetting<boolean>('appearance.pixelArtMode');

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Estilo Visual"
        description="Personalize a aparência visual do aplicativo"
      >
        <SettingsToggle
          label="Modo Pixel Art"
          description="Ativa o modo pixel art com fontes e ícones estilizados"
          value={pixelArtMode}
          onChange={setPixelArtMode}
          badge={<Badge variant="secondary">Beta</Badge>}
        />
      </SettingsCard>

      <SettingsCard
        title="Densidade e Tipografia"
        description="Controle o espaçamento e tamanho dos elementos"
      >
        <SettingsSelect
          label="Densidade"
          description="Ajuste o espaçamento entre elementos"
          value={density}
          options={[
            { value: 'compact', label: 'Compacto' },
            { value: 'comfortable', label: 'Confortável' },
            { value: 'spacious', label: 'Espaçoso' },
          ]}
          onChange={(value) => setDensity(value as typeof density)}
        />

        <SettingsSlider
          label="Tamanho da fonte"
          description="Ajuste o tamanho do texto em toda a aplicação"
          value={fontSize}
          min={90}
          max={120}
          step={10}
          unit="%"
          onChange={(value) => setFontSize(value as typeof fontSize)}
        />
      </SettingsCard>
    </div>
  );
}
