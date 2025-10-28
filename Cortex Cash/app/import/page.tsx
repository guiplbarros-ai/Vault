import { DashboardLayout } from "@/components/dashboard-layout";

export default function ImportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Importar Transações</h1>
          <p className="text-muted-foreground">Importe extratos bancários de CSV, OFX ou Excel</p>
        </div>

        {/* TODO(IMPORT): Implementar fluxo de importação completo */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Aguardando implementação do Agent IMPORT
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
