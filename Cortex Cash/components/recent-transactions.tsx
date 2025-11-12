'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSetting, useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import type { Transacao, Categoria } from '@/lib/types'

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Record<string, Categoria>>({})
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(20)
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
  }, [limit])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carrega transações com limite dinâmico
      const [transacoesData, categoriasData] = await Promise.all([
        transacaoService.listTransacoes({ sortBy: 'data', sortOrder: 'desc', limit }),
        categoriaService.listCategorias(),
      ])

      // Cria mapa de categorias para lookup rápido
      const categoriasMap = categoriasData.reduce((acc, cat) => {
        acc[cat.id] = cat
        return acc
      }, {} as Record<string, Categoria>)

      setTransactions(transacoesData)
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
    <Card className="glass-card-3d overflow-hidden">
      {/* Header com gradiente */}
      <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-card-foreground">Transações Recentes</h3>
            </div>
            <p className="text-sm text-muted-foreground">Sua atividade financeira mais recente</p>
          </div>

          {/* Seletor de quantidade */}
          <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
            <SelectTrigger className="w-[110px] h-9 bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Mostrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 itens</SelectItem>
              <SelectItem value="10">10 itens</SelectItem>
              <SelectItem value="20">20 itens</SelectItem>
              <SelectItem value="50">50 itens</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6" style={{ minHeight: '300px' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Carregando transações...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-3">
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-card-foreground mb-1">Nenhuma transação encontrada</p>
            <p className="text-xs text-muted-foreground">Adicione sua primeira transação para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => {
              const categoria = transaction.categoria_id ? categorias[transaction.categoria_id] : undefined
              const isIncome = transaction.tipo === 'receita'

              return (
                <div
                  key={transaction.id}
                  className="group relative flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/30 hover:bg-accent/50 hover:border-accent transition-all duration-200"
                >
                  {/* Linha divisória animada */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Ícone com gradiente */}
                    <div className={`relative rounded-xl p-2.5 ${
                      isIncome
                        ? "bg-gradient-to-br from-success/20 to-success/10 shadow-sm shadow-success/20"
                        : "bg-gradient-to-br from-destructive/20 to-destructive/10 shadow-sm shadow-destructive/20"
                    }`}>
                      {isIncome ? (
                        <ArrowDownRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>

                    {/* Informações da transação */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate mb-1">
                        {transaction.descricao}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium border-0 bg-muted/60 hover:bg-muted"
                        >
                          {categoria?.nome || 'Sem categoria'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(transaction.data)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="flex flex-col items-end ml-4">
                    <span
                      className={`text-base font-bold tabular-nums ${
                        isIncome ? "text-success" : "text-destructive"
                      }`}
                    >
                      {isIncome ? "+" : "-"}R$ {formatCurrency(transaction.valor)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

// ✅ Default export para dynamic import
export default RecentTransactions
