'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileUploadZone } from '@/components/transacoes/file-upload-zone'
import { GoogleDriveImport } from '@/components/transacoes/google-drive-import'
import { TransactionFilters } from '@/components/transacoes/transaction-filters'
import { TransactionsTable } from '@/components/transacoes/transactions-table'
import { TransactionDetailModal } from '@/components/transacoes/transaction-detail-modal'
import { useTransactions, type Transaction } from '@/lib/hooks/use-transacoes'
import { useFiltros } from '@/lib/hooks/use-filtros'
import { useContas } from '@/lib/hooks/use-contas'
import {
  Upload,
  List,
  Cloud,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface ImportResult {
  success: boolean
  transactions?: number
  duplicates?: number
  errors?: string[]
  metadata?: any
}

export default function TransacoesNovaPage() {
  const [activeTab, setActiveTab] = useState('list')
  const [page, setPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Import state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedConta, setSelectedConta] = useState<string>('')
  const [selectedBanco, setSelectedBanco] = useState<string>('auto')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const { filtros, updateFiltro, resetFiltros, hasActiveFilters, apiFilters } = useFiltros()
  const { data: contasData } = useContas()

  // Fetch transactions with filters
  const { data, isLoading, refetch } = useTransactions({
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

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    setImportResult(null)
  }

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      alert('Selecione pelo menos um arquivo')
      return
    }

    if (!selectedConta) {
      alert('Selecione uma conta de destino')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('conta_id', selectedConta)
      if (selectedBanco !== 'auto') {
        formData.append('banco', selectedBanco)
      }

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      })

      const result: ImportResult = await response.json()
      setImportResult(result)

      if (result.success) {
        setSelectedFiles([])
        setSelectedConta('')
        setSelectedBanco('auto')
        // Refresh transactions list
        refetch()
        // Switch to list tab after successful import
        setTimeout(() => setActiveTab('list'), 2000)
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        errors: [error.message || 'Erro ao importar arquivos'],
      })
    } finally {
      setIsImporting(false)
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Transações</h1>
          <p className="text-muted mt-1">Importe, visualize e gerencie suas transações financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="drive" className="gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Google Drive</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Lista de Transações */}
        <TabsContent value="list" className="space-y-6">
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

          <Card>
            <CardBody className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-text">
                  Todas as Transações
                </h3>
                <p className="text-sm text-muted">
                  {data?.total || 0} transações encontradas
                </p>
              </div>

              <TransactionsTable
                transactions={data?.data || []}
                total={data?.total || 0}
                page={page}
                limit={50}
                onPageChange={handlePageChange}
                onViewDetails={handleViewDetails}
                isLoading={isLoading}
              />
            </CardBody>
          </Card>
        </TabsContent>

        {/* Tab: Upload de Arquivos */}
        <TabsContent value="upload" className="space-y-6">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            accept=".csv,.ofx,.xlsx,.xls"
            maxFiles={10}
            maxSize={20}
            disabled={isImporting}
          />

          {selectedFiles.length > 0 && (
            <Card>
              <CardBody className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Configurar Importação
                </h3>

                {/* Conta */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">
                    Conta de Destino *
                  </label>
                  <Select
                    value={selectedConta}
                    onChange={(e) => setSelectedConta(e.target.value)}
                    disabled={isImporting}
                  >
                    <option value="">Selecione a conta</option>
                    {contasData?.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.apelido || conta.tipo}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Banco */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">
                    Banco (opcional)
                  </label>
                  <Select
                    value={selectedBanco}
                    onChange={(e) => setSelectedBanco(e.target.value)}
                    disabled={isImporting}
                  >
                    <option value="auto">🤖 Detectar automaticamente</option>
                    <option value="bradesco">🏦 Bradesco</option>
                    <option value="itau">🏦 Itaú</option>
                    <option value="nubank">💜 Nubank</option>
                    <option value="c6">🏦 C6 Bank</option>
                    <option value="inter">🟠 Inter</option>
                  </Select>
                  <p className="text-xs text-muted">
                    O sistema detecta automaticamente o banco pelo conteúdo do arquivo
                  </p>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedConta || isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {selectedFiles.length} arquivo
                      {selectedFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`p-6 rounded-lg border flex items-start gap-4 ${
                importResult.success
                  ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                  : 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
              }`}
            >
              {importResult.success ? (
                <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-error-600 dark:text-error-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4
                  className={`font-semibold mb-2 ${
                    importResult.success
                      ? 'text-success-900 dark:text-success-100'
                      : 'text-error-900 dark:text-error-100'
                  }`}
                >
                  {importResult.success ? 'Importação Concluída!' : 'Erro na Importação'}
                </h4>
                {importResult.success ? (
                  <div className="space-y-1 text-sm text-success-800 dark:text-success-200">
                    <p>✅ {importResult.transactions} transações importadas</p>
                    {(importResult.duplicates ?? 0) > 0 && (
                      <p>⚠️ {importResult.duplicates} duplicadas ignoradas</p>
                    )}
                    {importResult.metadata && (
                      <div className="mt-2 text-xs">
                        <p>Banco: {importResult.metadata.banco}</p>
                        <p>Tipo: {importResult.metadata.tipo}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm text-error-800 dark:text-error-200 list-disc list-inside">
                    {importResult.errors?.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Google Drive */}
        <TabsContent value="drive" className="space-y-6">
          <GoogleDriveImport onFilesImport={handleFilesSelected} />

          {selectedFiles.length > 0 && (
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-success" />
                  <div>
                    <h4 className="font-semibold text-text">
                      Arquivos Baixados do Drive
                    </h4>
                    <p className="text-sm text-muted">
                      {selectedFiles.length} arquivo{selectedFiles.length > 1 ? 's' : ''} pronto
                      {selectedFiles.length > 1 ? 's' : ''} para importação
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted mb-4">
                  Vá para a aba <strong>Upload</strong> para configurar e importar os arquivos.
                </p>

                <Button onClick={() => setActiveTab('upload')} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Ir para Upload
                </Button>
              </CardBody>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
