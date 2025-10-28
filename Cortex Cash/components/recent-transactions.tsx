'use client'

import { useState, useEffect } from 'react'
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
    return Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Transações Recentes</h3>
        <p className="text-sm text-muted-foreground">Sua atividade financeira mais recente</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const categoria = transaction.categoria_id ? categorias[transaction.categoria_id] : undefined
            const isIncome = transaction.tipo === 'receita'

            return (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${isIncome ? "bg-accent/10" : "bg-muted"}`}>
                    {isIncome ? (
                      <ArrowDownRight className="h-4 w-4 text-accent" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{transaction.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoria?.nome || 'Sem categoria'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(transaction.data)}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${isIncome ? "text-accent" : "text-foreground"}`}
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
