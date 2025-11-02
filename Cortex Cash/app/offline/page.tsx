'use client';

import { AlertCircle, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-4">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription>
            It looks like you've lost your internet connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Limited functionality</p>
                <p className="text-muted-foreground">
                  Some features may not work while offline. Your data will sync
                  automatically when you're back online.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Check your internet connection and try again
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
