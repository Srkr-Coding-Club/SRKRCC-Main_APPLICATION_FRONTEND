import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { envFilePath, stateDir } from './live';

/** Stop the backend, and remove the file that holds the throw-away database's address. */
export default async function globalTeardown() {
  const pidFile = join(stateDir, 'backend.pid');
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf-8').trim();
    try {
      if (process.platform === 'win32') execFileSync('taskkill', ['/PID', pid, '/F', '/T'], { stdio: 'ignore' });
      else process.kill(Number(pid));
    } catch { /* already gone */ }
  }
  rmSync(envFilePath, { force: true });
}
