'use client'

import type { AccountBreakdown } from '@/lib/hooks/use-report-data'

interface AccountBreakdownTableProps {
  data: AccountBreakdown[]
  isLoading?: boolean
}

export function AccountBreakdownTable({
  data,
  isLoading,
}: AccountBreakdownTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-line/25 bg-surface p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-elev" />
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded bg-elev"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-line/25 bg-surface p-6">
        <h3 className="text-lg font-semibold text-text">Despesas por Conta</h3>
        <p className="mt-4 text-center text-muted">
          Nenhuma despesa encontrada no período selecionado
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line/25 bg-surface p-6">
      <h3 className="mb-4 text-lg font-semibold text-text">Despesas por Conta</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line/20">
              <th className="pb-3 text-left text-sm font-medium text-muted">
                Conta
              </th>
              <th className="pb-3 text-left text-sm font-medium text-muted">
                Tipo
              </th>
              <th className="pb-3 text-right text-sm font-medium text-muted">
                Total
              </th>
              <th className="pb-3 text-right text-sm font-medium text-muted">
                %
              </th>
              <th className="pb-3 text-right text-sm font-medium text-muted">
                Distribuição
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item.conta}
                className="border-b border-line/20 last:border-0"
              >
                <td className="py-3">
                  <p className="font-medium text-text">{item.conta}</p>
                </td>
                <td className="py-3">
                  <span className="rounded-full bg-elev px-2 py-1 text-xs font-medium text-text">
                    {item.tipo}
                  </span>
                </td>
                <td className="py-3 text-right font-semibold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(item.total)}
                </td>
                <td className="py-3 text-right text-muted">
                  {item.percentual.toFixed(1)}%
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-elev">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
