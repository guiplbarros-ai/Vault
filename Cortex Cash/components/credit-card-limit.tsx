'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CreditCard, AlertTriangle } from 'lucide-react'

interface CreditCardLimitProps {
  nome: string
  limite_total: number
  limite_usado: number
  limite_disponivel: number
  percentual_usado: number
  cor?: string
  bandeira?: string
  ultimos_digitos?: string
}

export function CreditCardLimit({
  nome,
  limite_total,
  limite_usado,
  limite_disponivel,
  percentual_usado,
  cor = '#3B82F6',
  bandeira,
  ultimos_digitos,
}: CreditCardLimitProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusColor = () => {
    if (percentual_usado >= 90) return 'text-destructive'
    if (percentual_usado >= 70) return 'text-[hsl(42_89%_40%)] dark:text-[hsl(42_89%_60%)]'
    return 'text-[hsl(142_71%_35%)] dark:text-[hsl(142_71%_55%)]'
  }

  const getProgressColor = () => {
    if (percentual_usado >= 90) return 'bg-destructive'
    if (percentual_usado >= 70) return 'bg-[hsl(42_89%_50%)]'
    return 'bg-[hsl(142_71%_45%)]'
  }

  const getStatusText = () => {
    if (percentual_usado >= 90) return 'Atenção: Limite quase esgotado'
    if (percentual_usado >= 70) return 'Alerta: Uso elevado'
    return 'Uso normal'
  }

  return (
    <Card
      className="relative overflow-hidden border-l-4 transition-all hover:shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]"
      style={{
        borderLeftColor: cor
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <CreditCard className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{nome}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {bandeira && <span className="capitalize">{bandeira}</span>}
                {bandeira && ultimos_digitos && ' • '}
                {ultimos_digitos && <span>•••• {ultimos_digitos}</span>}
              </CardDescription>
            </div>
          </div>
          {percentual_usado >= 70 && (
            <AlertTriangle className="h-5 w-5 text-warning" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Limite Utilizado</span>
            <span className={`font-semibold ${percentual_usado >= 90 ? 'text-destructive' : percentual_usado >= 70 ? 'text-warning' : 'text-success'}`}>
              {percentual_usado.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={percentual_usado}
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Usado</p>
            <p className="text-sm font-semibold text-warning">{formatCurrency(limite_usado)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Disponível</p>
            <p className={`text-sm font-semibold ${percentual_usado >= 90 ? 'text-destructive' : percentual_usado >= 70 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(limite_disponivel)}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Limite Total</span>
            <span className="text-sm font-bold text-gold">{formatCurrency(limite_total)}</span>
          </div>
        </div>

        {/* Status Badge */}
        {percentual_usado >= 70 && (
          <Badge
            variant={percentual_usado >= 90 ? 'destructive' : 'default'}
            className="w-full justify-center"
          >
            {getStatusText()}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

