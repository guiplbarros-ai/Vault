import { DashboardLayout } from "@/components/dashboard-layout";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Configurações</h1>
          <p className="text-muted-foreground">Configure suas preferências e dados</p>
        </div>

        {/* TODO(CORE): Implementar configurações gerais */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Em desenvolvimento
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
