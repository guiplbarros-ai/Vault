'use client';

import { AlertCircle, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, #152821 0%, #111f1c 40%, #0e1c19 70%, #0a1512 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <Card
        className="max-w-md w-full"
        style={{
          backgroundColor: '#1a362f',
          border: '1px solid #2d5247',
          borderRadius: '18px',
          boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
        }}
      >
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div
              className="rounded-full p-4"
              style={{ backgroundColor: '#152b26' }}
            >
              <WifiOff className="h-8 w-8" style={{ color: '#8CA39C' }} />
            </div>
          </div>
          <CardTitle className="text-2xl" style={{ color: '#F2F7F5' }}>
            Você está offline
          </CardTitle>
          <CardDescription style={{ color: '#B2BDB9' }}>
            Parece que você perdeu a conexão com a internet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: '#152b26',
              border: '1px solid #2d5247',
            }}
          >
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#E0B257' }} />
              <div className="text-sm">
                <p className="font-medium mb-1" style={{ color: '#F2F7F5' }}>
                  Funcionalidade limitada
                </p>
                <p style={{ color: '#B2BDB9' }}>
                  Alguns recursos podem não funcionar enquanto offline. Seus dados serão
                  sincronizados automaticamente quando você voltar online.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            style={{
              backgroundColor: '#3A8F6E',
              color: '#F2F7F5',
              borderRadius: '12px',
              border: 'none',
            }}
          >
            Tentar Novamente
          </Button>

          <p className="text-xs text-center" style={{ color: '#8CA39C' }}>
            Verifique sua conexão com a internet e tente novamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
