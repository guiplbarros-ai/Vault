'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { THEME_COLORS } from '@/lib/constants/colors'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: THEME_COLORS.bgApp }}
    >
      <Card className="max-w-md w-full" style={{ backgroundColor: THEME_COLORS.bgCard, borderColor: THEME_COLORS.border }}>
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" style={{ color: THEME_COLORS.warning }} />
          <CardTitle style={{ color: THEME_COLORS.fgPrimary }}>Algo deu errado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center" style={{ color: THEME_COLORS.fgSecondary }}>
            {error.message || 'Ocorreu um erro inesperado. Tente novamente.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              <Home className="h-4 w-4 mr-2" />
              Início
            </Button>
            <Button onClick={reset} style={{ backgroundColor: THEME_COLORS.accent }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
