'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useCategorias } from '@/lib/hooks/use-categorias'
import { useCreateBudget, useUpdateBudget, type Budget } from '@/lib/hooks/use-budget-mutations'
import { Save, Loader2, AlertCircle } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BudgetFormProps {
  budget?: Budget | null
  onClose: () => void
  mesRef?: Date
}

export function BudgetForm({ budget, onClose, mesRef }: BudgetFormProps) {
  const isEditing = !!budget

  const [categoriaId, setCategoriaId] = useState(budget?.categoria_id || '')
  const [mes, setMes] = useState(
    budget?.mes
      ? format(new Date(budget.mes), 'yyyy-MM')
      : format(mesRef || new Date(), 'yyyy-MM')
  )
  const [valorPlanejado, setValorPlanejado] = useState(
    budget?.valor_alvo ? String(budget.valor_alvo) : ''
  )

  const { data: categorias, isLoading: loadingCategorias } = useCategorias(true)
  const createMutation = useCreateBudget()
  const updateMutation = useUpdateBudget()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!categoriaId) {
      newErrors.categoria = 'Selecione uma categoria'
    }

    if (!mes) {
      newErrors.mes = 'Selecione um mês de referência'
    }

    if (!valorPlanejado) {
      newErrors.valor = 'Informe o valor planejado'
    } else {
      const valor = parseFloat(valorPlanejado.replace(',', '.'))
      if (isNaN(valor) || valor <= 0) {
        newErrors.valor = 'Valor deve ser maior que zero'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const valor = parseFloat(valorPlanejado.replace(',', '.'))
    const mesDate = new Date(mes + '-01')

    const input = {
      categoria_id: categoriaId,
      mes_ref: mesDate,
      valor_planejado: valor,
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: budget.id, ...input })
      } else {
        await createMutation.mutateAsync(input)
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving budget:', error)
      const errorMessage =
        error?.message || 'Erro ao salvar orçamento. Verifique os dados e tente novamente.'
      setErrors({ submit: errorMessage })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Message */}
          {errors.submit && (
            <div className="rounded-xl bg-white dark:bg-graphite-800 p-4 border border-error-600">
              <p className="text-sm text-error-600">{errors.submit}</p>
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-graphite-100">
              Categoria *
            </label>
            {loadingCategorias ? (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-graphite-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando categorias...
              </div>
            ) : (
              <>
                <Select
                  value={categoriaId}
                  onChange={(e) => {
                    setCategoriaId(e.target.value)
                    setErrors((prev) => ({ ...prev, categoria: '' }))
                  }}
                  disabled={isEditing}
                  className={errors.categoria ? 'border-error-500' : ''}
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.grupo} / {cat.nome}
                    </option>
                  ))}
                </Select>
                {errors.categoria && (
                  <p className="mt-1 text-xs text-error-600">
                    {errors.categoria}
                  </p>
                )}
                {isEditing && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-graphite-300">
                    A categoria não pode ser alterada ao editar
                  </p>
                )}
              </>
            )}
          </div>

          {/* Mês */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-graphite-100">
              Mês de Referência *
            </label>
            <Input
              type="month"
              value={mes}
              onChange={(e) => {
                setMes(e.target.value)
                setErrors((prev) => ({ ...prev, mes: '' }))
              }}
              className={errors.mes ? 'border-error-500' : ''}
            />
            {errors.mes && (
              <p className="mt-1 text-xs text-error-600">{errors.mes}</p>
            )}
          </div>

          {/* Valor Planejado */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-graphite-100">
              Valor Planejado *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600 dark:text-graphite-300">
                R$
              </span>
              <Input
                type="text"
                value={valorPlanejado}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '')
                  setValorPlanejado(value)
                  setErrors((prev) => ({ ...prev, valor: '' }))
                }}
                placeholder="0,00"
                className={`pl-10 ${errors.valor ? 'border-error-500' : ''}`}
              />
            </div>
            {errors.valor && (
              <p className="mt-1 text-xs text-error-600">{errors.valor}</p>
            )}
            <p className="mt-1 text-xs text-slate-600 dark:text-graphite-300">
              Use vírgula para separar os centavos (ex: 1500,00)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-graphite-700/25">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Atualizar' : 'Criar Orçamento'}
                </>
              )}
            </Button>
          </div>
        </form>
  )
}
