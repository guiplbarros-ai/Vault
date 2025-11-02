/**
 * Hook for Backup/Export Management
 */

import { useState, useCallback } from 'react';
import {
  exportDatabase,
  downloadBackup,
  importDatabase,
  loadBackupFile,
  getBackupInfo,
  clearAllData,
} from '@/lib/backup/backup.service';
import type {
  BackupData,
  ExportOptions,
  ImportOptions,
  ImportResult,
} from '@/lib/backup/types';

export function useBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);

  const exportData = useCallback(async (options?: ExportOptions) => {
    try {
      setLoading(true);
      setError(null);

      const backup = await exportDatabase(options);
      setLastBackup(backup);

      return backup;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Export failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const download = useCallback(async (options?: ExportOptions) => {
    try {
      setLoading(true);
      setError(null);

      await downloadBackup(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Download failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const importData = useCallback(
    async (file: File, options?: ImportOptions) => {
      try {
        setLoading(true);
        setError(null);

        const backupData = await loadBackupFile(file);
        const result = await importDatabase(backupData, options);

        setLastImportResult(result);

        if (!result.success) {
          throw new Error(
            result.errors.length > 0
              ? result.errors.join(', ')
              : 'Import failed'
          );
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Import failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getInfo = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const info = await getBackupInfo(file);
      return info;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to read backup info');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await clearAllData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear data');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    lastBackup,
    lastImportResult,
    exportData,
    download,
    importData,
    getInfo,
    clearAll,
  };
}
