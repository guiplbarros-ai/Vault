/**
 * Settings Select Component
 * Agent IMPORT: Owner
 *
 * Dropdown select para configurações com opções
 */

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsItem } from './settings-item';

interface SettingsSelectOption {
  value: string;
  label: string;
}

interface SettingsSelectProps {
  label: string;
  description?: string;
  value: string;
  options: SettingsSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  placeholder?: string;
}

export function SettingsSelect({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
  badge,
  placeholder = "Selecione...",
}: SettingsSelectProps) {
  return (
    <SettingsItem label={label} description={description} badge={badge}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className="w-[180px] bg-card text-foreground border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <SelectValue placeholder={placeholder} className="text-foreground/70" />
        </SelectTrigger>
        <SelectContent
          className="bg-card border-border"
          position="popper"
          sideOffset={5}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer text-foreground bg-transparent hover:bg-muted"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsItem>
  );
}
