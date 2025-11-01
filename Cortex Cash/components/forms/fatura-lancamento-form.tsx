'use client'

import * as React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { faturaLancamentoSchema, FaturaLancamentoFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormCurrencyInput, FormDatePicker, FormCheckbox } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2, DollarSign, Calendar, Hash } from 'lucide-react'
import { categoriaService } from '@/lib/services/categoria.service'
import type { Categoria } from '@/lib/types'

export interface FaturaLancamentoFormProps {
  faturaId: string
  defaultValues?: Partial<FaturaLancamentoFormData>
  onSubmit: (data: FaturaLancamentoFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

const MOEDAS = [
  { value: 'BRL', label: '🇧🇷 Real (BRL)' },
  { value: 'USD', label: '🇺🇸 Dólar (USD)' },
  { value: 'EUR', label: '🇪🇺 Euro (EUR)' },
  { value: 'GBP', label: '🇬🇧 Libra (GBP)' },
  { value: 'ARS', label: '🇦🇷 Peso Argentino (ARS)' },
  { value: 'CLP', label: '🇨🇱 Peso Chileno (CLP)' },
]

export function FaturaLancamentoForm({
  faturaId,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar Lançamento',
}: FaturaLancamentoFormProps) {
  const [categorias, setCategorias] = React.useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = React.useState(true)
  const [isParcelado, setIsParcelado] = React.useState(false)
  const [isCompraExterior, setIsCompraExterior] = React.useState(false)

  const methods = useForm<FaturaLancamentoFormData>({
    resolver: zodResolver(faturaLancamentoSchema),
    defaultValues: {
      fatura_id: faturaId,
      descricao: '',
      valor_brl: 0,
      data_compra: new Date(),
      ...defaultValues,
    },
  })

  // Carregar categorias
  React.useEffect(() => {
    loadCategorias()
  }, [])

  // Calcular valor BRL automaticamente quando houver câmbio
  React.useEffect(() => {
    if (isCompraExterior) {
      const subscription = methods.watch((value, { name }) => {
        if (name === 'valor_original' || name === 'taxa_cambio') {
          const valorOriginal = value.valor_original || 0
          const taxaCambio = value.taxa_cambio || 0

          if (valorOriginal > 0 && taxaCambio > 0) {
            const valorBrl = valorOriginal * taxaCambio
            methods.setValue('valor_brl', valorBrl)
          }
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [isCompraExterior, methods])

  const loadCategorias = async () => {
    try {
      setLoadingCategorias(true)
      const data = await categoriaService.listCategorias({
        tipo: 'despesa', // Lançamentos de cartão são sempre despesas
        ativas: true,
        sortBy: 'nome',
        sortOrder: 'asc',
      })
      setCategorias(data)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoadingCategorias(false)
    }
  }

  const handleSubmit = methods.handleSubmit(
    async (data: FaturaLancamentoFormData) => {
      console.log('[FaturaLancamentoForm] Validação passou! Dados:', data)

      // Limpar campos de parcelamento se não estiver parcelado
      if (!isParcelado) {
        data.parcela_numero = undefined
        data.parcela_total = undefined
      }

      // Limpar campos de câmbio se não for compra exterior
      if (!isCompraExterior) {
        data.moeda_original = undefined
        data.valor_original = undefined
        data.taxa_cambio = undefined
      }

      await onSubmit(data)
    },
    (errors) => {
      console.error('[FaturaLancamentoForm] Erros de validação:', JSON.stringify(errors, null, 2))

      // Log cada campo com erro
      Object.keys(errors).forEach(key => {
        console.error(`Campo "${key}":`, errors[key as keyof typeof errors])
      })
    }
  )

  // Agrupar categorias por grupo
  const categoriasPorGrupo = categorias.reduce((acc, cat) => {
    const grupo = cat.grupo || 'Outros'
    if (!acc[grupo]) {
      acc[grupo] = []
    }
    acc[grupo].push(cat)
    return acc
  }, {} as Record<string, Categoria[]>)

  const categoriaOptions = Object.entries(categoriasPorGrupo).flatMap(([grupo, cats]) => [
    { value: `__grupo__${grupo}`, label: grupo, disabled: true },
    ...cats.map(cat => ({
      value: cat.id,
      label: `${cat.icone || '📁'} ${cat.nome}`,
    })),
  ])

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Informações do Lançamento</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="descricao"
              label="Descrição"
              placeholder="Ex: Jantar no Outback, Uber para aeroporto..."
              required
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-dark-input">
              <FormDatePicker
                name="data_compra"
                label="Data da Compra"
                required
                className="!bg-[#1e293b] !text-white !border-white/20"
              />
            </div>

            <div className="form-dark-input">
              <FormCurrencyInput
                name="valor_brl"
                label="Valor (R$)"
                required
                disabled={isCompraExterior}
                className="!bg-[#1e293b] !text-white !border-white/20"
              />
            </div>
          </div>

          <div className="form-dark-input">
            <FormSelect
              name="categoria_id"
              label="Categoria"
              options={categoriaOptions}
              placeholder={loadingCategorias ? 'Carregando...' : 'Selecione uma categoria'}
              disabled={loadingCategorias}
              className="!bg-[#1e293b] !text-white !border-white/20"
            />
          </div>
        </div>

        {/* Parcelamento */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-white" />
              <h3 className="text-sm font-medium text-white">Parcelamento</h3>
            </div>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_parcelado"
              checked={isParcelado}
              onChange={(e) => setIsParcelado(e.target.checked)}
              className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="is_parcelado" className="text-sm text-white cursor-pointer">
              Esta compra foi parcelada
            </label>
          </div>

          {isParcelado && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-dark-input">
                <FormInput
                  name="parcela_numero"
                  label="Número desta Parcela"
                  type="number"
                  placeholder="Ex: 1"
                  min={1}
                  required={isParcelado}
                  className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                />
              </div>

              <div className="form-dark-input">
                <FormInput
                  name="parcela_total"
                  label="Total de Parcelas"
                  type="number"
                  placeholder="Ex: 12"
                  min={1}
                  required={isParcelado}
                  className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                />
              </div>
            </div>
          )}

          {isParcelado && (
            <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <p className="text-xs text-blue-300">
                💡 <strong>Dica:</strong> Este lançamento representa apenas uma parcela. Você precisará criar lançamentos separados para cada mês das outras parcelas.
              </p>
            </div>
          )}
        </div>

        {/* Compra no Exterior */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-white" />
              <h3 className="text-sm font-medium text-white">Compra no Exterior</h3>
            </div>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_compra_exterior"
              checked={isCompraExterior}
              onChange={(e) => setIsCompraExterior(e.target.checked)}
              className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="is_compra_exterior" className="text-sm text-white cursor-pointer">
              Compra realizada em moeda estrangeira
            </label>
          </div>

          {isCompraExterior && (
            <>
              <div className="form-dark-input">
                <FormSelect
                  name="moeda_original"
                  label="Moeda Original"
                  options={MOEDAS}
                  placeholder="Selecione a moeda"
                  required={isCompraExterior}
                  className="!bg-[#1e293b] !text-white !border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-dark-input">
                  <FormInput
                    name="valor_original"
                    label="Valor Original"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.00"
                    required={isCompraExterior}
                    className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                  />
                </div>

                <div className="form-dark-input">
                  <FormInput
                    name="taxa_cambio"
                    label="Taxa de Câmbio"
                    type="number"
                    step="0.0001"
                    placeholder="Ex: 5.45"
                    required={isCompraExterior}
                    className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                  />
                </div>
              </div>

              <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <p className="text-xs text-green-300">
                  ✓ O valor em Reais será calculado automaticamente: Valor Original × Taxa de Câmbio
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                borderColor: 'rgb(71, 85, 105)',
                color: 'white',
              }}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: '#18B0A4',
              color: 'white',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
