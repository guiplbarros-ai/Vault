'use client'

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText, AlertCircle } from "lucide-react"

export default function TaxPage() {
  const [declaracoes] = useState<any[]>([])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Imposto de Renda"
          description="Gerencie suas declarações e otimize sua tributação"
          actions={
            <Button
              size="lg"
              className="px-6 text-base font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova Declaração
            </Button>
          }
        />

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Declarações</CardDescription>
              <CardTitle className="text-3xl text-foreground">{declaracoes.length}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastradas no sistema
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Status Atual</CardDescription>
              <CardTitle className="text-2xl text-foreground">Em dia</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhuma pendência
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Próxima Entrega</CardDescription>
              <CardTitle className="text-2xl text-foreground">Abril/2026</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Ano-calendário 2025
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Card Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Gestão de Declarações</CardTitle>
            <CardDescription>
              Organize rendimentos, despesas e bens para sua declaração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="declaracoes" className="space-y-4">
              <TabsList>
                <TabsTrigger value="declaracoes">
                  Declarações
                </TabsTrigger>
                <TabsTrigger value="rendimentos">
                  Rendimentos
                </TabsTrigger>
                <TabsTrigger value="deducoes">
                  Deduções
                </TabsTrigger>
                <TabsTrigger value="bens">
                  Bens e Direitos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="declaracoes" className="space-y-4">
                {declaracoes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 text-lg text-muted-foreground">
                      Nenhuma declaração cadastrada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Crie sua primeira declaração para começar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Lista de declarações será renderizada aqui */}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rendimentos" className="space-y-4">
                <div className="py-8 text-center text-muted-foreground">
                  Cadastro de rendimentos em desenvolvimento...
                </div>
              </TabsContent>

              <TabsContent value="deducoes" className="space-y-4">
                <div className="py-8 text-center text-muted-foreground">
                  Cadastro de deduções em desenvolvimento...
                </div>
              </TabsContent>

              <TabsContent value="bens" className="space-y-4">
                <div className="py-8 text-center text-muted-foreground">
                  Cadastro de bens e direitos em desenvolvimento...
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Card de Sugestões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5" />
              Sugestões Inteligentes
            </CardTitle>
            <CardDescription>
              Identificamos automaticamente transações que podem ser declaradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">
              Sistema de sugestões em desenvolvimento...
              <p className="mt-2 text-xs text-muted-foreground">
                Analisaremos suas transações, investimentos e rendimentos automaticamente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
