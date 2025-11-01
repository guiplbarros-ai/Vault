"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSetting } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2 } from 'lucide-react'
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { startOfMonth, endOfMonth } from 'date-fns'

interface ChartData {
  name: string
  value: number
  color: string
  percentage: number
  [key: string]: any  // index signature for recharts compatibility
}

// Get chart colors from CSS variables to support light/dark mode
const getChartColors = (): string[] => {
  if (typeof window === 'undefined') {
    return [
      'hsl(175 73% 39%)',
      'hsl(42 89% 50%)',
      'hsl(171 69% 50%)',
      'hsl(32 99% 45%)',
      'hsl(175 78% 27%)',
      'hsl(38 74% 45%)',
      'hsl(175 78% 21%)',
      'hsl(142 71% 40%)',
    ]
  }

  const style = getComputedStyle(document.documentElement)
  return [
    `hsl(${style.getPropertyValue('--chart-1').trim() || '175 73% 39%'})`,
    `hsl(${style.getPropertyValue('--chart-2').trim() || '42 89% 50%'})`,
    `hsl(${style.getPropertyValue('--chart-3').trim() || '171 69% 50%'})`,
    `hsl(${style.getPropertyValue('--chart-4').trim() || '32 99% 45%'})`,
    `hsl(${style.getPropertyValue('--chart-5').trim() || '175 78% 27%'})`,
    `hsl(${style.getPropertyValue('--chart-6').trim() || '38 74% 45%'})`,
    `hsl(${style.getPropertyValue('--chart-7').trim() || '175 78% 21%'})`,
    `hsl(${style.getPropertyValue('--chart-8').trim() || '142 71% 40%'})`,
  ]
}

export function ExpenseDistributionChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const COLORS = useMemo(() => getChartColors(), [])
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    loadChartData()
  }, [])

  const loadChartData = async () => {
    try {
      setLoading(true)

      // Carrega transações e categorias
      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      // Filtra transações do mês atual e apenas despesas
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      const monthExpenses = transacoes.filter(t => {
        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        return (
          transactionDate >= monthStart &&
          transactionDate <= monthEnd &&
          t.tipo === 'despesa' &&
          t.categoria_id // Ignora transações sem categoria
        )
      })

      // Agrupa por categoria PAI (nunca subcategorias)
      const categoryMap = new Map<string, number>()
      monthExpenses.forEach(t => {
        if (!t.categoria_id) return

        const categoria = categorias.find(c => c.id === t.categoria_id)
        if (!categoria) return

        // Se tem pai_id, agrupa na categoria pai; senão, usa a própria categoria
        const categoriaPrincipalId = categoria.pai_id || categoria.id

        const current = categoryMap.get(categoriaPrincipalId) || 0
        const valor = Number(t.valor) || 0
        categoryMap.set(categoriaPrincipalId, current + Math.abs(valor))
      })

      // Ordena por valor e pega TODAS as categorias com despesas
      const sorted = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])

      // Calcula total para percentual
      const total = sorted.reduce((sum, [_, value]) => sum + value, 0)

      // Mapeia para dados do gráfico (sempre categorias principais)
      const chartData = sorted.map(([categoriaId, value], index) => {
        const categoria = categorias.find(c => c.id === categoriaId)
        return {
          name: categoria?.nome || 'Sem categoria',
          value: Math.round(value),
          color: categoria?.cor || COLORS[index % COLORS.length],
          percentage: Math.round((value / total) * 100),
        }
      })

      setData(chartData)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
    index,
  }: any) => {
    const RADIAN = Math.PI / 180
    const percentValue = percent * 100

    // Tamanho de fonte progressivo baseado no percentual
    let fontSize = 9 // Base mínima
    if (percentValue >= 20) fontSize = 12
    else if (percentValue >= 10) fontSize = 11
    else if (percentValue >= 5) fontSize = 10

    // Distância reduzida: mantém as legendas mais próximas das linhas
    let radiusOffset = 18
    if (percentValue < 5) radiusOffset = 25 // Fatias pequenas um pouco mais afastadas
    else if (percentValue < 10) radiusOffset = 22

    const radius = outerRadius + radiusOffset
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const textAnchor = x > cx ? 'start' : 'end'

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? '#ffffff' : '#334155'}
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        {`${name}: ${percentValue.toFixed(0)}%`}
      </text>
    )
  }

  // Custom tooltip com melhor contraste e design compacto
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          style={{
            backgroundColor: '#4B5563', // Cinza escuro
            padding: '6px 10px',
            borderRadius: '6px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.2)',
          }}
        >
          <p style={{
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            margin: 0,
            marginBottom: '2px'
          }}>
            {data.name}
          </p>
          <p style={{
            color: '#ffffff',
            fontSize: '10px',
            margin: 0,
            opacity: 0.9
          }}>
            {formatCurrency(data.value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6 shadow-md border overflow-hidden flex flex-col h-full" style={{
      background: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      backgroundColor: isDark ? '#3B5563' : '#FFFFFF',
      minHeight: '420px'
    }}>
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-white">
          Distribuição de Despesas
        </h3>
        <p className="text-sm text-white/80">
          Todas as categorias do mês
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <Loader2 className={isDark ? "h-8 w-8 animate-spin text-white/50" : "h-8 w-8 animate-spin text-primary"} />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <p className={isDark ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>
            Nenhuma despesa encontrada
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center min-h-0">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                    strokeWidth: 1,
                  }}
                  label={renderCustomLabel}
                  outerRadius={70}
                  innerRadius={0}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
