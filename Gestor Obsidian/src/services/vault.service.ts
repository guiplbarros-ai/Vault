import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { logger } from '../utils/logger.js';

config();

class VaultService {
  private vaultPath: string;

  constructor() {
    const envPath = process.env.OBSIDIAN_VAULT_PATH;
    
    if (!envPath) {
      throw new Error(
        'OBSIDIAN_VAULT_PATH não configurado. ' +
        'Copie env.example para .env e configure o caminho do vault.'
      );
    }

    this.vaultPath = envPath;
    
    if (!this.vaultExists()) {
      throw new Error(`Vault não encontrado em: ${this.vaultPath}`);
    }
  }

  getVaultPath(): string {
    return this.vaultPath;
  }

  vaultExists(): boolean {
    try {
      return fs.existsSync(this.vaultPath) && 
             fs.statSync(this.vaultPath).isDirectory();
    } catch {
      return false;
    }
  }

  folderExists(relativePath: string): boolean {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  }

  fileExists(relativePath: string): boolean {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  }

  ensureFolder(relativePath: string): void {
    const fullPath = path.join(this.vaultPath, relativePath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      logger.info(`Pasta criada: ${relativePath}`);
    }
  }

  readFile(relativePath: string): string | null {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      return fs.readFileSync(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  writeFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.vaultPath, relativePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  appendToFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.vaultPath, relativePath);
    fs.appendFileSync(fullPath, content, 'utf-8');
  }

  getFullPath(relativePath: string): string {
    return path.join(this.vaultPath, relativePath);
  }

  listFolders(relativePath: string = ''): string[] {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      const items = fs.readdirSync(fullPath, { withFileTypes: true });
      return items
        .filter(item => item.isDirectory() && !item.name.startsWith('.'))
        .map(item => item.name);
    } catch {
      return [];
    }
  }

  listFiles(relativePath: string, extension: string = '.md'): string[] {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      const items = fs.readdirSync(fullPath, { withFileTypes: true });
      return items
        .filter(item => item.isFile() && item.name.endsWith(extension))
        .map(item => item.name);
    } catch {
      return [];
    }
  }

  findFileByPattern(folder: string, pattern: string): string | null {
    const files = this.listFiles(folder);
    const regex = new RegExp(pattern, 'i');
    const found = files.find(f => regex.test(f));
    return found ? path.join(folder, found) : null;
  }
}

// Singleton instance
let vaultServiceInstance: VaultService | null = null;

export function getVaultService(): VaultService {
  if (!vaultServiceInstance) {
    vaultServiceInstance = new VaultService();
  }
  return vaultServiceInstance;
}

export { VaultService };

