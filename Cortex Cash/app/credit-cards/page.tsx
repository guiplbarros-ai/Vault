import { DashboardLayout } from "@/components/dashboard-layout";

export default function CreditCardsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões e faturas</p>
        </div>

        {/* TODO(FINANCE): Implementar lógica de cartões e faturas (v0.3) */}
        {/* TODO(UI): Implementar dashboard de cartões */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Disponível na versão 0.3
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
