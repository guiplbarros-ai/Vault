import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-graphite-100">Configurações</h1>
        <p className="text-slate-600 dark:text-graphite-300">Configure suas preferências e perfil</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferências do Sistema</CardTitle>
          <CardDescription>
            Placeholder - Configurações básicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-graphite-300">
            Esta página permitirá configurar moeda, fuso horário, tema e outras preferências.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
