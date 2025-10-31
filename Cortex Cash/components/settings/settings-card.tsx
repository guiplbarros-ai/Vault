/**
 * Settings Card Component
 * Agent IMPORT: Owner
 *
 * Card container para seções de configurações
 */

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({
  title,
  description,
  children,
  className,
}: SettingsCardProps) {
  return (
    <Card
      className={cn("border-white/10", className)}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <CardHeader className="pb-4 border-b border-white/10">
        <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-white/60 mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {children}
      </CardContent>
    </Card>
  );
}
