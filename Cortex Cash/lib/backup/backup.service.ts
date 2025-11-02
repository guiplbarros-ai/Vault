/**
 * Backup/Export Service
 *
 * Handles export and import of IndexedDB data
 */

import { getDB } from '@/lib/db/client';
import type {
  BackupData,
  BackupMetadata,
  BackupValidationResult,
  ExportOptions,
  ImportOptions,
  ImportResult,
} from './types';

const APP_VERSION = '0.4.0';
const BACKUP_VERSION = '1.0';

// All database tables
const ALL_TABLES = [
  'instituicoes',
  'contas',
  'categorias',
  'transacoes',
  'templates_importacao',
  'regras_classificacao',
  'logs_ia',
  'cartoes_config',
  'faturas',
  'faturas_lancamentos',
  'centros_custo',
  'orcamentos',
] as const;

/**
 * Export database to JSON
 */
export async function exportDatabase(
  options: ExportOptions = {}
): Promise<BackupData> {
  const { tables = ALL_TABLES, prettify = true } = options;

  try {
    const db = getDB();
    const data: Record<string, any[]> = {};
    let totalRecords = 0;

    // Export each table
    for (const tableName of tables) {
      const table = (db as any)[tableName];
      if (!table) {
        console.warn(`Table ${tableName} not found in database`);
        continue;
      }

      const records = await table.toArray();
      data[tableName] = records;
      totalRecords += records.length;
    }

    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      timestamp: new Date(),
      tables: [...tables],
      totalRecords,
      appVersion: APP_VERSION,
    };

    return {
      metadata,
      data,
    };
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(
      `Failed to export database: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Download backup as JSON file
 */
export async function downloadBackup(options: ExportOptions = {}): Promise<void> {
  try {
    const backup = await exportDatabase(options);
    const json = JSON.stringify(backup, null, options.prettify ? 2 : 0);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cortex-cash-backup-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error(
      `Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate backup data
 */
export function validateBackup(
  backupData: any
): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (typeof backupData !== 'object' || backupData === null) {
    return {
      isValid: false,
      errors: ['Backup data must be a JSON object'],
      warnings: [],
    };
  }

  // Check metadata
  if (!backupData.metadata) {
    errors.push('Missing metadata');
  } else {
    const { version, timestamp, tables, totalRecords, appVersion } = backupData.metadata;

    if (!version) errors.push('Missing metadata.version');
    if (!timestamp) errors.push('Missing metadata.timestamp');
    if (!tables || !Array.isArray(tables)) errors.push('Missing or invalid metadata.tables');
    if (typeof totalRecords !== 'number') errors.push('Missing or invalid metadata.totalRecords');
    if (!appVersion) warnings.push('Missing metadata.appVersion');

    if (version && version !== BACKUP_VERSION) {
      warnings.push(`Backup version ${version} differs from current version ${BACKUP_VERSION}`);
    }
  }

  // Check data
  if (!backupData.data) {
    errors.push('Missing data');
  } else if (typeof backupData.data !== 'object') {
    errors.push('Invalid data format (must be an object)');
  } else {
    const tableCount = Object.keys(backupData.data).length;
    if (tableCount === 0) {
      warnings.push('Backup contains no tables');
    }

    // Validate each table is an array
    for (const [tableName, records] of Object.entries(backupData.data)) {
      if (!Array.isArray(records)) {
        errors.push(`Table "${tableName}" is not an array`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: backupData.metadata,
  };
}

/**
 * Import backup data
 */
export async function importDatabase(
  backupData: BackupData,
  options: ImportOptions = { mode: 'replace', validate: true }
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    recordsImported: 0,
    recordsSkipped: 0,
    errors: [],
    warnings: [],
    tables: {},
  };

  try {
    // Validate if requested
    if (options.validate !== false) {
      const validation = validateBackup(backupData);
      if (!validation.isValid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        return result;
      }
      result.warnings = validation.warnings;
    }

    // Dry run - just validate
    if (options.dryRun) {
      result.success = true;
      result.warnings.push('Dry run - no data was actually imported');
      return result;
    }

    const db = getDB();

    // Import each table
    for (const [tableName, records] of Object.entries(backupData.data)) {
      const table = (db as any)[tableName];
      if (!table) {
        result.warnings.push(`Table "${tableName}" not found in database, skipping`);
        continue;
      }

      let imported = 0;
      let skipped = 0;

      try {
        if (options.mode === 'replace') {
          // Clear existing data
          await table.clear();
        }

        // Import records
        for (const record of records) {
          try {
            if (options.mode === 'merge') {
              // Check if record already exists
              const existing = await table.get(record.id);
              if (existing) {
                skipped++;
                continue;
              }
            }

            await table.add(record);
            imported++;
          } catch (error) {
            skipped++;
            result.warnings.push(
              `Failed to import record in ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }

        result.tables[tableName] = { imported, skipped };
        result.recordsImported += imported;
        result.recordsSkipped += skipped;
      } catch (error) {
        result.errors.push(
          `Failed to import table "${tableName}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

/**
 * Load backup from file
 */
export async function loadBackupFile(file: File): Promise<BackupData> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate
    const validation = validateBackup(data);
    if (!validation.isValid) {
      throw new Error(`Invalid backup file: ${validation.errors.join(', ')}`);
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON file');
    }
    throw error;
  }
}

/**
 * Get backup info without importing
 */
export async function getBackupInfo(file: File): Promise<{
  metadata: BackupMetadata;
  validation: BackupValidationResult;
  size: string;
}> {
  const backupData = await loadBackupFile(file);
  const validation = validateBackup(backupData);

  const sizeInBytes = file.size;
  const size =
    sizeInBytes < 1024
      ? `${sizeInBytes} bytes`
      : sizeInBytes < 1024 * 1024
      ? `${(sizeInBytes / 1024).toFixed(1)} KB`
      : `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;

  return {
    metadata: backupData.metadata,
    validation,
    size,
  };
}

/**
 * Clear all data (use with caution!)
 */
export async function clearAllData(): Promise<void> {
  const db = getDB();

  for (const tableName of ALL_TABLES) {
    const table = (db as any)[tableName];
    if (table) {
      await table.clear();
    }
  }
}
