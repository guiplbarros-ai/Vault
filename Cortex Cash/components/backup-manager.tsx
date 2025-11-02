'use client';

import { useState, useRef } from 'react';
import { useBackup } from '@/lib/hooks/use-backup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Trash2, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function BackupManager() {
  const { loading, download, importData, getInfo, clearAll } = useBackup();
  const [backupInfo, setBackupInfo] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    try {
      await download({ prettify: true });
      toast.success('Backup downloaded successfully');
    } catch (error) {
      toast.error(`Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const info = await getInfo(file);
      setBackupInfo({ file, ...info });
    } catch (error) {
      toast.error(`Failed to read backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImport = async () => {
    if (!backupInfo?.file) return;

    try {
      const result = await importData(backupInfo.file, { mode: 'replace', validate: true });

      if (result.success) {
        toast.success(`Backup imported successfully! ${result.recordsImported} records imported.`);
        setBackupInfo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Reload page to reflect new data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(`Import failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error(`Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    try {
      await clearAll();
      toast.success('All data cleared successfully');
      setShowClearConfirm(false);

      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Backup
          </CardTitle>
          <CardDescription>
            Download a complete backup of all your data in JSON format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownload}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Backup
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            This will download all transactions, accounts, categories, and other data.
            Keep this file safe as it contains all your financial information.
          </p>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Backup
          </CardTitle>
          <CardDescription>
            Restore data from a previously exported backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="backup-file-input"
            />
            <label htmlFor="backup-file-input">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={loading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Backup File
                </span>
              </Button>
            </label>
          </div>

          {backupInfo && (
            <div className="space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">File:</span>
                      <span>{backupInfo.file.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Size:</span>
                      <span>{backupInfo.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Records:</span>
                      <span>{backupInfo.metadata.totalRecords}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Date:</span>
                      <span>
                        {new Date(backupInfo.metadata.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {backupInfo.validation.warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="text-sm space-y-1">
                      {backupInfo.validation.warnings.map((warning: string, i: number) => (
                        <div key={i}>• {warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Warning:</strong> Importing will replace all existing data.
                  Make sure to export a backup first if you want to keep your current data.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleImport}
                disabled={loading || !backupInfo.validation.isValid}
                className="w-full"
              >
                {loading ? 'Importing...' : 'Import Backup'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear Data Section */}
      <Card className="border-red-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete all data from the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showClearConfirm && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Are you absolutely sure?</strong> This action cannot be undone.
                All your transactions, accounts, categories, and other data will be permanently deleted.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleClearAll}
              disabled={loading}
              variant={showClearConfirm ? 'destructive' : 'outline'}
              className={showClearConfirm ? '' : 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {showClearConfirm ? 'Yes, Delete Everything' : 'Clear All Data'}
            </Button>
            {showClearConfirm && (
              <Button
                onClick={() => setShowClearConfirm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
