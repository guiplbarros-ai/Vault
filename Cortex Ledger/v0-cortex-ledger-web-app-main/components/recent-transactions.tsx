import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

const transactions = [
  {
    id: 1,
    description: "Whole Foods Market",
    category: "Groceries",
    amount: -85.42,
    date: "2025-10-27",
    type: "expense",
  },
  {
    id: 2,
    description: "Salary Deposit",
    category: "Income",
    amount: 4200.0,
    date: "2025-10-25",
    type: "income",
  },
  {
    id: 3,
    description: "Netflix Subscription",
    category: "Entertainment",
    amount: -15.99,
    date: "2025-10-24",
    type: "expense",
  },
  {
    id: 4,
    description: "Gas Station",
    category: "Transportation",
    amount: -45.2,
    date: "2025-10-23",
    type: "expense",
  },
  {
    id: 5,
    description: "Freelance Project",
    category: "Income",
    amount: 850.0,
    date: "2025-10-22",
    type: "income",
  },
]

export function RecentTransactions() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
        <p className="text-sm text-muted-foreground">Your latest financial activity</p>
      </div>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-2 ${transaction.type === "income" ? "bg-accent/10" : "bg-muted"}`}>
                {transaction.type === "income" ? (
                  <ArrowDownRight className="h-4 w-4 text-accent" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{transaction.date}</span>
                </div>
              </div>
            </div>
            <span
              className={`text-sm font-semibold ${transaction.type === "income" ? "text-accent" : "text-foreground"}`}
            >
              {transaction.type === "income" ? "+" : ""}
              {transaction.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
