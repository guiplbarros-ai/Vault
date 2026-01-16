'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Copy,
  Trash2,
  Send,
  CheckCircle,
  Factory,
  PackageCheck,
  XCircle,
  MoreVertical,
  Download,
} from 'lucide-react'
import {
  deleteQuote,
  duplicateQuote,
  updateQuoteStatus,
  type QuoteStatus,
  type QuoteWithDetails,
} from '../actions'

interface QuoteActionsProps {
  quote: QuoteWithDetails
}

const nextStatusActions: Record<QuoteStatus, { status: QuoteStatus; label: string; icon: typeof Send; color: string }[]> = {
  draft: [
    { status: 'pending', label: 'Marcar como Enviado', icon: Send, color: 'text-blue-600' },
  ],
  pending: [
    { status: 'approved', label: 'Marcar como Aprovado', icon: CheckCircle, color: 'text-green-600' },
    { status: 'cancelled', label: 'Cancelar', icon: XCircle, color: 'text-red-600' },
  ],
  approved: [
    { status: 'production', label: 'Iniciar Produção', icon: Factory, color: 'text-orange-600' },
    { status: 'cancelled', label: 'Cancelar', icon: XCircle, color: 'text-red-600' },
  ],
  production: [
    { status: 'completed', label: 'Marcar como Concluído', icon: PackageCheck, color: 'text-emerald-600' },
  ],
  completed: [],
  cancelled: [],
}

export function QuoteActions({ quote }: QuoteActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showMenu, setShowMenu] = useState(false)

  function handleStatusChange(newStatus: QuoteStatus) {
    startTransition(async () => {
      const result = await updateQuoteStatus(quote.id, newStatus)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Status atualizado com sucesso')
        router.refresh()
      }
    })
    setShowMenu(false)
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateQuote(quote.id)
      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        toast.success('Orçamento duplicado com sucesso')
        router.push(`/orcamentos/${result.data.id}`)
      }
    })
    setShowMenu(false)
  }

  function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir o orçamento "${quote.quoteNumber}"?`)) return

    startTransition(async () => {
      const result = await deleteQuote(quote.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Orçamento excluído com sucesso')
        router.push('/orcamentos')
      }
    })
    setShowMenu(false)
  }

  const statusActions = nextStatusActions[quote.status]

  return (
    <div className="flex items-center gap-2">
      {/* Primary action - next status */}
      {(() => {
        const primaryAction = statusActions[0]
        if (!primaryAction) return null
        const PrimaryIcon = primaryAction.icon
        return (
          <Button
            onClick={() => handleStatusChange(primaryAction.status)}
            disabled={isPending}
            className={primaryAction.color}
            variant="outline"
          >
            <PrimaryIcon className="mr-2 h-4 w-4" />
            {primaryAction.label}
          </Button>
        )
      })()}

      {/* PDF Download */}
      <Button
        variant="outline"
        onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, '_blank')}
        disabled={isPending}
      >
        <Download className="mr-2 h-4 w-4" />
        PDF
      </Button>

      {/* Duplicate */}
      <Button variant="outline" onClick={handleDuplicate} disabled={isPending}>
        <Copy className="mr-2 h-4 w-4" />
        Duplicar
      </Button>

      {/* More actions */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowMenu(!showMenu)}
          disabled={isPending}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className='absolute top-full right-0 z-20 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md'>
              {/* Secondary status actions */}
              {statusActions.slice(1).map((action) => {
                const ActionIcon = action.icon
                return (
                  <Button
                    key={action.status}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start ${action.color}`}
                    onClick={() => handleStatusChange(action.status)}
                    disabled={isPending}
                  >
                    <ActionIcon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Button>
                )
              })}

              {statusActions.length > 1 && <div className="my-1 h-px bg-border" />}

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Orçamento
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
