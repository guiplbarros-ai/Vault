import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react"

const stats = [
  {
    name: "Total Balance",
    value: "$24,582.50",
    change: "+12.5%",
    trend: "up",
    icon: Wallet,
  },
  {
    name: "Monthly Income",
    value: "$8,420.00",
    change: "+4.2%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    name: "Monthly Expenses",
    value: "$5,234.80",
    change: "-2.1%",
    trend: "down",
    icon: TrendingDown,
  },
  {
    name: "Credit Cards",
    value: "$1,842.30",
    change: "Due in 5 days",
    trend: "neutral",
    icon: CreditCard,
  },
]

export function OverviewCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.name} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <stat.icon className="h-5 w-5 text-accent" />
              </div>
            </div>
            {stat.trend === "up" && <span className="text-xs font-medium text-accent">{stat.change}</span>}
            {stat.trend === "down" && <span className="text-xs font-medium text-destructive">{stat.change}</span>}
            {stat.trend === "neutral" && <span className="text-xs text-muted-foreground">{stat.change}</span>}
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{stat.name}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
