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

      // Carrega transações e categorias
      const [transacoesData, categoriasData] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      // Ordena por data decrescente e pega as 5 mais recentes
      const sortedTransactions = transacoesData.sort((a, b) => {
        const dateA = a.data instanceof Date ? a.data : new Date(a.data)
        const dateB = b.data instanceof Date ? b.data : new Date(b.data)
        return dateB.getTime() - dateA.getTime()
      }).slice(0, 5)

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
    <Card className="p-6 shadow-md border" style={{
      background: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
    }}>
      <div className="mb-6">
        <h3 className={isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-foreground"}>Transações Recentes</h3>
        <p className={isDark ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>Sua atividade financeira mais recente</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className={isDark ? "h-8 w-8 animate-spin text-white/50" : "h-8 w-8 animate-spin text-muted-foreground"} />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className={isDark ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>Nenhuma transação encontrada</p>
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
                    isDark
                      ? (isIncome ? "bg-white/15" : "bg-white/10")
                      : (isIncome ? "bg-accent/10" : "bg-muted")
                  }`}>
                    {isIncome ? (
                      <ArrowDownRight className={isDark ? "h-4 w-4 text-green-400" : "h-4 w-4 text-accent"} />
                    ) : (
                      <ArrowUpRight className={isDark ? "h-4 w-4 text-white/70" : "h-4 w-4 text-muted-foreground"} />
                    )}
                  </div>
                  <div>
                    <p className={isDark ? "text-sm font-medium text-white" : "text-sm font-medium text-foreground"}>{transaction.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={isDark ? "text-xs bg-white/20 text-white border-0" : "text-xs"}>
                        {categoria?.nome || 'Sem categoria'}
                      </Badge>
                      <span className={isDark ? "text-xs text-white/60" : "text-xs text-muted-foreground"}>{formatDate(transaction.data)}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isDark
                      ? (isIncome ? "text-green-400" : "text-white")
                      : (isIncome ? "text-accent" : "text-foreground")
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
