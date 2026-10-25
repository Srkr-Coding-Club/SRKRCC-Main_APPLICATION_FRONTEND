import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BACKEND_URL, BUCKET, SITE_URL, STORAGE_URL, backendDir, envFilePath, liveEnv, mailDir, python, stateDir } from './live';

/** Build a throw-away database, migrate it, and start the real backend on port 8001. */
export default async function globalSetup() {
  rmSync(stateDir, { recursive: true, force: true });
  mkdirSync(mailDir, { recursive: true });

  execFileSync(python, [join(__dirname, 'django', 'prepare_db.py'), envFilePath], {
    cwd: backendDir, env: { ...process.env, PYTHONPATH: backendDir, DEBUG: 'True' }, stdio: 'inherit',
  });
  execFileSync(python, ['manage.py', 'migrate', '--noinput'], { cwd: backendDir, env: liveEnv(), stdio: ['ignore', 'ignore', 'inherit'] });

  // The upload scenarios need the S3 stand-in (LocalStack); everything else runs without it.
  try {
    execFileSync(python, [join(__dirname, 'django', 'prepare_bucket.py'), STORAGE_URL, BUCKET, SITE_URL], {
      cwd: backendDir, env: liveEnv(), stdio: ['ignore', 'inherit', 'ignore'],
    });
  } catch {
    console.warn(`LocalStack is not reachable at ${STORAGE_URL}: file-upload scenarios will fail, the others do not need it.`);
  }

  const log = join(stateDir, 'backend.log');
  writeFileSync(log, '');
  const server = spawn(python, ['manage.py', 'runserver', '127.0.0.1:8001', '--noreload'], {
    cwd: backendDir, env: liveEnv(), stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true,
  });
  writeFileSync(join(stateDir, 'backend.pid'), String(server.pid));

  const deadline = Date.now() + 90_000;
  for (;;) {
    try {
      const reply = await fetch(`${BACKEND_URL}/api/forms/`);
      if (reply.status < 500) break;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error('The live backend did not start within 90 seconds.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
