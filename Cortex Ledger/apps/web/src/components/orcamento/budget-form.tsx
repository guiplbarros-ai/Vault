'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useCategorias } from '@/lib/hooks/use-categorias'
import { useCreateBudget, useUpdateBudget, type Budget } from '@/lib/hooks/use-budget-mutations'
import { formatCurrency } from '@/lib/utils'
import { X, Save, Loader2 } from 'lucide-react'
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
    budget?.mes_ref
      ? format(new Date(budget.mes_ref), 'yyyy-MM')
      : format(mesRef || new Date(), 'yyyy-MM')
  )
  const [valorPlanejado, setValorPlanejado] = useState(
    budget?.valor_planejado ? String(budget.valor_planejado) : ''
  )
  const [customAlerts, setCustomAlerts] = useState(false)
  const [alerta80, setAlerta80] = useState(
    budget?.valor_alerta_80 ? String(budget.valor_alerta_80) : ''
  )
  const [alerta100, setAlerta100] = useState(
    budget?.valor_alerta_100 ? String(budget.valor_alerta_100) : ''
  )

  const { data: categorias, isLoading: loadingCategorias } = useCategorias(true)
  const createMutation = useCreateBudget()
  const updateMutation = useUpdateBudget()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoriaId || !mes || !valorPlanejado) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    const valor = parseFloat(valorPlanejado.replace(',', '.'))

    if (isNaN(valor) || valor <= 0) {
      alert('Valor planejado inválido')
      return
    }

    const mesDate = new Date(mes + '-01')

    const input = {
      categoria_id: categoriaId,
      mes_ref: mesDate,
      valor_planejado: valor,
      valor_alerta_80: customAlerts && alerta80 ? parseFloat(alerta80.replace(',', '.')) : valor * 0.8,
      valor_alerta_100: customAlerts && alerta100 ? parseFloat(alerta100.replace(',', '.')) : valor,
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: budget.id, ...input })
      } else {
        await createMutation.mutateAsync(input)
      }
      onClose()
    } catch (error) {
      console.error('Error saving budget:', error)
      alert('Erro ao salvar orçamento. Verifique os dados e tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Categoria */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Categoria *
            </label>
            {loadingCategorias ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando categorias...
              </div>
            ) : (
              <Select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                disabled={isEditing} // Não permitir mudar categoria ao editar
                required
              >
                <option value="">Selecione uma categoria</option>
                {categorias?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.grupo} / {cat.nome}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {/* Mês */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Mês de Referência *
            </label>
            <Input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              required
            />
          </div>

          {/* Valor Planejado */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Valor Planejado *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                R$
              </span>
              <Input
                type="text"
                value={valorPlanejado}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '')
                  setValorPlanejado(value)
                }}
                placeholder="0,00"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Alertas Personalizados */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customAlerts}
                onChange={(e) => setCustomAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Configurar alertas personalizados
              </span>
            </label>
            {!customAlerts && (
              <p className="mt-1 text-xs text-neutral-500">
                Padrão: Alerta em 80% (R$ {formatCurrency(parseFloat(valorPlanejado || '0') * 0.8)}) e
                100% (R$ {formatCurrency(parseFloat(valorPlanejado || '0'))})
              </p>
            )}
          </div>

          {customAlerts && (
            <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Alerta 80%
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                    R$
                  </span>
                  <Input
                    type="text"
                    value={alerta80}
                    onChange={(e) => setAlerta80(e.target.value.replace(/[^\d,]/g, ''))}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Alerta 100%
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                    R$
                  </span>
                  <Input
                    type="text"
                    value={alerta100}
                    onChange={(e) => setAlerta100(e.target.value.replace(/[^\d,]/g, ''))}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
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
                  {isEditing ? 'Atualizar' : 'Criar'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
