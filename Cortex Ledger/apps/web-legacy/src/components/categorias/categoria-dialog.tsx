'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CategoriaForm } from './categoria-form'
import type { Categoria } from '@/lib/hooks/use-categorias'

interface CategoriaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoria?: Categoria | null
  grupos: string[]
  onSubmit: (data: { nome: string; grupo: string; ativa: boolean }) => void
  isLoading?: boolean
}

export function CategoriaDialog({
  open,
  onOpenChange,
  categoria,
  grupos,
  onSubmit,
  isLoading = false,
}: CategoriaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {categoria ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            {categoria
              ? 'Atualize as informações da categoria.'
              : 'Crie uma nova categoria para organizar suas transações.'}
          </DialogDescription>
        </DialogHeader>
        <CategoriaForm
          categoria={categoria}
          grupos={grupos}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
