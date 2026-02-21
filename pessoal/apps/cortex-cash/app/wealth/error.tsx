'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { THEME_COLORS } from '@/lib/constants/colors'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function WealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto p-6">
      <Card style={{ backgroundColor: THEME_COLORS.bgCard, borderColor: THEME_COLORS.border }}>
        <CardHeader className="text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-2" style={{ color: THEME_COLORS.warning }} />
          <CardTitle style={{ color: THEME_COLORS.fgPrimary }}>Erro ao carregar Patrimônio</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm" style={{ color: THEME_COLORS.fgSecondary }}>
            {error.message || 'Não foi possível carregar os dados de patrimônio.'}
          </p>
          <Button onClick={reset} style={{ backgroundColor: THEME_COLORS.accent }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
