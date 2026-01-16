import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, Clock } from 'lucide-react'
import { fetchQuote } from '../actions'
import { statusConfig } from '@/lib/constants/quote-status'
import { QuoteActions } from './quote-actions'

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params
  const { data: quote, error } = await fetchQuote(id)

  if (error || !quote) {
    notFound()
  }

  const config = statusConfig[quote.status]

  return (
    <>
      <Header
        title={`Orçamento ${quote.quoteNumber}`}
        description={`${quote.customer.name} • ${formatDate(quote.createdAt)}`}
      />

      <div className='space-y-6 p-6'>
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/orcamentos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <QuoteActions quote={quote} />
        </div>

        {/* Quote header info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Status and dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className='text-muted-foreground text-sm'>Status</span>
                <Badge className={`${config.bgColor} ${config.color} border-0`}>
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className='flex items-center gap-1 text-muted-foreground text-sm'>
                  <Calendar className="h-3.5 w-3.5" />
                  Criado em
                </span>
                <span className='font-medium text-sm'>{formatDate(quote.createdAt)}</span>
              </div>
              {quote.validUntil && (
                <div className="flex items-center justify-between">
                  <span className='flex items-center gap-1 text-muted-foreground text-sm'>
                    <Clock className="h-3.5 w-3.5" />
                    Válido até
                  </span>
                  <span className='font-medium text-sm'>{formatDate(quote.validUntil)}</span>
                </div>
              )}
              {quote.deliveryDays && (
                <div className="flex items-center justify-between">
                  <span className='text-muted-foreground text-sm'>Prazo de entrega</span>
                  <span className='font-medium text-sm'>{quote.deliveryDays} dias</span>
                </div>
              )}
              {quote.sentAt && (
                <div className="flex items-center justify-between">
                  <span className='text-muted-foreground text-sm'>Enviado em</span>
                  <span className='font-medium text-sm'>{formatDate(quote.sentAt)}</span>
                </div>
              )}
              {quote.approvedAt && (
                <div className="flex items-center justify-between">
                  <span className='text-muted-foreground text-sm'>Aprovado em</span>
                  <span className='font-medium text-sm'>{formatDate(quote.approvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className='flex items-center gap-2 text-base'>
                <User className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">{quote.customer.name}</span>
              </div>
              {quote.customer.phone && (
                <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                  <Phone className="h-3.5 w-3.5" />
                  {quote.customer.phone}
                </div>
              )}
              {quote.customer.email && (
                <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                  <Mail className="h-3.5 w-3.5" />
                  {quote.customer.email}
                </div>
              )}
              {quote.customer.address && (
                <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                  <MapPin className="h-3.5 w-3.5" />
                  {quote.customer.address}
                </div>
              )}
              {quote.installationAddress && quote.installationAddress !== quote.customer.address && (
                <div className='border-t pt-2'>
                  <span className='text-muted-foreground text-xs'>Endereço de instalação:</span>
                  <div className='mt-1 flex items-center gap-2 text-sm'>
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {quote.installationAddress}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items by room */}
        <Card>
          <CardHeader>
            <CardTitle>Itens do Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.rooms.length === 0 ? (
              <p className='py-4 text-center text-muted-foreground'>
                Nenhum item adicionado
              </p>
            ) : (
              <div className="space-y-6">
                {quote.rooms.map((room) => (
                  <div key={room.id}>
                    <h4 className='mb-3 font-medium text-muted-foreground text-sm'>
                      {room.name}
                    </h4>
                    <div className="space-y-2">
                      {room.items.map((item) => (
                        <div
                          key={item.id}
                          className='flex items-center justify-between border-b py-2 last:border-0'
                        >
                          <div className="flex-1">
                            <span className="font-medium">{item.description}</span>
                            <div className='text-muted-foreground text-sm'>
                              {item.quantity} x {formatCurrency(Number(item.unitPrice))}
                              {item.width && item.height && (
                                <span className="ml-2">
                                  ({item.width}m x {item.height}m)
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(Number(item.total))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(quote.subtotal))}</span>
              </div>
              {Number(quote.discountAmount) > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span>
                    Desconto
                    {quote.discountType === 'percentage' && quote.discountValue && (
                      <span className='ml-1 text-sm'>({quote.discountValue}%)</span>
                    )}
                  </span>
                  <span>-{formatCurrency(Number(quote.discountAmount))}</span>
                </div>
              )}
              <div className='flex items-center justify-between border-t pt-2 font-semibold text-lg'>
                <span>Total</span>
                <span className="text-primary">{formatCurrency(Number(quote.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='whitespace-pre-wrap text-sm'>{quote.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
