import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getVaultService } from '../services/vault.service.js';
import { getNotesDbService } from '../services/notes-db.service.js';
import { getObsidianSyncDbService } from '../services/obsidian-sync-db.service.js';
import { getSupermemoryIndexService } from '../services/supermemory-index.service.js';
import { sha256Hex } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { getSupabaseClient, getSupabaseDiagnostics, isSupabaseConfigured } from '../services/supabase.service.js';

type WorkspaceId = 'pessoal' | 'freelaw';

interface MigrateOptions {
  apply?: boolean;
  limit?: string;
  vaultId?: string;
  workspace?: string;
  include?: string;
  exclude?: string;
  reindexSupermemory?: boolean;
  debug?: boolean;
}

function toBool(v: unknown, defaultValue: boolean): boolean {
  if (v === undefined || v === null) return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (s === '') return defaultValue;
  return !(s === '0' || s === 'false' || s === 'off' || s === 'no');
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

function inferWorkspaceFromPath(rel: string, fallback: WorkspaceId): WorkspaceId {
  const p = normalizePath(rel).toLowerCase();
  if (p.includes('10-areas/profissional/freelaw')) return 'freelaw';
  return fallback;
}

function inferTypeFromPath(rel: string): string {
  const p = normalizePath(rel).toLowerCase();
  if (p.includes('20-resources/livros')) return 'livro';
  if (p.includes('20-resources/conceitos')) return 'conceito';
  if (p.includes('30-projects')) return 'projeto';
  if (p.includes('10-areas/profissional')) return 'prof';
  if (p.includes('10-areas/pessoal')) return 'pessoal';
  if (p.includes('00-inbox')) return 'inbox';
  return 'nota';
}

function getTitleFromMatter(relPath: string, parsed: matter.GrayMatterFile<string>): string {
  const data: any = parsed.data || {};
  const fromFm = typeof data.title === 'string' ? data.title.trim() : '';
  if (fromFm) return fromFm;

  // first markdown heading
  const m = /^\s*#\s+(.+)\s*$/m.exec(parsed.content || '');
  if (m && m[1]) return String(m[1]).trim().slice(0, 140);

  // filename
  return path.basename(relPath, path.extname(relPath)).trim().slice(0, 140) || 'Nota';
}

function getTagsFromMatter(parsed: matter.GrayMatterFile<string>): string[] {
  const data: any = parsed.data || {};
  const raw = data.tags;
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const t of raw) {
      if (!t) continue;
      out.push(String(t).trim());
    }
  } else if (typeof raw === 'string') {
    raw.split(/[,\n]/).forEach((t: string) => out.push(t.trim()));
  }
  return out.filter(Boolean);
}

function walkMarkdownFiles(rootAbs: string, relDir: string, include: RegExp | null, exclude: RegExp | null, out: string[]): void {
  const abs = path.join(rootAbs, relDir);
  const items = fs.readdirSync(abs, { withFileTypes: true });
  for (const it of items) {
    if (it.name.startsWith('.')) continue;
    if (it.isDirectory()) {
      if (it.name === '.obsidian' || it.name === 'node_modules' || it.name === '.trash') continue;
      walkMarkdownFiles(rootAbs, path.join(relDir, it.name), include, exclude, out);
      continue;
    }
    if (!it.isFile()) continue;
    if (!it.name.toLowerCase().endsWith('.md')) continue;
    const rel = normalizePath(path.join(relDir, it.name));
    if (exclude && exclude.test(rel)) continue;
    if (include && !include.test(rel)) continue;
    out.push(rel);
  }
}

