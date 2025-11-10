/**
 * Settings Item Component
 * Agent IMPORT: Owner
 *
 * Item individual de configuração com label, descrição e controle
 */

import type { ReactNode } from 'react';

interface SettingsItemProps {
  label: string;
  description?: string;
  children: ReactNode;
  badge?: ReactNode;
}

export function SettingsItem({
  label,
  description,
  children,
  badge,
}: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium leading-none text-foreground">
            {label}
          </label>
          {badge}
        </div>
        {description && (
          <p className="text-xs leading-relaxed text-foreground/70">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center flex-shrink-0">
        {children}
      </div>
    </div>
  );
}
