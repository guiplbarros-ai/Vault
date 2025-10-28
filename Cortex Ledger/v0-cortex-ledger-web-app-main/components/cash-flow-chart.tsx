"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const data = [
  { month: "Jan", income: 8200, expenses: 5400 },
  { month: "Feb", income: 7800, expenses: 5100 },
  { month: "Mar", income: 8500, expenses: 5600 },
  { month: "Apr", income: 8100, expenses: 4900 },
  { month: "May", income: 8400, expenses: 5300 },
  { month: "Jun", income: 8420, expenses: 5235 },
]

export function CashFlowChart() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Cash Flow</h3>
        <p className="text-sm text-muted-foreground">Income vs Expenses (Last 6 months)</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              color: "hsl(var(--foreground))",
            }}
          />
          <Legend />
          <Bar dataKey="income" fill="hsl(var(--accent))" name="Income" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
