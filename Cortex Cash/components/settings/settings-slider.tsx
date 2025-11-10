/**
 * Settings Slider Component
 * Agent IMPORT: Owner
 *
 * Slider para configurações numéricas
 */

"use client";

import { Slider } from '@/components/ui/slider';
import { SettingsItem } from './settings-item';

interface SettingsSliderProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  unit?: string;
  showValue?: boolean;
}

export function SettingsSlider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  badge,
  unit = '',
  showValue = true,
}: SettingsSliderProps) {
  return (
    <SettingsItem label={label} description={description} badge={badge}>
      <div className="flex items-center gap-3 w-[200px]">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="flex-1"
        />
        {showValue && (
          <span className="text-sm font-medium w-12 text-right text-foreground">
            {value}{unit}
          </span>
        )}
      </div>
    </SettingsItem>
  );
}
