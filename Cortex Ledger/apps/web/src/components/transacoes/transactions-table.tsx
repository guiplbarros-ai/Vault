'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/lib/hooks/use-transacoes'

interface TransactionsTableProps {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onViewDetails: (transaction: Transaction) => void
  isLoading?: boolean
}

export function TransactionsTable({
  transactions,
  total,
  page,
  limit,
  onPageChange,
  onViewDetails,
  isLoading,
}: TransactionsTableProps) {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-500">Carregando transações...</div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
        <p className="text-lg font-medium">Nenhuma transação encontrada</p>
        <p className="text-sm">Tente ajustar os filtros ou importar novos dados</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Conta
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(transaction)}
                >
                  <td className="px-4 py-3 text-sm text-neutral-900 whitespace-nowrap">
                    {formatDate(transaction.data)}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-900 max-w-md">
                    <div className="truncate">{transaction.descricao}</div>
                    {transaction.parcela_n && transaction.parcelas_total && (
                      <div className="text-xs text-neutral-500 mt-1">
                        Parcela {transaction.parcela_n}/{transaction.parcelas_total}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                    {transaction.conta?.apelido || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {transaction.categoria ? (
                      <Badge variant="primary" className="text-xs">
                        {transaction.categoria.nome}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400 text-xs">Sem categoria</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                      transaction.valor > 0
                        ? 'text-success-600'
                        : 'text-error-600'
                    }`}
                  >
                    {formatCurrency(transaction.valor)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetails(transaction)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-neutral-500">
          Mostrando {(page - 1) * limit + 1} a{' '}
          {Math.min(page * limit, total)} de {total} transações
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-3">
            <span className="text-sm text-neutral-700">
              Página {page} de {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
