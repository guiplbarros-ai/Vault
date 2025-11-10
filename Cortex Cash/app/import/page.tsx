"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ImportWizard } from "@/components/import/import-wizard";

export default function ImportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ImportWizard title="Importar Transações" redirectOnComplete showClassificationRules />
      </div>
    </DashboardLayout>
  );
}
