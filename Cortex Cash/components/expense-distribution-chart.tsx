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
          t.tipo === 'despesa'
        )
      })

      // Agrupa por categoria PAI (nunca subcategorias)
      const categoryMap = new Map<string, number>()
      monthExpenses.forEach(t => {
        let categoriaPrincipalId: string

        if (!t.categoria_id) {
          // Transações sem categoria
          categoriaPrincipalId = 'sem-categoria'
        } else {
          const categoria = categorias.find(c => c.id === t.categoria_id)
          if (!categoria) {
            categoriaPrincipalId = 'sem-categoria'
          } else {
            // Se tem pai_id, agrupa na categoria pai; senão, usa a própria categoria
            categoriaPrincipalId = categoria.pai_id || categoria.id
          }
        }

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
        if (categoriaId === 'sem-categoria') {
          return {
            name: 'Sem Categoria',
            value: Math.round(value),
            color: COLORS[index % COLORS.length],
            percentage: Math.round((value / total) * 100),
          }
        }

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

    // Oculta labels de fatias muito pequenas (< 3%) para evitar poluição visual
    if (percentValue < 3) return null

    // Tamanho de fonte progressivo baseado no percentual
    let fontSize = 10 // Base mínima
    if (percentValue >= 20) fontSize = 13
    else if (percentValue >= 10) fontSize = 12
    else if (percentValue >= 5) fontSize = 11

    // Distância otimizada: balanceia proximidade e legibilidade
    let radiusOffset = 25
    if (percentValue < 5) radiusOffset = 30 // Fatias pequenas mais afastadas
    else if (percentValue < 10) radiusOffset = 28
    else if (percentValue >= 20) radiusOffset = 22 // Fatias grandes mais próximas

    const radius = outerRadius + radiusOffset
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const textAnchor = x > cx ? 'start' : 'end'

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF" // Branco puro para máximo contraste
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 700, // Extra bold para melhor legibilidade
          pointerEvents: 'none',
          textShadow: '0px 1px 3px rgba(0, 0, 0, 0.8), 0px 0px 8px rgba(0, 0, 0, 0.6)', // Sombra para contraste em fundos claros
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
            backgroundColor: 'rgba(18, 50, 44, 0.99)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `2px solid hsl(var(--border))`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          }}
        >
          <p style={{ color: 'hsl(var(--fg-primary))', fontSize: '12px', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
            {data.name}
          </p>
          <p style={{ color: 'hsl(var(--fg-secondary))', fontSize: '11px', margin: 0 }}>
            {formatCurrency(data.value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card
      className="glass-card-3d p-6 overflow-hidden flex flex-col h-full"
      style={{
        minHeight: '420px',
      }}
    >
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-foreground">
          Distribuição de Despesas
        </h3>
        <p className="text-sm text-secondary">
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
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: "#FFFFFF", // Linhas brancas para máxima visibilidade
                    strokeWidth: 2, // Mais grossas para melhor clareza
                    strokeOpacity: 0.8,
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
