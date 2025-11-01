'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema, CategoryFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormColorPicker, FormTextarea } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

export interface CategoryFormProps {
  defaultValues?: Partial<CategoryFormData>
  onSubmit: (data: CategoryFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
  showParentSelect?: boolean
}

// Mock options - TODO: Replace with real data from DB
const mockParentCategoryOptions = [
  { value: '', label: 'Nenhuma (Categoria Principal)' },
  { value: '1', label: 'Salário' },
  { value: '2', label: 'Freelance' },
  { value: '4', label: 'Moradia' },
  { value: '8', label: 'Alimentação' },
  { value: '11', label: 'Transporte' },
  { value: '12', label: 'Saúde' },
]

const categoryTypeOptions = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
]

// Icon options - TODO: Expand with more lucide icons
const iconOptions = [
  { value: 'briefcase', label: 'Maleta' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'trending-up', label: 'Gráfico' },
  { value: 'home', label: 'Casa' },
  { value: 'utensils', label: 'Talheres' },
  { value: 'car', label: 'Carro' },
  { value: 'heart', label: 'Coração' },
  { value: 'shopping-bag', label: 'Sacola' },
  { value: 'coffee', label: 'Café' },
  { value: 'smartphone', label: 'Celular' },
  { value: 'book', label: 'Livro' },
  { value: 'music', label: 'Música' },
  { value: 'plane', label: 'Avião' },
  { value: 'gift', label: 'Presente' },
  { value: 'zap', label: 'Raio' },
]

export function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
  showParentSelect = true,
}: CategoryFormProps) {
  const methods = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      type: 'expense',
      color: '#3B82F6',
      icon: 'tag',
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: CategoryFormData) => {
    await onSubmit(data)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Informações Básicas</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <FormInput
            name="name"
            label="Nome da Categoria"
            placeholder="Ex: Salário, Alimentação, Transporte..."
            required
          />

          <FormSelect
            name="type"
            label="Tipo"
            placeholder="Selecione o tipo"
            options={categoryTypeOptions}
            required
          />

          {showParentSelect && (
            <FormSelect
              name="parentId"
              label="Categoria Pai (opcional)"
              placeholder="Selecione uma categoria pai"
              options={mockParentCategoryOptions}
            />
          )}

          <FormTextarea
            name="description"
            label="Descrição (opcional)"
            placeholder="Descreva o propósito desta categoria..."
            maxLength={200}
            showCount
          />
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Aparência</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <FormColorPicker
            name="color"
            label="Cor"
            required
          />

          <FormSelect
            name="icon"
            label="Ícone"
            placeholder="Selecione um ícone"
            options={iconOptions}
          />
        </div>

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
