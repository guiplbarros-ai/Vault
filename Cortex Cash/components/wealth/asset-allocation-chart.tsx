'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Wallet } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'
import { getChartColors } from '@/lib/constants/colors'

export function AssetAllocationChart() {
  const [data, setData] = useState<{ contas: number; investimentos: number } | null>(null)
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
        setData(result.contas_vs_investimentos)
      } catch (error) {
        console.error('Erro ao carregar alocação de ativos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []

    const total = data.contas + data.investimentos
    const percentualContas = total > 0 ? (data.contas / total) * 100 : 0
    const percentualInvestimentos = total > 0 ? (data.investimentos / total) * 100 : 0

    return [
      {
        name: 'Contas',
        value: data.contas,
        percentual: percentualContas,
      },
      {
        name: 'Investimentos',
        value: data.investimentos,
        percentual: percentualInvestimentos,
      },
    ]
  }, [data])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const COLORS = useMemo(() => [getChartColors()[0], getChartColors()[5]], [])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border p-3 shadow-lg bg-card">
          <p className="mb-2 font-semibold text-foreground">
            {payload[0].name}
          </p>
          <p className="text-sm" style={{ color: payload[0].payload.fill }}>
            Valor: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-foreground">
            {payload[0].payload.percentual.toFixed(1)}% do patrimônio
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Alocação de Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0 || (data && data.contas === 0 && data.investimentos === 0)) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Alocação de Ativos
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Distribuição entre contas e investimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">
              Nenhum ativo cadastrado
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
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">
            Alocação de Ativos
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Distribuição entre contas bancárias e investimentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={5}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legenda customizada */}
          <div className="flex gap-6 justify-center mt-2">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-foreground">
                  {entry.name}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {entry.percentual.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhamento */}
        {data && (
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }} />
                <span className="text-sm text-muted-foreground">
                  Total em Contas
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(data.contas)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[1] }} />
                <span className="text-sm text-muted-foreground">
                  Total em Investimentos
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(data.investimentos)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-base font-semibold text-foreground">
                Patrimônio Total
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(data.contas + data.investimentos)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
