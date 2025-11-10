'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Building2 } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'
import { getChartColors } from '@/lib/constants/colors'
import type { PatrimonioPorInstituicao } from '@/lib/types'

export function PatrimonioByInstitutionChart() {
  const [data, setData] = useState<PatrimonioPorInstituicao[]>([])
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
        const result = await patrimonioService.getPatrimonioPorInstituicao()
        setData(result)
      } catch (error) {
        console.error('Erro ao carregar patrimônio por instituição:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.instituicao.nome,
      contas: item.valor_contas,
      investimentos: item.valor_investimentos,
      total: item.valor_total,
    }))
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
            {payload[0].payload.name}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="mt-2 text-sm font-semibold text-foreground">
            Total: {formatCurrency(payload[0].payload.total)}
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
            Patrimônio por Instituição
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

  if (chartData.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Patrimônio por Instituição
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Distribuição do patrimônio entre instituições financeiras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">
              Nenhuma instituição cadastrada
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
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">
            Patrimônio por Instituição
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Distribuição do patrimônio entre instituições financeiras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
            />
            <XAxis
              dataKey="name"
              className="stroke-muted-foreground"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              className="stroke-muted-foreground"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="contas"
              name="Contas"
              fill={COLORS[0]}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="investimentos"
              name="Investimentos"
              fill={COLORS[1]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
