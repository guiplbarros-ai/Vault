import * as fs from 'node:fs'
import * as path from 'node:path'

export type ProcessLock = {
  lockPath: string
  release: () => void
}

function isPidRunning(pid: number): boolean {
  try {
    // Signal 0 only checks for existence/permission.
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function safeUnlink(filePath: string): void {
  try {
    fs.unlinkSync(filePath)
  } catch {
    // ignore
  }
}

/**
 * Simple cross-process lock based on exclusive file creation.
 * Prevents two bot instances from running polling at the same time (common source of Telegram 409 Conflict).
 */
export function acquireProcessLockSync(lockPath: string): ProcessLock {
  const resolved = path.isAbsolute(lockPath) ? lockPath : path.join(process.cwd(), lockPath)

  const writeLockFile = (payload: unknown): void => {
    // IMPORTANT:
    // - createWriteStream emits errors asynchronously (can crash if unhandled).
    // - We want a *synchronous* exclusive creation so errors are catchable here.
    //
    // Using openSync with 'wx' is atomic and throws EEXIST synchronously.
    const fd = fs.openSync(resolved, 'wx')
    try {
      const body = JSON.stringify(payload, null, 2)
      fs.writeFileSync(fd, body, { encoding: 'utf8' })
    } finally {
      try {
        fs.closeSync(fd)
      } catch {
        // ignore
      }
    }
  }

  try {
    writeLockFile({ pid: process.pid, startedAt: new Date().toISOString(), cwd: process.cwd() })

    return {
      lockPath: resolved,
      release: () => safeUnlink(resolved),
    }
  } catch (err: any) {
    // Lock already exists: try to detect stale lock and recover.
    if (err?.code !== 'EEXIST') throw err

    try {
      const raw = fs.readFileSync(resolved, 'utf8')
      const parsed = JSON.parse(raw) as { pid?: number }
      const pid = typeof parsed?.pid === 'number' ? parsed.pid : undefined

      if (pid && isPidRunning(pid)) {
        throw new Error(
          [
            `Outra instância do bot já está rodando (pid ${pid}).`,
            `Pare a outra instância (Ctrl+C) antes de iniciar novamente.`,
            `Lock: ${resolved}`,
          ].join(' ')
        )
      }

      // Stale lock: remove and retry once.
      safeUnlink(resolved)
      writeLockFile({
        pid: process.pid,
        startedAt: new Date().toISOString(),
        cwd: process.cwd(),
        recoveredFromStale: true,
      })

      return {
        lockPath: resolved,
        release: () => safeUnlink(resolved),
      }
    } catch (e) {
      // If parsing fails, or we couldn't remove it, surface a helpful error.
      if (e instanceof Error) throw e
      throw err
    }
  }
}
