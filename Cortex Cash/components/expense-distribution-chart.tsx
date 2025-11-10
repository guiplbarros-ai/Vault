"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSetting } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2 } from 'lucide-react'
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getChartColors } from '@/lib/constants/colors'

interface ChartData {
  name: string
  value: number
  color: string
  percentage: number
  [key: string]: any  // index signature for recharts compatibility
}

// ✅ Named export
export function ExpenseDistributionChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  // ✅ Corrigir useMemo para atualizar cores quando tema mudar
  const COLORS = useMemo(() => getChartColors(), [isDark, theme])

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
        className="fill-foreground"
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

  // Custom tooltip com melhor contraste e design compacto (TEMA.md)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          style={{
            backgroundColor: '#142A25',
            border: '1px solid #2A4942',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            boxShadow: 'var(--shadow-2)',
          }}
        >
          <p style={{ color: '#F2F7F5', fontSize: '11px', fontWeight: 600, margin: 0, marginBottom: '2px' }}>
            {data.name}
          </p>
          <p style={{ color: '#B2BDB9', fontSize: '10px', margin: 0 }}>
            {formatCurrency(data.value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card
      className="p-6 overflow-hidden flex flex-col h-full"
      style={{
        minHeight: '420px',
        backgroundColor: '#18322C',
        borderColor: '#2A4942',
        borderWidth: '1px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-1)',
      }}
    >
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold" style={{ color: '#F2F7F5' }}>
          Distribuição de Despesas
        </h3>
        <p className="text-sm" style={{ color: '#B2BDB9' }}>
          Todas as categorias do mês
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <p className="text-sm text-secondary">
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
                    className: "stroke-border",
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

// ✅ Default export para dynamic import
export default ExpenseDistributionChart
