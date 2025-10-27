'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown, TrendingUp } from 'lucide-react'

export function KpiCard({ label, value, delta, good }: { label: string; value: string; delta?: string; good?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="label">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <span className="kpi text-text">{value}</span>
          {delta && (
            <div className={`flex items-center gap-1 text-sm font-medium ${good ? 'status-success' : 'status-danger'}`}>
              {good ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{delta}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


