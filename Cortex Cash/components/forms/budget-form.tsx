'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orcamentoSchema, type OrcamentoFormData } from '@/lib/validations/budget'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { categoriaService } from '@/lib/services/categoria.service'
import type { Categoria, CentroCusto } from '@/lib/types'
import { FormCheckbox } from '@/components/forms/form-checkbox'
import { getDB } from '@/lib/db/client'

export interface BudgetFormProps {
  defaultValues?: Partial<OrcamentoFormData>
  onSubmit: (data: OrcamentoFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export function BudgetForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
}: BudgetFormProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Gerar mes_referencia padrão (mês atual)
  const getDefaultMesReferencia = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    return `${year}-${month}`
  }

  const methods = useForm<OrcamentoFormData>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: {
      tipo: 'categoria',
      mes_referencia: getDefaultMesReferencia(),
      alerta_80: true,
      alerta_100: true,
      ...defaultValues,
    },
  })

  const tipoWatch = methods.watch('tipo')

  // Carregar categorias e centros de custo
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true)
        const [cats, centros] = await Promise.all([
          categoriaService.listCategorias({
            ativas: true,
            tipo: 'despesa', // Orçamentos são apenas para despesas
            sortBy: 'nome',
            sortOrder: 'asc',
          }),
          getDB().centros_custo.filter(cc => cc.ativo).toArray(),
        ])
        setCategorias(cats)
        setCentrosCusto(centros)
      } catch (error) {
        console.error('Erro ao carregar opções:', error)
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [])

  const handleSubmit = async (data: OrcamentoFormData) => {
    await onSubmit(data)
  }

  const tipoOptions = [
    { value: 'categoria', label: 'Por Categoria' },
    { value: 'centro_custo', label: 'Por Centro de Custo' },
  ]

  const categoriaOptions = categorias.map((c) => ({
    value: c.id,
    label: `${c.icone} ${c.nome}`,
  }))

  const centroCustoOptions = centrosCusto.map((cc) => ({
    value: cc.id,
    label: cc.nome,
  }))

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Informações Básicas</h3>

          <FormInput
            name="nome"
            label="Nome do Orçamento"
            placeholder="Ex: Alimentação Novembro"
            disabled={isLoading}
          />

          <FormSelect
            name="tipo"
            label="Tipo de Orçamento"
            options={tipoOptions}
            disabled={isLoading}
          />

          <FormInput
            name="mes_referencia"
            label="Mês de Referência"
            placeholder="YYYY-MM (ex: 2025-11)"
            disabled={isLoading}
            description="Formato: Ano-Mês (ex: 2025-11 para Novembro de 2025)"
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Vinculação */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Vinculação</h3>

          {tipoWatch === 'categoria' && (
            <FormSelect
              name="categoria_id"
              label="Categoria"
              options={categoriaOptions}
              disabled={isLoading || loadingOptions}
              placeholder={loadingOptions ? 'Carregando categorias...' : 'Selecione uma categoria'}
            />
          )}

          {tipoWatch === 'centro_custo' && (
            <FormSelect
              name="centro_custo_id"
              label="Centro de Custo"
              options={centroCustoOptions}
              disabled={isLoading || loadingOptions}
              placeholder={
                loadingOptions ? 'Carregando centros de custo...' : 'Selecione um centro de custo'
              }
            />
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* Valor e Alertas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Valor e Alertas</h3>

          <FormInput
            name="valor_planejado"
            label="Valor Planejado"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={isLoading}
            description="Valor máximo que você planeja gastar nesta categoria/centro de custo neste mês"
          />

          <div className="space-y-3 rounded-lg border border-white/10 p-4">
            <p className="text-sm text-white/70">
              Configurar alertas quando o gasto atingir:
            </p>

            <FormCheckbox
              name="alerta_80"
              label="80% do valor planejado (Atenção)"
              disabled={isLoading}
            />

            <FormCheckbox
              name="alerta_100"
              label="100% do valor planejado (Limite Excedido)"
              disabled={isLoading}
            />
          </div>
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
