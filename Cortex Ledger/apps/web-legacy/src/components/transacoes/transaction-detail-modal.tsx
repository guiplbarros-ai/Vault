'use client'

import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { X, Calendar, Wallet, Tag, Hash, TrendingUp, CreditCard } from 'lucide-react'
import type { Transaction } from '@/lib/hooks/use-transacoes'
import { Button } from '@/components/ui/button'

interface TransactionDetailModalProps {
  transaction: Transaction | null
  isOpen: boolean
  onClose: () => void
}

export function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailModalProps) {
  if (!transaction) return null

  const isReceita = transaction.valor > 0
  const isParcelado = transaction.parcela_n && transaction.parcelas_total

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-graphite-800 text-slate-900 dark:text-graphite-100 rounded-2xl shadow-card border border-slate-200 dark:border-graphite-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-graphite-700 bg-slate-100 dark:bg-graphite-700 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-graphite-100">
              Detalhes da Transação
            </h2>
            <button
              onClick={onClose}
              className="text-slate-600 dark:text-graphite-300 hover:text-slate-900 dark:text-graphite-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Valor */}
            <div className="text-center pb-6 border-b border-slate-200 dark:border-graphite-700">
              <div className="text-sm text-slate-600 dark:text-graphite-300 mb-2">Valor</div>
              <div
                className={`text-4xl font-bold ${
                  isReceita ? 'text-success' : 'text-error-600'
                }`}
              >
                {formatCurrency(transaction.valor)}
              </div>
              {transaction.valorOriginal && transaction.moedaOriginal && (
                <div className="text-sm text-slate-600 dark:text-graphite-300 mt-2">
                  Original: {formatCurrency(transaction.valorOriginal)}{' '}
                  {transaction.moedaOriginal}
                </div>
              )}
            </div>

            {/* Grid de Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Calendar className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">Data</div>
                  <div className="text-sm text-slate-900 dark:text-graphite-100">
                    {formatDate(transaction.data, 'long')}
                  </div>
                </div>
              </div>

              {/* Conta */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Wallet className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">Conta</div>
                  <div className="text-sm text-slate-900 dark:text-graphite-100">
                    {transaction.conta?.apelido || 'N/A'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-graphite-300">
                    {transaction.conta?.tipo || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Categoria */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Tag className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">Categoria</div>
                  <div className="text-sm text-slate-900 dark:text-graphite-100">
                    {transaction.categoria ? (
                      <Badge variant="primary">
                        {transaction.categoria.grupo
                          ? `${transaction.categoria.grupo} > `
                          : ''}
                        {transaction.categoria.nome}
                      </Badge>
                    ) : (
                      <span className="text-slate-600 dark:text-graphite-300">Sem categoria</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tipo */}
              {transaction.tipo && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <TrendingUp className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">Tipo</div>
                    <div className="text-sm text-slate-900 dark:text-graphite-100">
                      <Badge
                        variant={
                          transaction.tipo === 'credito'
                            ? 'success'
                            : transaction.tipo === 'debito'
                            ? 'error'
                            : 'neutral'
                        }
                      >
                        {transaction.tipo === 'credito' ? 'Receita' : transaction.tipo === 'debito' ? 'Despesa' : transaction.tipo}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Saldo Após */}
              {transaction.saldo_apos !== null && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <TrendingUp className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                      Saldo Após
                    </div>
                    <div className="text-sm text-slate-900 dark:text-graphite-100">
                      {formatCurrency(transaction.saldo_apos)}
                    </div>
                  </div>
                </div>
              )}

              {/* Parcelamento */}
              {isParcelado && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <CreditCard className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                      Parcelamento
                    </div>
                    <div className="text-sm text-slate-900 dark:text-graphite-100">
                      Parcela {transaction.parcela_n} de {transaction.parcelas_total}
                    </div>
                  </div>
                </div>
              )}

              {/* ID Externo */}
              {transaction.idExterno && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="flex-shrink-0 mt-1">
                    <Hash className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                      ID Externo
                    </div>
                    <div className="text-xs text-slate-600 dark:text-graphite-300 font-mono">
                      {transaction.idExterno}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="border-t border-slate-200 dark:border-graphite-700 pt-4">
              <div className="text-sm font-medium text-slate-900 dark:text-graphite-100 mb-2">
                Descrição
              </div>
              <div className="text-sm text-slate-900 dark:text-graphite-100 bg-slate-100 dark:bg-graphite-700 p-3 rounded-lg">
                {transaction.descricao}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-graphite-700 flex justify-end bg-slate-100 dark:bg-graphite-700 rounded-b-2xl">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
