'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { CheckCircle, Download, MessageCircle, Mail, Printer, PlusCircle, Eye, List } from 'lucide-react'
import type { QuoteData } from '../page'

interface StepFinishProps {
  quoteId: string | null
  quoteData: QuoteData
  quoteNumber?: string
}

export function StepFinish({ quoteId, quoteData }: StepFinishProps) {
  function handleDownloadPDF() {
    if (!quoteId) {
      toast.error('ID do orçamento não encontrado')
      return
    }

    // Open PDF in new tab (will trigger download)
    window.open(`/api/quotes/${quoteId}/pdf`, '_blank')
    toast.success('PDF gerado com sucesso!')
  }

  function handleWhatsApp() {
    // Generate WhatsApp message
    const message = encodeURIComponent(
      `Olá! Segue o orçamento da Cortihouse:\n\nCliente: ${quoteData.customerName}\nValor: ${formatCurrency(quoteData.total)}\nValidade: ${quoteData.validityDays} dias\n\nPara mais detalhes, entre em contato conosco.`
    )

    // Open WhatsApp with message
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  function handleEmail() {
    // Generate email with basic info
    const subject = encodeURIComponent(`Orçamento Cortihouse - ${quoteData.customerName}`)
    const body = encodeURIComponent(
      `Prezado(a) ${quoteData.customerName},\n\nSegue em anexo o orçamento solicitado.\n\nValor Total: ${formatCurrency(quoteData.total)}\nValidade: ${quoteData.validityDays} dias\nPrazo de Entrega: ${quoteData.deliveryDays} dias úteis\n\nAtenciosamente,\nCortihouse Cortinas`
    )

    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  function handlePrint() {
    if (!quoteId) {
      toast.error('ID do orçamento não encontrado')
      return
    }

    // Open PDF for printing
    const printWindow = window.open(`/api/quotes/${quoteId}/pdf`, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className='flex h-20 w-20 items-center justify-center rounded-full bg-green-100'>
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className='font-bold text-2xl text-green-600'>Orçamento Criado!</h2>
        <p className='mt-2 text-muted-foreground'>
          Proposta Nº {quoteId?.slice(-6).toUpperCase() || '---'}
        </p>
      </div>

      {/* Quote Summary */}
      <div className="rounded-lg bg-muted p-6">
        <p className='text-muted-foreground text-sm'>Cliente</p>
        <p className="font-medium text-lg">{quoteData.customerName}</p>
        <div className="my-4 border-t" />
        <p className='text-muted-foreground text-sm'>Valor Total</p>
        <p className='font-bold text-3xl'>{formatCurrency(quoteData.total)}</p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <p className='mb-4 text-muted-foreground text-sm'>O que deseja fazer agora?</p>

        <Button
          size="lg"
          className='h-14 w-full text-base'
          onClick={handleDownloadPDF}
        >
          <Download className="mr-3 h-5 w-5" />
          Baixar PDF
        </Button>

        <Button
          size="lg"
          variant="outline"
          className='h-14 w-full border-green-200 bg-green-50 text-base text-green-700 hover:bg-green-100 hover:text-green-800'
          onClick={handleWhatsApp}
        >
          <MessageCircle className="mr-3 h-5 w-5" />
          Enviar por WhatsApp
        </Button>

        <Button
          size="lg"
          variant="outline"
          className='h-14 w-full text-base'
          onClick={handleEmail}
        >
          <Mail className="mr-3 h-5 w-5" />
          Enviar por Email
        </Button>

        <Button
          size="lg"
          variant="outline"
          className='h-14 w-full text-base'
          onClick={handlePrint}
        >
          <Printer className="mr-3 h-5 w-5" />
          Imprimir
        </Button>
      </div>

      {/* Navigation */}
      <div className='space-y-3 border-t pt-4'>
        {quoteId && (
          <Button asChild size="lg" variant="outline" className='h-12 w-full'>
            <Link href={`/orcamentos/${quoteId}`}>
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalhes do Orçamento
            </Link>
          </Button>
        )}
        <div className="flex gap-4">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/orcamentos/novo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Outro
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/orcamentos">
              <List className="mr-2 h-4 w-4" />
              Ver Todos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
