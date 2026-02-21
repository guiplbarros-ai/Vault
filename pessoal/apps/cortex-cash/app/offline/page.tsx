'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full p-4 bg-muted">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Você está offline</CardTitle>
          <CardDescription>
            Parece que você perdeu a conexão com a internet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg p-4 bg-muted border">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-warning" />
              <div className="text-sm">
                <p className="font-medium mb-1">Funcionalidade limitada</p>
                <p className="text-muted-foreground">
                  Alguns recursos podem não funcionar enquanto offline. Seus dados serão
                  sincronizados automaticamente quando você voltar online.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => window.location.reload()} className="w-full">
            Tentar Novamente
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Verifique sua conexão com a internet e tente novamente
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
