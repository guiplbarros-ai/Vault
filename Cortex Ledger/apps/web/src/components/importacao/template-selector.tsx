'use client'

import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

export interface ImportTemplate {
  id: string
  nome: string
  banco: string
  tipo: 'CSV' | 'OFX' | 'XLSX'
  descricao: string
  colunas?: string[]
}

const TEMPLATES: ImportTemplate[] = [
  {
    id: 'nubank-csv',
    nome: 'Nubank (CSV)',
    banco: 'Nubank',
    tipo: 'CSV',
    descricao: 'Formato padrão do extrato Nubank em CSV',
    colunas: ['data', 'categoria', 'titulo', 'valor'],
  },
  {
    id: 'inter-ofx',
    nome: 'Banco Inter (OFX)',
    banco: 'Banco Inter',
    tipo: 'OFX',
    descricao: 'Arquivo OFX do Banco Inter',
  },
  {
    id: 'itau-ofx',
    nome: 'Itaú (OFX)',
    banco: 'Itaú',
    tipo: 'OFX',
    descricao: 'Arquivo OFX do Banco Itaú',
  },
  {
    id: 'bradesco-ofx',
    nome: 'Bradesco (OFX)',
    banco: 'Bradesco',
    tipo: 'OFX',
    descricao: 'Arquivo OFX do Banco Bradesco',
  },
  {
    id: 'santander-ofx',
    nome: 'Santander (OFX)',
    banco: 'Santander',
    tipo: 'OFX',
    descricao: 'Arquivo OFX do Banco Santander',
  },
  {
    id: 'generic-csv',
    nome: 'CSV Genérico',
    banco: 'Outros',
    tipo: 'CSV',
    descricao: 'Detecção automática de colunas',
    colunas: ['auto-detect'],
  },
]

interface TemplateSelectorProps {
  selectedTemplate: string | null
  onSelectTemplate: (templateId: string) => void
}

export function TemplateSelector({ selectedTemplate, onSelectTemplate }: TemplateSelectorProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-text">
        Selecione o Template
      </h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.id
                ? 'ring-2 ring-brand'
                : ''
            }`}
            onClick={() => onSelectTemplate(template.id)}
          >
            <CardBody className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text">
                      {template.nome}
                    </h4>
                    {selectedTemplate === template.id && (
                      <Check className="h-4 w-4 text-brand" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {template.descricao}
                  </p>
                </div>
                <Badge
                  variant={
                    template.tipo === 'CSV'
                      ? 'primary'
                      : template.tipo === 'OFX'
                      ? 'success'
                      : 'warning'
                  }
                  className="text-xs"
                >
                  {template.tipo}
                </Badge>
              </div>
              {template.colunas && template.colunas.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-muted">Colunas:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.colunas.map((col) => (
                      <span
                        key={col}
                        className="rounded bg-elev px-2 py-0.5 text-xs text-text"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { TEMPLATES }
