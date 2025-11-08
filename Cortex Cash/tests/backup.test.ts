/**
 * Backup/Restore System Tests
 *
 * Manual test suite for backup functionality
 * Run in browser console on /settings/backup page
 */

import {
  exportDatabase,
  validateBackup,
  importDatabase,
  clearAllData,
} from '@/lib/backup/backup.service';
import type { BackupData } from '@/lib/backup/types';

export class BackupTestSuite {
  private originalData: BackupData | null = null;
  private results: { test: string; passed: boolean; error?: string }[] = [];

  async runAll(): Promise<void> {
    console.log('🧪 Starting Backup/Restore Test Suite...\n');

    try {
      await this.test1_ExportBackup();
      await this.test2_ValidateBackup();
      await this.test3_ImportReplace();
      await this.test4_ImportMerge();
      await this.test5_InvalidBackup();
      await this.test6_DataIntegrity();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    this.printResults();
  }

  private async test1_ExportBackup(): Promise<void> {
    const testName = 'Export Database';
    console.log(`\n🔍 Running: ${testName}`);

    try {
      this.originalData = await exportDatabase();

      // Validate structure
      if (!this.originalData.metadata) {
        throw new Error('Missing metadata in backup');
      }

      if (!this.originalData.data) {
        throw new Error('Missing data in backup');
      }

      if (this.originalData.metadata.totalRecords === 0) {
        console.warn('⚠️  Database is empty, some tests may not be meaningful');
      }

      console.log(`✅ Exported ${this.originalData.metadata.totalRecords} records`);
      console.log(`   Tables: ${this.originalData.metadata.tables.join(', ')}`);

      this.results.push({ test: testName, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName} failed:`, message);
      this.results.push({ test: testName, passed: false, error: message });
      throw error;
    }
  }

  private async test2_ValidateBackup(): Promise<void> {
    const testName = 'Validate Backup Structure';
    console.log(`\n🔍 Running: ${testName}`);

    try {
      if (!this.originalData) {
        throw new Error('No backup data to validate');
      }

      const validation = validateBackup(this.originalData);

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  Warnings:', validation.warnings);
      }

      console.log('✅ Backup structure is valid');
      this.results.push({ test: testName, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName} failed:`, message);
      this.results.push({ test: testName, passed: false, error: message });
      throw error;
    }
  }

  private async test3_ImportReplace(): Promise<void> {
    const testName = 'Import with Replace Mode';
    console.log(`\n🔍 Running: ${testName}`);

    try {
      if (!this.originalData) {
        throw new Error('No backup data to import');
      }

      // Dry run first
      const dryRunResult = await importDatabase(this.originalData, {
        mode: 'replace',
        validate: true,
        dryRun: true,
      });

      if (!dryRunResult.success) {
        throw new Error(`Dry run failed: ${dryRunResult.errors.join(', ')}`);
      }

      console.log('✅ Dry run passed');
      console.log('   This would replace all existing data');

      this.results.push({ test: testName, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName} failed:`, message);
      this.results.push({ test: testName, passed: false, error: message });
    }
  }

  private async test4_ImportMerge(): Promise<void> {
    const testName = 'Import with Merge Mode';
    console.log(`\n🔍 Running: ${testName}`);

    try {
      if (!this.originalData) {
        throw new Error('No backup data to import');
      }

      // Dry run with merge
      const dryRunResult = await importDatabase(this.originalData, {
        mode: 'merge',
        validate: true,
        dryRun: true,
      });

      if (!dryRunResult.success) {
        throw new Error(`Dry run failed: ${dryRunResult.errors.join(', ')}`);
      }

      console.log('✅ Merge mode dry run passed');
      console.log('   This would skip existing records');

      this.results.push({ test: testName, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName} failed:`, message);
      this.results.push({ test: testName, passed: false, error: message });
    }
  }

  private async test5_InvalidBackup(): Promise<void> {
    const testName = 'Reject Invalid Backup';
    console.log(`\n🔍 Running: ${testName}`);

    try {
      // Test various invalid backups
      const invalidBackups = [
        { name: 'null', data: null },
        { name: 'empty object', data: {} },
        { name: 'missing metadata', data: { data: {} } },
        { name: 'missing data', data: { metadata: {} } },
        { name: 'invalid data type', data: { metadata: {}, data: 'not an object' } },
      ];

      for (const { name, data } of invalidBackups) {
        const validation = validateBackup(data);
        if (validation.isValid) {
          throw new Error(`Invalid backup "${name}" was accepted`);
        }
        console.log(`   ✅ Correctly rejected: ${name}`);
      }

      this.results.push({ test: testName, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName} failed:`, message);
      this.results.push({ test: testName, passed: false, error: message });
    }
  }

  private async test6_DataIntegrity(): Promise<void> {
    const testName = 'Data Integrity Check';
    console.log(`\n🔍 Running: ${testName}`);

    try {
      if (!this.originalData) {
        throw new Error('No backup data to check');
      }

      // Verify all tables in metadata are in data
      for (const tableName of this.originalData.metadata.tables) {
        if (!this.originalData.data[tableName]) {
          throw new Error(`Table ${tableName} in metadata but not in data`);
        }
      }

      // Verify all data tables are in metadata
      for (const tableName of Object.keys(this.originalData.data)) {
        if (!this.originalData.metadata.tables.includes(tableName)) {
          console.warn(`⚠️  Table ${tableName} in data but not in metadata`);
        }
      }

      // Count total records
      let actualRecords = 0;
      for (const records of Object.values(this.originalData.data)) {
        if (Array.isArray(records)) {
          actualRecords += records.length;
        }
      }

      if (actualRecords !== this.originalData.metadata.totalRecords) {
        throw new Error(
          `Record count mismatch: metadata says ${this.originalData.metadata.totalRecords}, actual is ${actualRecords}`
        );
      }

      console.log('✅ Data integrity verified');
      this.results.push({ test: testName, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName} failed:`, message);
      this.results.push({ test: testName, passed: false, error: message });
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results');
    console.log('='.repeat(50));

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    this.results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.test}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`Total: ${this.results.length} tests`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log('='.repeat(50) + '\n');

    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Please review errors above.');
    }
  }

  getResults() {
    return this.results;
  }
}

// Export singleton instance
export const backupTests = new BackupTestSuite();

// Browser console helpers
if (typeof window !== 'undefined') {
  (window as any).testBackup = () => backupTests.runAll();
}

// Vitest placeholder to avoid "No test suite found" when running in Node
// This suite is intentionally skipped because the real tests run in the browser.
import { describe, it } from 'vitest';
describe.skip('BackupTestSuite (browser-only)', () => {
  it('placeholder', () => {});
});
