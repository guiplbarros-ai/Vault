// Quote status types and configuration - can be imported in client components
export type QuoteStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'production'
  | 'completed'
  | 'cancelled'

// Status labels and colors for UI
export const statusConfig: Record<
  QuoteStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Rascunho', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  pending: { label: 'Enviado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  approved: { label: 'Aprovado', color: 'text-green-700', bgColor: 'bg-green-100' },
  production: { label: 'Produção', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  completed: { label: 'Concluído', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100' },
}
