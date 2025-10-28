import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle } from "lucide-react"

const budgets = [
  { category: "Mercado", spent: 420, limit: 500, percentage: 84 },
  { category: "Transporte", spent: 180, limit: 200, percentage: 90 },
  { category: "Entretenimento", spent: 95, limit: 150, percentage: 63 },
  { category: "Serviços", spent: 240, limit: 300, percentage: 80 },
]

export function BudgetOverview() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Visão Geral do Orçamento</h3>
        <p className="text-sm text-muted-foreground">Gastos do mês atual</p>
      </div>
      <div className="space-y-4">
        {budgets.map((budget) => (
          <div key={budget.category}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{budget.category}</span>
                {budget.percentage >= 80 && <AlertCircle className="h-4 w-4 text-destructive" />}
              </div>
              <span className="text-sm text-muted-foreground">
                R$ {budget.spent} / R$ {budget.limit}
              </span>
            </div>
            <Progress value={budget.percentage} className="h-2" />
          </div>
        ))}
      </div>
    </Card>
  )
}
