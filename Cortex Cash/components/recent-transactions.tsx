'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSetting, useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import type { Transacao, Categoria } from '@/lib/types'

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Record<string, Categoria>>({})
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')
  const { formatCurrency: formatCurrencyWithSettings } = useLocalizationSettings()

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carrega transações (apenas as 5 mais recentes via índice) e categorias
      const [transacoesData, categoriasData] = await Promise.all([
        transacaoService.listTransacoes({ sortBy: 'data', sortOrder: 'desc', limit: 5 }),
        categoriaService.listCategorias(),
      ])

      // Já recebemos as 5 mais recentes
      const sortedTransactions = transacoesData

      // Cria mapa de categorias para lookup rápido
      const categoriasMap = categoriasData.reduce((acc, cat) => {
        acc[cat.id] = cat
        return acc
      }, {} as Record<string, Categoria>)

      setTransactions(sortedTransactions)
      setCategorias(categoriasMap)
    } catch (error) {
      console.error('Erro ao carregar transações recentes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatCurrency = (value: number) => {
    // Retorna apenas o valor numérico formatado (sem símbolo R$)
    const formatted = formatCurrencyWithSettings(Math.abs(value))
    return formatted.replace('R$', '').trim()
  }

  return (
    <Card className="glass-card-3d p-6" style={{ minHeight: '420px' }}>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-card-foreground">Transações Recentes</h3>
        <p className="text-sm text-secondary">Sua atividade financeira mais recente</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-secondary">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const categoria = transaction.categoria_id ? categorias[transaction.categoria_id] : undefined
            const isIncome = transaction.tipo === 'receita'

            return (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${
                    isIncome ? "bg-success/15" : "bg-destructive/15"
                  }`}>
                    {isIncome ? (
                      <ArrowDownRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{transaction.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs border-0">
                        {categoria?.nome || 'Sem categoria'}
                      </Badge>
                      <span className="text-xs text-secondary">{formatDate(transaction.data)}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isIncome ? "text-success" : "text-destructive"
                  }`}
                >
                  {isIncome ? "+" : ""}
                  R$ {formatCurrency(transaction.valor)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ✅ Default export para dynamic import
export default RecentTransactions
