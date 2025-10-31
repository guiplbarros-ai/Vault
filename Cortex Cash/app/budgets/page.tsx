'use client'

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"

export default function BudgetsPage() {
  const [budgets] = useState<any[]>([])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Orçamentos"
          description="Planeje e acompanhe seus gastos mensais"
          actions={
            <Button
              className="rounded-xl px-6 py-3 text-base font-semibold text-white hover:opacity-90"
              style={{
                backgroundColor: '#18B0A4',
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Orçamento
            </Button>
          }
        />

        {/* Card de Filtros */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white text-lg">Filtros</CardTitle>
            <CardDescription className="text-white/70">
              Filtre os orçamentos por categoria ou período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-white/70">
                Funcionalidade em desenvolvimento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Orçamentos */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white text-lg">Orçamentos Ativos</CardTitle>
            <CardDescription className="text-white/70">
              Gerencie seus limites de gastos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/70 text-lg mb-2">
                  Nenhum orçamento cadastrado
                </p>
                <p className="text-white/50 text-sm">
                  Crie seu primeiro orçamento para começar a controlar seus gastos
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Lista de orçamentos será renderizada aqui */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
