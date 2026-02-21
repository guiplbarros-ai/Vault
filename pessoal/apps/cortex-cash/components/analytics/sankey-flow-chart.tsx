'use client'

import { useSetting } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { categoriaService } from '@/lib/services/categoria.service'
import { contaService } from '@/lib/services/conta.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, startOfMonth } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CHART_THEME } from '@/lib/utils/chart-theme'
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts'

interface SankeyNode {
  name: string
}

interface SankeyLink {
  source: number
  target: number
  value: number
}

export function SankeyFlowChart() {
  const [data, setData] = useState<{ nodes: SankeyNode[]; links: SankeyLink[] }>({
    nodes: [],
    links: [],
  })
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const colors = useMemo(
    () => ({
      node: isDark ? '#e5e7eb' : '#1f2937',
      link: isDark ? '#4b5563' : '#d1d5db',
    }),
    [isDark]
  )

  useEffect(() => {
    loadSankeyData()
  }, [])

  const loadSankeyData = async () => {
    try {
      setLoading(true)

      const [transacoes, categorias, contas] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
        contaService.listContas(),
      ])

      // Filtra transações do mês atual
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      const monthTransactions = transacoes.filter((t) => {
        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        return transactionDate >= monthStart && transactionDate <= monthEnd
      })

      // Cria mapa de nós: [contas origem] -> [categorias] -> [saldo final]
      const nodeSet = new Set<string>()
      const links: SankeyLink[] = []
      const nodeToIndex = new Map<string, number>()

      // Adiciona "Receitas" como fonte
      nodeSet.add('Receitas')

      // Adiciona nós de contas
      contas.forEach((conta) => {
        nodeSet.add(`Conta: ${conta.nome}`)
      })

      // Adiciona nós de categorias de despesas
      const categoryNames = new Set<string>()
      monthTransactions
        .filter((t) => t.tipo === 'despesa')
        .forEach((t) => {
          const categoria = categorias.find((c) => c.id === t.categoria_id)
          const parentCategory = categoria?.pai_id
            ? categorias.find((c) => c.id === categoria.pai_id)
            : categoria

          const catName = parentCategory?.nome || 'Sem categoria'
          categoryNames.add(catName)
          nodeSet.add(`Categoria: ${catName}`)
        })

      // Cria índices dos nós
      Array.from(nodeSet).forEach((node, index) => {
        nodeToIndex.set(node, index)
      })

      // Cria links: Receitas -> Contas -> Categorias
      const receiptsByCategory: Record<string, number> = {}
      const receiptsByConta: Record<string, number> = {}
      const expensesByCategory: Record<string, number> = {}
      const expensesByConta: Record<string, number> = {}

      monthTransactions.forEach((t) => {
        const contaNome = contas.find((c) => c.id === t.conta_id)?.nome || 'Desconhecida'
        const valor = Math.abs(Number(t.valor) || 0)

        if (t.tipo === 'receita') {
          receiptsByConta[contaNome] = (receiptsByConta[contaNome] || 0) + valor
        } else if (t.tipo === 'despesa') {
          const categoria = categorias.find((c) => c.id === t.categoria_id)
          const parentCategory = categoria?.pai_id
            ? categorias.find((c) => c.id === categoria.pai_id)
            : categoria
          const catName = parentCategory?.nome || 'Sem categoria'

          expensesByCategory[catName] = (expensesByCategory[catName] || 0) + valor
          expensesByConta[contaNome] = (expensesByConta[contaNome] || 0) + valor
        }
      })

      // Total de receitas
      const totalReceipts = Object.values(receiptsByConta).reduce((a, b) => a + b, 0)

      // Link: Receitas -> Contas
      if (totalReceipts > 0) {
        Object.entries(receiptsByConta).forEach(([conta, valor]) => {
          const sourceIdx = nodeToIndex.get('Receitas') || 0
          const targetIdx = nodeToIndex.get(`Conta: ${conta}`)
          if (targetIdx !== undefined) {
            links.push({
              source: sourceIdx,
              target: targetIdx,
              value: Math.round(valor),
            })
          }
        })
      }

      // Link: Contas -> Categorias
      const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0)
      if (totalExpenses > 0) {
        const totalByContaCategory: Record<string, Record<string, number>> = {}

        monthTransactions
          .filter((t) => t.tipo === 'despesa')
          .forEach((t) => {
            const contaNome = contas.find((c) => c.id === t.conta_id)?.nome || 'Desconhecida'
            const categoria = categorias.find((c) => c.id === t.categoria_id)
            const parentCategory = categoria?.pai_id
              ? categorias.find((c) => c.id === categoria.pai_id)
              : categoria
            const catName = parentCategory?.nome || 'Sem categoria'
            const valor = Math.abs(Number(t.valor) || 0)

            if (!totalByContaCategory[contaNome]) {
              totalByContaCategory[contaNome] = {}
            }
            totalByContaCategory[contaNome][catName] =
              (totalByContaCategory[contaNome][catName] || 0) + valor
          })

        Object.entries(totalByContaCategory).forEach(([conta, categories]) => {
          Object.entries(categories).forEach(([categoria, valor]) => {
            const sourceIdx = nodeToIndex.get(`Conta: ${conta}`)
            const targetIdx = nodeToIndex.get(`Categoria: ${categoria}`)
            if (sourceIdx !== undefined && targetIdx !== undefined) {
              links.push({
                source: sourceIdx,
                target: targetIdx,
                value: Math.round(valor),
              })
            }
          })
        })
      }

      setData({
        nodes: Array.from(nodeSet).map((name) => ({ name })),
        links,
      })
    } catch (error) {
      console.error('Erro ao carregar Sankey:', error)
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
        <h3 className="text-lg font-semibold">Fluxo de Dinheiro</h3>
        <p className="text-sm text-muted-foreground">Receitas → Contas → Categorias de Despesa</p>
      </div>
      {data.nodes.length === 0 ? (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Sem dados para exibir</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <Sankey
            data={data}
            node={{ fill: colors.node, fillOpacity: 1 }}
            link={{ stroke: colors.link, strokeOpacity: 0.3 }}
            nodePadding={100}
            margin={{ top: 20, right: 200, bottom: 20, left: 200 }}
          >
            <Tooltip
              contentStyle={CHART_THEME.tooltip.contentStyle}
            />
          </Sankey>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

export default SankeyFlowChart
