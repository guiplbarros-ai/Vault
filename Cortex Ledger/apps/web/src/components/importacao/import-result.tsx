'use client'

import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, FileText, Calendar } from 'lucide-react'

interface ImportResultProps {
  success: boolean
  transactions?: number
  duplicates?: number
  errors?: string[]
  metadata?: {
    banco?: string
    tipo?: string
    formato?: string
    periodo?: {
      inicio?: string
      fim?: string
    }
  }
}

export function ImportResult({
  success,
  transactions = 0,
  duplicates = 0,
  errors = [],
  metadata,
}: ImportResultProps) {
  if (!success) {
    return (
      <div className="rounded-2xl border-2 border-error-600 bg-white dark:bg-graphite-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-error-600">
            <XCircle className="h-6 w-6 text-brand-contrast" />
          </div>

          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold text-error-600">
              Erro na Importação
            </h3>

            {errors.length > 0 && (
              <ul className="space-y-1">
                {errors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-error-600">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-error-600" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <div className="rounded-2xl border-2 border-success bg-white dark:bg-graphite-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-success">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1">
            <h3 className="mb-1 text-lg font-semibold text-success">
              Importação Concluída com Sucesso! 🎉
            </h3>
            <p className="text-sm text-slate-900 dark:text-graphite-100">
              Suas transações foram processadas e estão disponíveis na aba de Transações.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Transactions Imported */}
        <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-graphite-700">
              <TrendingUp className="h-5 w-5 text-slate-900 dark:text-graphite-100" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100">
                {transactions}
              </p>
              <p className="text-xs text-slate-600 dark:text-graphite-300">Transações Importadas</p>
            </div>
          </div>
        </div>

        {/* Duplicates Skipped */}
        {duplicates > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-graphite-700">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {duplicates}
                </p>
                <p className="text-xs text-slate-600 dark:text-graphite-300">Duplicadas Ignoradas</p>
              </div>
            </div>
          </div>
        )}

        {/* Total Processed */}
        <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-graphite-700">
              <FileText className="h-5 w-5 text-slate-900 dark:text-graphite-100" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100">
                {transactions + duplicates}
              </p>
              <p className="text-xs text-slate-600 dark:text-graphite-300">Total Processadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Detalhes do Arquivo
          </h4>

          <div className="grid gap-3 text-sm md:grid-cols-2">
            {metadata.banco && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-graphite-300">Banco:</span>
                <span className="font-medium text-slate-900 dark:text-graphite-100">{metadata.banco}</span>
              </div>
            )}

            {metadata.tipo && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-graphite-300">Tipo:</span>
                <span className="font-medium text-slate-900 dark:text-graphite-100">{metadata.tipo}</span>
              </div>
            )}

            {metadata.formato && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-graphite-300">Formato:</span>
                <span className="rounded bg-slate-100 dark:bg-graphite-700 px-2 py-0.5 font-mono text-xs font-medium">
                  {metadata.formato.toUpperCase()}
                </span>
              </div>
            )}

            {metadata.periodo && (metadata.periodo.inicio || metadata.periodo.fim) && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-600 dark:text-graphite-300" />
                <span className="text-slate-600 dark:text-graphite-300">Período:</span>
                <span className="font-medium text-slate-900 dark:text-graphite-100">
                  {metadata.periodo.inicio} até {metadata.periodo.fim}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
