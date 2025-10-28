'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { TRANSACTION_TYPE_OPTIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormTextarea, FormDatePicker, FormCurrencyInput } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { contaService } from '@/lib/services/conta.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { mapDBAccountTypeToFormType, mapDBCategoryTypeToFormType } from '@/lib/adapters'
import type { Conta, Categoria } from '@/lib/types'

export interface TransactionFormProps {
  defaultValues?: Partial<TransactionFormData>
  onSubmit: (data: TransactionFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export function TransactionForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
}: TransactionFormProps) {
  const [contas, setContas] = useState<Conta[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const methods = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date(),
      recurring: false,
      ...defaultValues,
    },
  })

  // Carrega contas e categorias
  useEffect(() => {
    async function loadOptions() {
      try {
        setLoadingOptions(true)
        const [contasData, categoriasData] = await Promise.all([
          contaService.listContas({ incluirInativas: false }),
          categoriaService.listCategorias({ ativas: true }),
        ])
        setContas(contasData)
        setCategorias(categoriasData)
      } catch (error) {
        console.error('Erro ao carregar opções:', error)
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  const handleSubmit = async (data: TransactionFormData) => {
    await onSubmit(data)
  }

  const watchType = methods.watch('type')
  const watchRecurring = methods.watch('recurring')

  // Prepara opções dos dropdowns
  const accountOptions = contas.map(conta => ({
    value: conta.id,
    label: conta.nome,
  }))

  const categoryOptions = categorias
    .filter(cat => {
      // Filtra categorias baseado no tipo selecionado
      const formType = watchType
      if (formType === 'income') return cat.tipo === 'receita'
      if (formType === 'expense') return cat.tipo === 'despesa'
      return true
    })
    .map(cat => ({
      value: cat.id,
      label: cat.nome,
    }))

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Informações Básicas</h3>
            <Separator />
          </div>

          <FormSelect
            name="type"
            label="Tipo"
            placeholder="Selecione o tipo"
            options={TRANSACTION_TYPE_OPTIONS}
            required
          />

          <FormInput
            name="description"
            label="Descrição"
            placeholder="Ex: Supermercado, Aluguel, Salário..."
            required
          />

          <FormCurrencyInput
            name="amount"
            label="Valor"
            currency="BRL"
            required
            allowNegative={watchType === 'expense'}
          />

          <FormDatePicker
            name="date"
            label="Data"
            placeholder="Selecione a data"
            required
          />
        </div>

        {/* Account and Category */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Classificação</h3>
            <Separator />
          </div>

          <FormSelect
            name="accountId"
            label="Conta"
            placeholder={loadingOptions ? "Carregando..." : "Selecione a conta"}
            options={accountOptions}
            required
            disabled={loadingOptions}
          />

          <FormSelect
            name="categoryId"
            label="Categoria"
            placeholder={loadingOptions ? "Carregando..." : "Selecione a categoria"}
            options={categoryOptions}
            required
            disabled={loadingOptions}
          />
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Informações Adicionais</h3>
            <Separator />
          </div>

          <FormTextarea
            name="notes"
            label="Observações"
            placeholder="Adicione notas ou detalhes sobre esta transação..."
            maxLength={500}
            showCount
          />

          {/* TODO: Add tags input when component is ready */}
          {/* <FormTagsInput
            name="tags"
            label="Tags"
            placeholder="Adicione tags para organizar..."
          /> */}
        </div>

        {/* Recurring (Future feature) */}
        {/* <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recorrência</h3>
            <Separator />
          </div>

          <FormCheckbox
            name="recurring"
            label="Transação recorrente"
            description="Esta transação se repete periodicamente"
          />

          {watchRecurring && (
            <FormSelect
              name="recurringPeriod"
              label="Período"
              placeholder="Selecione o período"
              options={[
                { value: 'daily', label: 'Diário' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'monthly', label: 'Mensal' },
                { value: 'yearly', label: 'Anual' },
              ]}
            />
          )}
        </div> */}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
