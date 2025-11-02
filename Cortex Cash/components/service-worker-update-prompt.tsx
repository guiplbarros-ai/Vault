'use client';

import { useServiceWorker } from '@/lib/hooks/use-service-worker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

export function ServiceWorkerUpdatePrompt() {
  const { updateAvailable, skipWaiting } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="border-primary shadow-lg">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Update Available</h3>
              <p className="text-sm text-muted-foreground mb-3">
                A new version of Cortex Cash is available. Update now to get the
                latest features and improvements.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={skipWaiting}
                  size="sm"
                  className="flex-1"
                >
                  Update Now
                </Button>
                <Button
                  onClick={() => setDismissed(true)}
                  variant="ghost"
                  size="sm"
                >
                  Later
                </Button>
              </div>
            </div>
            <Button
              onClick={() => setDismissed(true)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
