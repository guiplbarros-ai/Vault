import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { logger } from '../utils/logger.js';

config();

class VaultService {
  private vaultPath: string;
  private dirCache = new Map<string, { ts: number; folders: string[]; files: string[] }>();
  private dirCacheTtlMs: number;

  constructor() {
    const envPath = process.env.OBSIDIAN_VAULT_PATH;
    
    if (!envPath) {
      throw new Error(
        'OBSIDIAN_VAULT_PATH não configurado. ' +
        'Copie env.example para .env e configure o caminho do vault.'
      );
    }

    this.vaultPath = envPath;

    this.dirCacheTtlMs = Number.isFinite(Number(process.env.VAULT_DIR_CACHE_MS))
      ? Math.max(0, Number(process.env.VAULT_DIR_CACHE_MS))
      : 30_000;
    
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
      // Invalidate parent dir cache so new folder appears
      this.invalidateDirCache(path.dirname(relativePath));
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
    this.invalidateDirCache(path.dirname(relativePath));
  }

  appendToFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.vaultPath, relativePath);
    fs.appendFileSync(fullPath, content, 'utf-8');
    this.invalidateDirCache(path.dirname(relativePath));
  }

  getFullPath(relativePath: string): string {
    return path.join(this.vaultPath, relativePath);
  }

  listFolders(relativePath: string = ''): string[] {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      const { folders } = this.readDirCached(fullPath);
      return folders;
    } catch {
      return [];
    }
  }

  listFiles(relativePath: string, extension: string = '.md'): string[] {
    const fullPath = path.join(this.vaultPath, relativePath);
    try {
      const { files } = this.readDirCached(fullPath);
      return files.filter(f => f.endsWith(extension));
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

  private invalidateDirCache(relativeDir: string): void {
    // relativeDir can be "." when path.dirname("file.md") -> "."
    const rel = relativeDir === '.' ? '' : relativeDir;
    const fullPath = path.join(this.vaultPath, rel);
    this.dirCache.delete(fullPath);
  }

  private readDirCached(fullPath: string): { folders: string[]; files: string[] } {
    const ttl = this.dirCacheTtlMs;
    if (ttl === 0) return this.readDirUncached(fullPath);

    const now = Date.now();
    const cached = this.dirCache.get(fullPath);
    if (cached && now - cached.ts <= ttl) {
      return { folders: cached.folders, files: cached.files };
    }

    const fresh = this.readDirUncached(fullPath);
    this.dirCache.set(fullPath, { ts: now, folders: fresh.folders, files: fresh.files });
    return fresh;
  }

  private readDirUncached(fullPath: string): { folders: string[]; files: string[] } {
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    const folders = items
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(item => item.name);
    const files = items
      .filter(item => item.isFile())
      .map(item => item.name);
    return { folders, files };
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

