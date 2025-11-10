'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { investimentoService } from '@/lib/services/investimento.service'
import { TrendingUp, TrendingDown, Award } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'
import { THEME_COLORS } from '@/lib/constants/colors'
import type { Investimento } from '@/lib/types'

const TIPO_LABELS: Record<string, string> = {
  renda_fixa: 'Renda Fixa',
  renda_variavel: 'Renda Variável',
  fundo_investimento: 'Fundos',
  previdencia: 'Previdência',
  criptomoeda: 'Criptomoedas',
  outro: 'Outros',
}

export function TopPerformersWidget() {
  const [topPerformers, setTopPerformers] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const { getSetting } = useSettings()
  const theme = getSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const investimentos = await investimentoService.getInvestimentosAtivos()

        // Calculate rentabilidade and sort
        const withRentabilidade = investimentos.map((inv) => ({
          ...inv,
          rentabilidade_calc: ((inv.valor_atual - inv.valor_aplicado) / inv.valor_aplicado) * 100,
        }))

        // Get top 5 performers
        const sorted = withRentabilidade.sort((a, b) => b.rentabilidade_calc - a.rentabilidade_calc)
        setTopPerformers(sorted.slice(0, 5))
      } catch (error) {
        console.error('Erro ao carregar top performers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Melhores Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (topPerformers.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Melhores Investimentos
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Top 5 investimentos por rentabilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">
              Nenhum investimento cadastrado
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">
            Melhores Investimentos
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Top 5 investimentos por rentabilidade
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topPerformers.map((inv, index) => {
            const rentabilidade = ((inv.valor_atual - inv.valor_aplicado) / inv.valor_aplicado) * 100
            const lucro = inv.valor_atual - inv.valor_aplicado
            const isPositive = rentabilidade >= 0

            return (
              <div
                key={inv.id}
                className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-gold text-foreground'
                          : index === 1
                          ? 'bg-muted-foreground text-foreground'
                          : index === 2
                          ? 'bg-warning text-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-foreground">
                      {inv.nome}
                    </span>
                  </div>
                  <div className="text-xs ml-8 text-muted-foreground">
                    {TIPO_LABELS[inv.tipo] || inv.tipo}
                    {inv.ticker && ` • ${inv.ticker}`}
                  </div>
                  <div className="text-xs ml-8 text-muted-foreground">
                    Aplicado: {formatCurrency(inv.valor_aplicado)}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-medium text-foreground">
                    {formatCurrency(inv.valor_atual)}
                  </div>
                  <div className={`flex items-center gap-1 justify-end text-xs font-medium ${
                    isPositive ? 'text-success' : 'text-destructive'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}{rentabilidade.toFixed(2)}%
                  </div>
                  <div className={`text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(lucro)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
