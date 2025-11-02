/**
 * Types for Backup/Export System
 */

export interface BackupMetadata {
  version: string;
  timestamp: Date;
  tables: string[];
  totalRecords: number;
  appVersion: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: BackupMetadata;
}

export interface ExportOptions {
  tables?: string[]; // specific tables to export (default: all)
  compress?: boolean; // compress JSON (default: false)
  prettify?: boolean; // prettify JSON (default: true)
}

export interface ImportOptions {
  mode: 'replace' | 'merge'; // replace = delete existing, merge = skip duplicates
  validate?: boolean; // validate before import (default: true)
  dryRun?: boolean; // don't actually import, just validate (default: false)
}

export interface ImportResult {
  success: boolean;
  recordsImported: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  tables: Record<string, { imported: number; skipped: number }>;
}
