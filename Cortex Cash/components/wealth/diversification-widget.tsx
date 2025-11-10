'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { PieChart } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'

interface DiversificationData {
  por_tipo_conta: Array<{ tipo: string; valor: number; percentual: number }>
  por_tipo_investimento: Array<{ tipo: string; valor: number; percentual: number }>
  contas_vs_investimentos: {
    contas: number
    investimentos: number
    percentual_contas: number
    percentual_investimentos: number
  }
}

const TIPO_LABELS: Record<string, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  renda_fixa: 'Renda Fixa',
  renda_variavel: 'Renda Variável',
  fundo_investimento: 'Fundos',
  previdencia: 'Previdência',
  criptomoeda: 'Criptomoedas',
  outro: 'Outros',
}

export function DiversificationWidget() {
  const [data, setData] = useState<DiversificationData | null>(null)
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
        const result = await patrimonioService.getDiversificacao()
        setData(result)
      } catch (error) {
        console.error('Erro ao carregar diversificação:', error)
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Análise de Diversificação
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

  if (!data) {
    return null
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">
            Análise de Diversificação
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Distribuição do seu patrimônio por categoria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contas vs Investimentos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Contas vs Investimentos
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Contas
              </span>
              <span className="text-xs font-medium text-foreground">
                {formatCurrency(data.contas_vs_investimentos.contas)} (
                {data.contas_vs_investimentos.percentual_contas.toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={data.contas_vs_investimentos.percentual_contas}
              className="h-2"
              indicatorClassName="bg-success"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Investimentos
              </span>
              <span className="text-xs font-medium text-foreground">
                {formatCurrency(data.contas_vs_investimentos.investimentos)} (
                {data.contas_vs_investimentos.percentual_investimentos.toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={data.contas_vs_investimentos.percentual_investimentos}
              className="h-2"
              indicatorClassName="bg-warning"
            />
          </div>
        </div>

        {/* Tipos de Investimento */}
        {data.por_tipo_investimento.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Tipos de Investimento
              </span>
            </div>
            <div className="space-y-3">
              {data.por_tipo_investimento.map((item) => (
                <div key={item.tipo} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {TIPO_LABELS[item.tipo] || item.tipo}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {formatCurrency(item.valor)} ({item.percentual.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={item.percentual} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tipos de Conta */}
        {data.por_tipo_conta.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Tipos de Conta
              </span>
            </div>
            <div className="space-y-3">
              {data.por_tipo_conta.map((item) => (
                <div key={item.tipo} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {TIPO_LABELS[item.tipo] || item.tipo}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {formatCurrency(item.valor)} ({item.percentual.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={item.percentual} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
