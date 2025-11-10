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
      className={cn("bg-card border-border", className)}
    >
      <CardHeader
        className="pb-4 border-b border-border"
      >
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-sm mt-1 text-foreground/60">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {children}
      </CardContent>
    </Card>
  );
}