export function createMigrateCommand(): Command {
  const migrate = new Command('migrate').description('Migra/Sync de dados (Obsidian → Supabase)');

  migrate
    .command('obsidian')
    .description('Importa notas do vault Obsidian para Supabase (incremental, com dry-run)')
    .option('--apply', 'Executa de verdade (se não passar, é dry-run)', false)
    .option('--limit <n>', 'Limite de arquivos processados (padrão: 200)', '200')
    .option('--vault-id <id>', 'Identificador do vault (padrão: default)', 'default')
    .option('--workspace <id>', 'Workspace padrão (pessoal|freelaw). Padrão: pessoal', 'pessoal')
    .option('--include <regex>', 'Regex de include no path (ex: "^10-AREAS/")')
    .option('--exclude <regex>', 'Regex de exclude no path (ex: "^40-ARCHIVE/")')
    .option('--reindex-supermemory', 'Força reindex no Supermemory para arquivos unchanged (APPLY only)', false)
    .option('--debug', 'Logs extras', false)
    .action(async (opts: MigrateOptions) => {
      const apply = !!opts.apply;
      const dryRun = !apply;
      const limit = clamp(Number(opts.limit || 200), 1, 50_000);
      const vaultId = String(opts.vaultId || 'default').trim() || 'default';
      const defaultWorkspace = (String(opts.workspace || 'pessoal').trim() as WorkspaceId) || 'pessoal';
      const include = opts.include ? new RegExp(String(opts.include)) : null;
      const exclude = opts.exclude ? new RegExp(String(opts.exclude)) : null;
      const reindexSupermemory = !!opts.reindexSupermemory;
      const debug = !!opts.debug;

      const notesDb = getNotesDbService();
      const syncDb = getObsidianSyncDbService();
      const smIndex = getSupermemoryIndexService();
      if (!dryRun) {
        if (!notesDb.enabled() || !syncDb.enabled() || !isSupabaseConfigured()) {
          console.error('❌ Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).');
          process.exit(1);
        }
        // Validate API key early (avoid spamming warnings per file)
        try {
          const supabase = getSupabaseClient();
          const { error } = await supabase.from('workspaces').select('id').limit(1);
          if (error) {
            console.error(`❌ Supabase não autenticou: ${error.message}`);
            const diag = getSupabaseDiagnostics();
            if (diag.configured) {
              console.error(`- urlHost: ${diag.urlHost}`);
              console.error(`- urlRef: ${diag.urlRef}`);
              console.error(`- keyLen: ${diag.keyLen}`);
              console.error(`- jwtRole: ${diag.jwtRole || '(não detectado)'}`);
              console.error(`- jwtIssuer: ${diag.jwtIssuer || '(não detectado)'}`);
              console.error(`- jwtRef: ${diag.jwtRef || '(não detectado)'}`);
              if (diag.note) console.error(`- nota: ${diag.note}`);
            }
            console.error('Dica: confirme que você está usando a key service_role do MESMO projeto (Settings → API).');
            process.exit(1);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`❌ Falha ao conectar no Supabase: ${msg}`);
          process.exit(1);
        }
      }

      const vault = getVaultService();
      const vaultPath = vault.getVaultPath();
      console.log(`📦 Vault: ${vaultPath}`);
      console.log(`🗄️  Supabase: notes + obsidian_sync_state`);
      console.log(`🔁 Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);

      const files: string[] = [];
      walkMarkdownFiles(vaultPath, '', include, exclude, files);
      files.sort((a, b) => a.localeCompare(b));

      const toProcess = files.slice(0, limit);
      console.log(`📝 Markdown files encontrados: ${files.length} (processando: ${toProcess.length})`);

      let created = 0;
      let skipped = 0;
      let reindexed = 0;
      let errored = 0;

      for (const rel of toProcess) {
        const abs = path.join(vaultPath, rel);
        let raw = '';
        try {
          raw = fs.readFileSync(abs, 'utf-8');
        } catch (e) {
          errored++;
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`❌ read fail: ${rel} (${msg})`);
          if (!dryRun) {
            await syncDb.upsert({
              workspaceId: inferWorkspaceFromPath(rel, defaultWorkspace),
              vaultId,
              sourcePath: rel,
              noteId: null,
              sourceHash: '',
              status: 'error',
              error: `read fail: ${msg}`,
            });
          }
          continue;
        }

        const hash = sha256Hex(raw);
        const workspaceId = inferWorkspaceFromPath(rel, defaultWorkspace);

        if (!dryRun) {
          const st = await syncDb.get(workspaceId, vaultId, rel);
          if (st && st.source_hash === hash && st.status === 'ok') {
            skipped++;
            if (debug) console.log(`⏭️  skip (unchanged): ${rel}`);

            // Backfill: if Supermemory indexing was broken previously, we can reindex even for unchanged.
            if (reindexSupermemory && smIndex.enabled() && st.note_id) {
              const note = await notesDb.getById(st.note_id, workspaceId);
              if (note) {
                await smIndex.indexSupabaseNote(note);
                reindexed++;
                if (debug) console.log(`🧠 reindexed (supermemory): notes/${note.id} <- ${rel}`);
              } else if (debug) {
                console.log(`⚠️  reindex skipped (note not found): ${rel} note_id=${st.note_id}`);
              }
            }
            continue;
          }
        }

        const parsed = matter(raw);
        const title = getTitleFromMatter(rel, parsed);
        const tags = Array.from(
          new Set([
            ...getTagsFromMatter(parsed).map(t => t.toLowerCase()),
            `tipo/${inferTypeFromPath(rel)}`,
            'origem/obsidian',
          ]),
        );
        const type = inferTypeFromPath(rel);

        if (dryRun) {
          created++;
          if (debug) {
            console.log(`✅ would import: ${rel} -> ${workspaceId} title="${title}" tags=${tags.slice(0, 6).join(', ')}`);
          }
          continue;
        }

        try {
          const note = await notesDb.createNote({
            title,
            bodyMd: raw,
            type,
            tags,
            source: 'obsidian-import',
            context: workspaceId as any,
            workspaceId,
            sourcePath: rel,
            sourceHash: hash,
            vaultId,
            importedAt: new Date().toISOString(),
            rawFrontmatter: (parsed.data || {}) as any,
          });

          await syncDb.upsert({
            workspaceId,
            vaultId,
            sourcePath: rel,
            noteId: note.id,
            sourceHash: hash,
            fileMtime: null,
            status: 'ok',
            error: '',
          });
          created++;
          if (debug) console.log(`✅ imported: ${rel} -> notes/${note.id}`);
        } catch (e) {
          errored++;
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`❌ import fail: ${rel} (${msg})`);
          try {
            await syncDb.upsert({
              workspaceId,
              vaultId,
              sourcePath: rel,
              noteId: null,
              sourceHash: hash,
              fileMtime: null,
              status: 'error',
              error: msg.slice(0, 900),
            });
          } catch {
            // ignore
          }
        }
      }

      console.log('\n=== Resultado ===');
      console.log(`- created: ${created}`);
      console.log(`- skipped: ${skipped}`);
      if (!dryRun && reindexSupermemory) console.log(`- reindexed(supermemory): ${reindexed}`);
      console.log(`- errored: ${errored}`);
      if (dryRun) {
        console.log('\nℹ️ Rode com --apply para gravar no Supabase (após aplicar o schema atualizado no Supabase).');
      } else {
        console.log('\n✅ Import finalizado.');
      }
    });

  return migrate;
}

