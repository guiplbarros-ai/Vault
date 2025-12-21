import * as fs from 'node:fs';
import * as path from 'node:path';

export type ProcessLock = {
  lockPath: string;
  release: () => void;
};

function isPidRunning(pid: number): boolean {
  try {
    // Signal 0 only checks for existence/permission.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function safeUnlink(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

/**
 * Simple cross-process lock based on exclusive file creation.
 * Prevents two bot instances from running polling at the same time (common source of Telegram 409 Conflict).
 */
export function acquireProcessLockSync(lockPath: string): ProcessLock {
  const resolved = path.isAbsolute(lockPath) ? lockPath : path.join(process.cwd(), lockPath);

  const tryAcquire = (): fs.WriteStream => {
    // Using createWriteStream with 'wx' gives us atomic exclusive creation.
    return fs.createWriteStream(resolved, { flags: 'wx', encoding: 'utf8' });
  };

  try {
    const stream = tryAcquire();
    const payload = JSON.stringify(
      { pid: process.pid, startedAt: new Date().toISOString(), cwd: process.cwd() },
      null,
      2,
    );
    stream.end(payload);

    return {
      lockPath: resolved,
      release: () => safeUnlink(resolved),
    };
  } catch (err: any) {
    // Lock already exists: try to detect stale lock and recover.
    if (err?.code !== 'EEXIST') throw err;

    try {
      const raw = fs.readFileSync(resolved, 'utf8');
      const parsed = JSON.parse(raw) as { pid?: number };
      const pid = typeof parsed?.pid === 'number' ? parsed.pid : undefined;

      if (pid && isPidRunning(pid)) {
        throw new Error(
          [
            `Outra instância do bot já está rodando (pid ${pid}).`,
            `Pare a outra instância (Ctrl+C) antes de iniciar novamente.`,
            `Lock: ${resolved}`,
          ].join(' '),
        );
      }

      // Stale lock: remove and retry once.
      safeUnlink(resolved);
      const stream = tryAcquire();
      const payload = JSON.stringify(
        { pid: process.pid, startedAt: new Date().toISOString(), cwd: process.cwd(), recoveredFromStale: true },
        null,
        2,
      );
      stream.end(payload);

      return {
        lockPath: resolved,
        release: () => safeUnlink(resolved),
      };
    } catch (e) {
      // If parsing fails, or we couldn't remove it, surface a helpful error.
      if (e instanceof Error) throw e;
      throw err;
    }
  }
}


