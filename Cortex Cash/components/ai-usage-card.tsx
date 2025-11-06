'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSetting } from '@/app/providers/settings-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils/format';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAIUsageSummary, checkAIBudgetLimit } from '@/lib/services/ai-usage.service';
import { USD_TO_BRL } from '@/lib/config/currency';

interface AIUsageCardProps {
  className?: string;
}

// Get AI settings from localStorage
function getAISettings() {
  if (typeof window === 'undefined') return null;

  try {
    const settings = localStorage.getItem('cortex_settings');
    if (!settings) return null;

    const parsed = JSON.parse(settings);
    return parsed.aiCosts || null;
  } catch {
    return null;
  }
}

export function AIUsageCard({ className }: AIUsageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    usedBrl: number;
    limitBrl: number;
    percentage: number;
    isNearLimit: boolean;
    isOverLimit: boolean;
  } | null>(null);
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme');

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  useEffect(() => {
    async function fetchUsage() {
      try {
        // Get settings to send limit
        const aiSettings = getAISettings();
        const limit = aiSettings?.monthlyCostLimit ?? 10.0;

        // Compute client-side from Dexie logs
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const summary = await getAIUsageSummary(startOfMonth, endOfMonth, USD_TO_BRL);
        const budget = await checkAIBudgetLimit(currentMonth, limit, 0.8, USD_TO_BRL);

        setData({
          usedBrl: summary.total_cost_brl,
          limitBrl: limit * USD_TO_BRL,
          percentage: budget.percentageUsed,
          isNearLimit: budget.isNearLimit,
          isOverLimit: budget.isOverLimit,
        });
      } catch (error) {
        // Silently fail - show 0 usage instead of error
        const aiSettings = getAISettings();
        const limit = aiSettings?.monthlyCostLimit ?? 10.0;
        setData({
          usedBrl: 0,
          limitBrl: limit * USD_TO_BRL,
          percentage: 0,
          isNearLimit: false,
          isOverLimit: false,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsage();
  }, []);

  if (isLoading) {
    return (
      <Card className={className} style={{
        background: isDark
          ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
      }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Uso de IA</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-2 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { usedBrl, limitBrl, percentage, isNearLimit, isOverLimit } = data;

  return (
    <Card className={className} style={{
      background: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
    }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={cn(
              "h-4 w-4",
              isOverLimit ? "text-destructive" : isNearLimit ? "text-[hsl(42_89%_50%)]" : "text-primary"
            )} />
            <CardTitle className="text-base">Uso de IA</CardTitle>
          </div>
          {(isNearLimit || isOverLimit) && (
            <AlertTriangle className={cn(
              "h-4 w-4",
              isOverLimit ? "text-destructive" : "text-[hsl(42_89%_50%)]"
            )} />
          )}
        </div>
        <CardDescription>
          {formatCurrency(usedBrl)} / {formatCurrency(limitBrl)}
          <span className={cn(
            "ml-2 font-medium",
            isOverLimit ? "text-destructive" : isNearLimit ? "text-[hsl(42_89%_40%)] dark:text-[hsl(42_89%_60%)]" : "text-muted-foreground"
          )}>
            {Math.round(percentage)}%
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress
          value={Math.min(percentage, 100)}
          className={cn(
            "h-2",
            isOverLimit && "[&>div]:bg-destructive",
            isNearLimit && !isOverLimit && "[&>div]:bg-[hsl(42_89%_50%)]"
          )}
        />
        {isOverLimit && (
          <p className="text-xs text-destructive mt-2">
            Limite excedido! Ajuste nas configurações.
          </p>
        )}
        {isNearLimit && !isOverLimit && (
          <p className="text-xs text-[hsl(42_89%_40%)] dark:text-[hsl(42_89%_60%)] mt-2">
            Próximo do limite mensal
          </p>
        )}
      </CardContent>
    </Card>
  );
}
