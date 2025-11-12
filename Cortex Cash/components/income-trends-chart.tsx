"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSetting } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Loader2 } from 'lucide-react'
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getChartColors, THEME_COLORS } from '@/lib/constants/colors'

interface MonthData {
  month: string
  [key: string]: number | string
}

export function IncomeTrendsChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
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

      console.log('[IncomeTrendsChart] ========== INÍCIO ==========')
      console.log('[IncomeTrendsChart] Total de transações:', transacoes.length)
      console.log('[IncomeTrendsChart] Total de categorias:', categorias.length)

      // Encontra as top 3 categorias de receita (últimos 6 meses)
      const now = new Date()
      const sixMonthsAgo = subMonths(now, 6)

      console.log('[IncomeTrendsChart] Período:', sixMonthsAgo.toLocaleDateString(), 'até', now.toLocaleDateString())

      const recentIncome = transacoes.filter(t => {
        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        const isReceita = t.tipo === 'receita'
        const inPeriod = transactionDate >= sixMonthsAgo
        if (isReceita) {
          console.log('[IncomeTrendsChart] Receita encontrada:', {
            descricao: t.descricao,
            valor: t.valor,
            data: transactionDate.toLocaleDateString(),
            categoria_id: t.categoria_id,
            inPeriod
          })
        }
        return inPeriod && isReceita
      })

      console.log('[IncomeTrendsChart] Receitas dos últimos 6 meses:', recentIncome.length)

      // Agrupa por categoria para encontrar as top 3
      const categoryTotals = new Map<string, number>()
      recentIncome.forEach(t => {
        // Se não tem categoria, agrupa como "sem-categoria"
        const catId = t.categoria_id || 'sem-categoria'
        const current = categoryTotals.get(catId) || 0
        const valor = Number(t.valor) || 0
        categoryTotals.set(catId, current + Math.abs(valor))
      })

      const topCategories = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id)

      console.log('[IncomeTrendsChart] Top 3 categorias de receita:', topCategories.map(id => {
        const cat = categorias.find(c => c.id === id)
        return `${cat?.nome} (R$ ${categoryTotals.get(id)?.toFixed(2)})`
      }))

      // Mapeia nomes e cores
      const names: string[] = []
      const colors: Record<string, string> = {}

      topCategories.forEach((catId, index) => {
        if (catId === 'sem-categoria') {
          names.push('Sem Categoria')
          colors['Sem Categoria'] = COLORS[index]
        } else {
          const categoria = categorias.find(c => c.id === catId)
          const name = categoria?.nome || 'Sem categoria'
          names.push(name)
          colors[name] = categoria?.cor || COLORS[index]
        }
      })

      setCategoryNames(names)
      setCategoryColors(colors)

      // Cria dados por mês
      const months: MonthData[] = []

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)

        const monthData: MonthData = {
          month: format(monthDate, 'MMM', { locale: ptBR }),
        }

        // Para cada categoria top, calcula a receita do mês
        topCategories.forEach((catId) => {
          const categoria = catId === 'sem-categoria' ? null : categorias.find(c => c.id === catId)
          const categoryName = categoria?.nome || 'Sem Categoria'

          const monthCategoryIncome = transacoes.filter(t => {
            const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
            const matchesCategory = catId === 'sem-categoria'
              ? !t.categoria_id
              : t.categoria_id === catId

            return (
              transactionDate >= monthStart &&
              transactionDate <= monthEnd &&
              t.tipo === 'receita' &&
              matchesCategory
            )
          })

          const total = monthCategoryIncome.reduce((sum, t) => {
            const valor = Number(t.valor) || 0
            return sum + Math.abs(valor)
          }, 0)
          monthData[categoryName] = Math.round(total)
        })

        months.push(monthData)
      }

      console.log('[IncomeTrendsChart] Dados dos 6 meses:', months)

      setData(months)
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'rgba(18, 50, 44, 0.99)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `2px solid ${THEME_COLORS.border}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          }}
        >
          <p style={{ color: THEME_COLORS.fgPrimary, fontWeight: 600, marginBottom: '10px', fontSize: '13px' }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: '12px', color: entry.color, marginBottom: '4px', fontWeight: 500 }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="glass-card-3d p-6 flex flex-col h-full" style={{
      minHeight: '420px'
    }}>
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-foreground">Evolução de Receitas</h3>
        <p className="text-sm text-secondary">Top 3 categorias (Últimos 6 meses)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : data.length === 0 || categoryNames.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <p className="text-sm text-secondary">Nenhuma receita encontrada</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={THEME_COLORS.border}
                vertical={true}
                horizontal={true}
              />
            <XAxis
              dataKey="month"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: THEME_COLORS.fgSecondary }}
            />
            <YAxis
              fontSize={12}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: THEME_COLORS.fgSecondary }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: THEME_COLORS.hover, opacity: 0.3 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '15px',
                color: THEME_COLORS.fgPrimary
              }}
              iconType="line"
              formatter={(value: string) => (
                <span style={{ color: THEME_COLORS.fgPrimary }}>{value}</span>
              )}
            />
            {categoryNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={categoryColors[name]}
                strokeWidth={3}
                dot={{ fill: categoryColors[name], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// ✅ Default export para dynamic import
export default IncomeTrendsChart
