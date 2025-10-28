'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionFilters } from '@/components/transacoes/transaction-filters'
import { TransactionsTable } from '@/components/transacoes/transactions-table'
import { useTransactions, type Transaction } from '@/lib/hooks/use-transacoes'
import { useFiltros } from '@/lib/hooks/use-filtros'

// Lazy load TransactionDetailModal (only when viewing details)
const TransactionDetailModal = dynamic(() => import('@/components/transacoes/transaction-detail-modal').then(mod => ({ default: mod.TransactionDetailModal })), {
  loading: () => null
})

export default function TransacoesPage() {
  const [page, setPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { filtros, updateFiltro, resetFiltros, hasActiveFilters, apiFilters } = useFiltros()

  // Fetch transactions with filters
  const { data, isLoading } = useTransactions({
    page,
    limit: 50,
    filters: apiFilters,
  })

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleExportCSV = () => {
    if (!data?.data || data.data.length === 0) {
      alert('Nenhuma transação para exportar')
      return
    }

    const { exportToCSV } = require('@/lib/export')
    exportToCSV(data.data)
  }

  const handleExportExcel = () => {
    if (!data?.data || data.data.length === 0) {
      alert('Nenhuma transação para exportar')
      return
    }

    const { exportToExcel } = require('@/lib/export')
    exportToExcel(data.data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-graphite-100">Transações</h1>
          <p className="text-slate-600 dark:text-graphite-300 mt-1">Visualize e gerencie suas transações financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleExportExcel} variant="secondary">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        search={filtros.search}
        contaId={filtros.contaId}
        categoriaId={filtros.categoriaId}
        tipo={filtros.tipo}
        dataInicio={filtros.dataInicio}
        dataFim={filtros.dataFim}
        onSearchChange={(value) => updateFiltro('search', value)}
        onContaChange={(value) => updateFiltro('contaId', value)}
        onCategoriaChange={(value) => updateFiltro('categoriaId', value)}
        onTipoChange={(value) => updateFiltro('tipo', value)}
        onDataInicioChange={(value) => updateFiltro('dataInicio', value)}
        onDataFimChange={(value) => updateFiltro('dataFim', value)}
        onReset={() => {
          resetFiltros()
          setPage(1)
        }}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Transações</CardTitle>
          <CardDescription>
            {data?.total || 0} transações encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable
            transactions={data?.data || []}
            total={data?.total || 0}
            page={page}
            limit={50}
            onPageChange={handlePageChange}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
