/**
 * Settings Toggle Component
 * Agent IMPORT: Owner
 *
 * Switch toggle para configurações booleanas
 */

"use client";

import { Switch } from '@/components/ui/switch';
import { SettingsItem } from './settings-item';

interface SettingsToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export function SettingsToggle({
  label,
  description,
  value,
  onChange,
  disabled = false,
  badge,
}: SettingsToggleProps) {
  return (
    <SettingsItem label={label} description={description} badge={badge}>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </SettingsItem>
  );
}
