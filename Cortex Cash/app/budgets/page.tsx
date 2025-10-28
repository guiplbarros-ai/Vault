import { DashboardLayout } from "@/components/dashboard-layout";

export default function BudgetsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Orçamentos</h1>
          <p className="text-muted-foreground">Planeje e acompanhe seus gastos mensais</p>
        </div>

        {/* TODO(FINANCE): Implementar lógica de orçamentos (v1.0) */}
        {/* TODO(UI): Implementar dashboard de orçamentos */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Disponível na versão 1.0
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
