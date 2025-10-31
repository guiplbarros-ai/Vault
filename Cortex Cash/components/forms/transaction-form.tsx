'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { TRANSACTION_TYPE_OPTIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormTextarea, FormDatePicker, FormCurrencyInput } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2, Sparkles } from 'lucide-react'
import { useAIClassification } from '@/lib/hooks/use-ai-classification'
import { contaService } from '@/lib/services/conta.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { tagService } from '@/lib/services/tag.service'
import { mapDBAccountTypeToFormType, mapDBCategoryTypeToFormType } from '@/lib/adapters'
import { TagInput } from '@/components/ui/tag-input'
import { Label } from '@/components/ui/label'
import type { Conta, Categoria, Tag } from '@/lib/types'

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
  const [tags, setTags] = useState<Tag[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const { classify, isClassifying, suggestion, clearSuggestion } = useAIClassification()

  const methods = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date(),
      recurring: false,
      ...defaultValues,
    },
  })

  // Carrega contas, categorias e tags
  useEffect(() => {
    async function loadOptions() {
      try {
        setLoadingOptions(true)
        const [contasData, categoriasData, tagsData] = await Promise.all([
          contaService.listContas({ incluirInativas: false }),
          categoriaService.listCategorias({ ativas: true }),
          tagService.listTags({ sortBy: 'nome' }),
        ])
        setContas(contasData)
        setCategorias(categoriasData)
        setTags(tagsData)
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

  const handleAIClassify = async () => {
    const description = methods.getValues('description')
    const amount = methods.getValues('amount')
    const type = methods.getValues('type')

    if (!description || !amount) {
      return
    }

    // Mapeia tipo do form para tipo da API
    const apiType = type === 'income' ? 'receita' : 'despesa'

    await classify({
      descricao: description,
      valor: amount,
      tipo: apiType,
    })
  }

  // Aplica sugestão da IA automaticamente
  useEffect(() => {
    if (suggestion?.categoria_sugerida_id) {
      methods.setValue('categoryId', suggestion.categoria_sugerida_id)
    }
  }, [suggestion, methods])

  const watchType = methods.watch('type')
  const watchRecurring = methods.watch('recurring')
  const watchDescription = methods.watch('description')
  const watchAmount = methods.watch('amount')

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
    .map(cat => {
      // Formata nome com hierarquia se tiver pai
      const pai = cat.pai_id ? categorias.find(c => c.id === cat.pai_id) : null
      const label = pai ? `${pai.nome} > ${cat.nome}` : cat.nome
      const indent = pai ? '  ' : '' // Indentação visual para subcategorias

      return {
        value: cat.id,
        label: indent + label,
      }
    })

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

          {/* AI Classification Button */}
          {watchDescription && watchAmount && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIClassify}
                disabled={isClassifying || loadingOptions}
                className="w-full"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Classificando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Sugerir categoria com IA
                  </>
                )}
              </Button>
            </div>
          )}

          {suggestion && (
            <div className="rounded-md bg-purple-50 dark:bg-purple-950/20 p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Categoria sugerida: {suggestion.categoria_nome}
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Confiança: {Math.round(suggestion.confianca * 100)}% • {suggestion.reasoning}
                  </p>
                </div>
              </div>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (opcional)</Label>
            <TagInput
              tags={methods.watch('tags') || []}
              availableTags={tags}
              onChange={(newTags) => methods.setValue('tags', newTags)}
              placeholder="Adicione tags para organizar..."
              maxTags={5}
            />
            <p className="text-xs text-muted-foreground">
              Use tags para classificar e filtrar suas transações
            </p>
          </div>
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
