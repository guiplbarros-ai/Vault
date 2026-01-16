'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  PlusCircle,
  Search,
  FileText,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  User,
  Calendar,
} from 'lucide-react'
import { statusConfig } from '@/lib/constants/quote-status'
import {
  deleteQuote,
  duplicateQuote,
  updateQuoteStatus,
  type QuoteStatus,
  type QuoteWithCustomer,
} from './actions'

interface QuoteListProps {
  initialQuotes: QuoteWithCustomer[]
  initialSearch?: string
  initialStatus?: QuoteStatus
}

const statusOptions: { value: QuoteStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'pending', label: 'Enviado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'production', label: 'Produção' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

export function QuoteList({ initialQuotes, initialSearch, initialStatus }: QuoteListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch || '')
  const [status, setStatus] = useState<QuoteStatus | ''>(initialStatus || '')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (status) params.set('status', status)
    router.push(`/orcamentos${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function handleStatusFilter(newStatus: QuoteStatus | '') {
    setStatus(newStatus)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (newStatus) params.set('status', newStatus)
    router.push(`/orcamentos${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function handleDelete(id: string, quoteNumber: string) {
    if (!confirm(`Tem certeza que deseja excluir o orçamento "${quoteNumber}"?`)) return

    startTransition(async () => {
      const result = await deleteQuote(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Orçamento excluído com sucesso')
        router.refresh()
      }
    })
    setOpenMenuId(null)
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateQuote(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Orçamento duplicado com sucesso')
        router.refresh()
      }
    })
    setOpenMenuId(null)
  }

  function handleStatusChange(id: string, newStatus: QuoteStatus) {
    startTransition(async () => {
      const result = await updateQuoteStatus(id, newStatus)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Status atualizado com sucesso')
        router.refresh()
      }
    })
    setOpenMenuId(null)
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <form onSubmit={handleSearch} className='relative min-w-[200px] max-w-md flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder="Buscar por cliente ou número..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      {/* Status Filter */}
      <div className='flex flex-wrap gap-2'>
        {statusOptions.map((option) => (
          <Button
            key={option.value || 'all'}
            variant={status === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Quote List */}
      {initialQuotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className='py-8 text-center text-muted-foreground'>
              <FileText className='mx-auto mb-4 h-12 w-12 opacity-50' />
              {initialSearch || initialStatus ? (
                <>
                  <p className='font-medium text-lg'>Nenhum orçamento encontrado</p>
                  <p className="text-sm">Tente buscar por outro termo ou filtro</p>
                </>
              ) : (
                <>
                  <p className='font-medium text-lg'>Nenhum orçamento ainda</p>
                  <p className="text-sm">Crie seu primeiro orçamento para começar</p>
                </>
              )}
              <Button asChild className="mt-4">
                <Link href="/orcamentos/novo">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Orçamento
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {initialQuotes.map((quote) => {
            const config = statusConfig[quote.status]
            return (
              <Card key={quote.id} className='transition-colors hover:bg-muted/50'>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className='flex-1 space-y-2'>
                      <div className='flex flex-wrap items-center gap-3'>
                        <h3 className="font-semibold text-lg">{quote.quoteNumber}</h3>
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </div>

                      <div className='flex flex-wrap gap-4 text-muted-foreground text-sm'>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {quote.customer.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(quote.createdAt)}
                        </span>
                        {quote.validUntil && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Válido até {formatDate(quote.validUntil)}
                          </span>
                        )}
                      </div>

                      <div className='font-semibold text-lg text-primary'>
                        {formatCurrency(Number(quote.total))}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenMenuId(openMenuId === quote.id ? null : quote.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {openMenuId === quote.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className='absolute top-full right-0 z-20 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md'>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              asChild
                            >
                              <Link href={`/orcamentos/${quote.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => handleDuplicate(quote.id)}
                              disabled={isPending}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </Button>

                            {/* Status actions */}
                            {quote.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-blue-600 hover:text-blue-600"
                                onClick={() => handleStatusChange(quote.id, 'pending')}
                                disabled={isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Marcar como Enviado
                              </Button>
                            )}

                            {quote.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-green-600 hover:text-green-600"
                                onClick={() => handleStatusChange(quote.id, 'approved')}
                                disabled={isPending}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como Aprovado
                              </Button>
                            )}

                            <div className="my-1 h-px bg-border" />

                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-destructive hover:text-destructive"
                              onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                              disabled={isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Results count */}
      {initialQuotes.length > 0 && (
        <p className='text-center text-muted-foreground text-sm'>
          {initialQuotes.length} orçamento{initialQuotes.length !== 1 ? 's' : ''}{' '}
          {initialSearch || initialStatus ? 'encontrado' : ''}
          {initialQuotes.length !== 1 && (initialSearch || initialStatus) ? 's' : ''}
        </p>
      )}
    </div>
  )
}
