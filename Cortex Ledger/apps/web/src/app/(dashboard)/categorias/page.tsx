import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
        <p className="text-neutral-500">
          Gerencie categorias e regras de classificação
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Categorias</CardTitle>
          <CardDescription>
            Placeholder - Será implementado pelo Agent F
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500">
            Esta página permitirá CRUD de categorias, grupos, merge e ativação/desativação.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
