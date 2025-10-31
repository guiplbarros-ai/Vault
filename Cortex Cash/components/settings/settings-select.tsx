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
          className="w-[180px] !bg-[#1e293b] !text-white !border-white/20"
          style={{
            backgroundColor: '#1e293b',
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <SelectValue placeholder={placeholder} className="!text-white/70" />
        </SelectTrigger>
        <SelectContent
          className="!bg-gray-800 !border-gray-700"
          style={{
            backgroundColor: '#1f2937',
            borderColor: '#374151'
          }}
          position="popper"
          sideOffset={5}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="!text-white hover:!bg-gray-700 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsItem>
  );
}
