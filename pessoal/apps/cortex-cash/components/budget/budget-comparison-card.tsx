'use client'

import { useSetting } from '@/app/providers/settings-provider'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { getChartColors } from '@/lib/constants/colors'
import { orcamentoService } from '@/lib/services/orcamento.service'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ComparisonData {
  category: string
  planejado: number
  realizado: number
  restante: number
}

interface BudgetComparisonCardProps {
  mesReferencia: string
}

export function BudgetComparisonCard({ mesReferencia }: BudgetComparisonCardProps) {
  const [data, setData] = useState<ComparisonData[]>([])
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')
  const { formatCurrency } = useLocalizationSettings()

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const COLORS = useMemo(() => getChartColors(), [isDark, theme])

  useEffect(() => {
    loadComparisonData()
  }, [mesReferencia])

  const loadComparisonData = async () => {
    try {
      setLoading(true)

      const orcamentos = await orcamentoService.listOrcamentosComProgresso({ mesReferencia })

      // Agrupa por categoria
      const categoryMap = new Map<string, { planejado: number; realizado: number }>()

      orcamentos.forEach((o) => {
        const key =
          o.tipo === 'categoria' ? `Cat: ${o.categoria_nome || 'Desconhecida'}` : `CC: ${o.nome}`
        const existing = categoryMap.get(key) || { planejado: 0, realizado: 0 }

        categoryMap.set(key, {
          planejado: existing.planejado + (o.valor_planejado || 0),
          realizado: existing.realizado + (o.valor_realizado || 0),
        })
      })

      // Converte para array e calcula restante
      const chartData = Array.from(categoryMap).map(([category, values]) => ({
        category,
        planejado: values.planejado,
        realizado: values.realizado,
        restante: Math.max(0, values.planejado - values.realizado),
      }))

      setData(chartData)
    } catch (error) {
      console.error('Erro ao carregar comparação de orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Comparativo: Orçado vs Realizado</h3>
        <p className="text-sm text-muted-foreground">
          Visualize o orçamento planejado vs gasto realizado
        </p>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Sem orçamentos registrados</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="category"
              angle={-45}
              textAnchor="end"
              height={120}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend />
            <Bar dataKey="planejado" fill={COLORS[0]} name="Planejado" />
            <Bar dataKey="realizado" fill={COLORS[1]} name="Realizado" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

export default BudgetComparisonCard
