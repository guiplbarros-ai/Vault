'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

// Wizard steps
import { StepCustomer } from './steps/step-customer'
import { StepItems } from './steps/step-items'
import { StepReview } from './steps/step-review'
import { StepFinish } from './steps/step-finish'

const steps = [
  { id: 1, name: 'Cliente', description: 'Selecione o cliente' },
  { id: 2, name: 'Itens', description: 'Adicione os itens' },
  { id: 3, name: 'Revisão', description: 'Revise o orçamento' },
  { id: 4, name: 'Finalizar', description: 'Envie ao cliente' },
]

export interface QuoteData {
  customerId?: string
  customerName?: string
  rooms: QuoteRoom[]
  subtotal: number
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  discountAmount: number
  total: number
  notes?: string
  validityDays: number
  deliveryDays: number
  installationAddress?: string
}

export interface QuoteRoom {
  id: string
  name: string
  items: QuoteItem[]
}

export interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  type: 'hospitalar' | 'residencial' | 'palco' | 'fornecedor'
  width?: number
  height?: number
  ceilingHeight?: number
  includesRail?: boolean
  includesInstallation?: boolean
  curves?: number
  calculationDetails?: object
}

export default function NewQuotePage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [quoteData, setQuoteData] = useState<QuoteData>({
    rooms: [],
    subtotal: 0,
    discountAmount: 0,
    total: 0,
    validityDays: 15,
    deliveryDays: 15,
  })
  const [quoteId, setQuoteId] = useState<string | null>(null)

  function handleNext() {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  function updateQuoteData(data: Partial<QuoteData>) {
    setQuoteData((prev) => ({ ...prev, ...data }))
  }

  function handleFinish(id: string) {
    setQuoteId(id)
    setCurrentStep(4)
  }

  return (
    <>
      <Header
        title="Novo Orçamento"
        description={`Passo ${currentStep} de ${steps.length}: ${steps[currentStep - 1]?.description ?? ''}`}
      />

      <div className="p-6">
        {/* Progress Steps */}
        <nav aria-label="Progress" className="mb-8">
          <ol className="flex items-center justify-center">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={cn('relative', index !== steps.length - 1 && 'pr-8 sm:pr-20')}
              >
                {index !== steps.length - 1 && (
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-0.5 w-full',
                        currentStep > step.id ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  </div>
                )}
                <div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full',
                    currentStep > step.id
                      ? 'bg-primary'
                      : currentStep === step.id
                        ? 'border-2 border-primary bg-background'
                        : 'border-2 border-muted bg-background'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <span
                      className={cn(
                        'font-medium text-sm',
                        currentStep === step.id ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {step.id}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    '-bottom-6 -translate-x-1/2 absolute left-1/2 whitespace-nowrap text-xs',
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
              </li>
            ))}
          </ol>
        </nav>

        {/* Step Content */}
        <Card className='mx-auto mt-12 max-w-4xl'>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <StepCustomer
                quoteData={quoteData}
                updateQuoteData={updateQuoteData}
              />
            )}
            {currentStep === 2 && (
              <StepItems
                quoteData={quoteData}
                updateQuoteData={updateQuoteData}
              />
            )}
            {currentStep === 3 && (
              <StepReview
                quoteData={quoteData}
                updateQuoteData={updateQuoteData}
                onFinish={handleFinish}
              />
            )}
            {currentStep === 4 && <StepFinish quoteId={quoteId} quoteData={quoteData} />}

            {/* Navigation */}
            {currentStep < 4 && (
              <div className='mt-8 flex justify-between border-t pt-6'>
                <div>
                  {currentStep === 1 ? (
                    <Button asChild variant="outline">
                      <Link href="/orcamentos">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Cancelar
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !quoteData.customerId) ||
                    (currentStep === 2 && quoteData.rooms.length === 0)
                  }
                >
                  {currentStep === 3 ? 'Finalizar' : 'Próximo'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
