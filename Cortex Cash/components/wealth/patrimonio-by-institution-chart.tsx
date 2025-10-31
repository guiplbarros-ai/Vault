'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Building2 } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'
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
            {payload[0].payload.name}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="mt-2 text-sm font-semibold" style={{ color: isDark ? '#ffffff' : '#1e293b' }}>
            Total: {formatCurrency(payload[0].payload.total)}
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
            Patrimônio por Instituição
          </CardTitle>
          <CardDescription className={isDark ? 'text-white/70' : 'text-gray-600'}>
            Distribuição do patrimônio entre instituições financeiras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className={isDark ? 'text-white/70' : 'text-gray-600'}>
              Nenhuma instituição cadastrada
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
          <Building2 className={isDark ? 'h-5 w-5 text-[#1AD4C4]' : 'h-5 w-5 text-[#18B0A4]'} />
          <CardTitle className={isDark ? 'text-white' : 'text-gray-900'}>
            Patrimônio por Instituição
          </CardTitle>
        </div>
        <CardDescription className={isDark ? 'text-white/70' : 'text-gray-600'}>
          Distribuição do patrimônio entre instituições financeiras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            />
            <XAxis
              dataKey="name"
              stroke={isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
                color: isDark ? '#ffffff' : '#1e293b',
              }}
            />
            <Bar
              dataKey="contas"
              name="Contas"
              fill={isDark ? '#4ADE80' : '#22C55E'}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="investimentos"
              name="Investimentos"
              fill={isDark ? '#FCD34D' : '#F59E0B'}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
