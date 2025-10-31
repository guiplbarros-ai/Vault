'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'
import type { PatrimonioPorTipo } from '@/lib/types'

const TIPO_LABELS: Record<string, string> = {
  renda_fixa: 'Renda Fixa',
  renda_variavel: 'Renda Variável',
  fundo_investimento: 'Fundos',
  previdencia: 'Previdência',
  criptomoeda: 'Criptomoedas',
  outro: 'Outros',
}

const CHART_COLORS = ['#18B0A4', '#4ADE80', '#FCD34D', '#F59E0B', '#8B5CF6', '#EC4899']

export function PatrimonioByTypeChart() {
  const [data, setData] = useState<PatrimonioPorTipo[]>([])
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
        const result = await patrimonioService.getPatrimonioPorTipo()
        setData(result)
      } catch (error) {
        console.error('Erro ao carregar patrimônio por tipo:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: TIPO_LABELS[item.tipo] || item.tipo,
      value: item.valor_atual,
      percentual: item.rentabilidade_percentual,
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <p className="mb-2 font-semibold" style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
            {payload[0].name}
          </p>
          <p className="text-sm" style={{ color: payload[0].payload.fill }}>
            Valor: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-green-400">
            Rentabilidade: {payload[0].payload.percentual >= 0 ? '+' : ''}
            {payload[0].payload.percentual.toFixed(2)}%
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          backgroundColor: isDark ? '#3B5563' : '#FFFFFF',
        }}
      >
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : 'text-gray-900'}>
            Patrimônio por Tipo
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
      <Card
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          backgroundColor: isDark ? '#3B5563' : '#FFFFFF',
        }}
      >
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : 'text-gray-900'}>
            Patrimônio por Tipo
          </CardTitle>
          <CardDescription className={isDark ? 'text-white/70' : 'text-gray-600'}>
            Distribuição dos seus investimentos por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className={isDark ? 'text-white/70' : 'text-gray-600'}>
              Nenhum investimento cadastrado
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        backgroundColor: isDark ? '#3B5563' : '#FFFFFF',
      }}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className={isDark ? 'h-5 w-5 text-[#1AD4C4]' : 'h-5 w-5 text-[#18B0A4]'} />
          <CardTitle className={isDark ? 'text-white' : 'text-gray-900'}>
            Patrimônio por Tipo
          </CardTitle>
        </div>
        <CardDescription className={isDark ? 'text-white/70' : 'text-gray-600'}>
          Distribuição dos seus investimentos por categoria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
                color: isDark ? '#ffffff' : '#1e293b',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
