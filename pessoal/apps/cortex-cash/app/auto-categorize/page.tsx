'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { AutoCategorize } from '@/components/classification/auto-categorize'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CLASSIFICATION_RULES } from '@/lib/constants/classification-rules'
import { useState } from 'react'

export default function AutoCategorizePage() {
  const [done, setDone] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Auto-Categorização</h1>
          <p className="text-muted-foreground">
            Pipeline completo: reclassificar tipos, aplicar regras e classificar com AI
          </p>
        </div>

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>O que será feito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>0. Reclassificar tipos (câmbio, cartão, CDB → transferência)</p>
            <p>1. Criar {CLASSIFICATION_RULES.length} regras de classificação automática</p>
            <p>2. Aplicar regras em transações sem categoria</p>
            <p>3. Classificar restantes com AI (GPT-4o-mini)</p>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Executar</CardTitle>
          </CardHeader>
          <CardContent>
            <AutoCategorize onComplete={() => setDone(true)} />
          </CardContent>
        </Card>

        {/* Navigation após conclusão */}
        {done && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button asChild>
                  <a href="/">Ver Dashboard</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/transactions">Ver Transações</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/categories">Ver Categorias</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
