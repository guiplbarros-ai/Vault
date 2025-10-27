import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Configurações</h1>
        <p className="text-muted">Configure suas preferências e perfil</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferências do Sistema</CardTitle>
          <CardDescription>
            Placeholder - Configurações básicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted">
            Esta página permitirá configurar moeda, fuso horário, tema e outras preferências.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
