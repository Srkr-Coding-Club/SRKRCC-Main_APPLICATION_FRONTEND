/** QR scans made without a connection, kept on this device until they can be sent. */
export interface QueuedScan {
  code: string;
  scannedAt: string;
  /** The session the scan was for; absent on scans saved before sessions existed, which mean the main session. */
  session?: number;
}

const key = (slug: string) => `hackathon-check-in-queue:${slug}`;

export function loadQueue(slug: string): QueuedScan[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(slug)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item?.code === 'string' && typeof item?.scannedAt === 'string') : [];
  } catch {
    return [];
  }
}

function saveQueue(slug: string, queue: QueuedScan[]) {
  try {
    if (queue.length) window.localStorage.setItem(key(slug), JSON.stringify(queue));
    else window.localStorage.removeItem(key(slug));
  } catch {
    // Storage full or blocked: the scan still shows on screen, it just will not survive a reload.
  }
}

const same = (item: QueuedScan, code: string, session?: number) => item.code === code && (item.session ?? 0) === (session ?? 0);

/** Adds a scan unless the same code is already waiting for the same session (a person is only checked in once per session). */
export function enqueueScan(slug: string, code: string, session?: number, scannedAt = new Date().toISOString()): QueuedScan[] {
  const queue = loadQueue(slug);
  if (!queue.some((item) => same(item, code, session))) queue.push(session ? { code, scannedAt, session } : { code, scannedAt });
  saveQueue(slug, queue);
  return queue;
}

export function dequeueScan(slug: string, code: string, session?: number): QueuedScan[] {
  const queue = loadQueue(slug).filter((item) => !same(item, code, session));
  saveQueue(slug, queue);
  return queue;
}

/** Gateway and rate-limit answers that mean "try again later", not "this scan is wrong". */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

/** True for a failure worth retrying later: no response at all (offline, dropped wifi) or a temporary server answer. */
export function isNetworkFailure(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return !status || RETRYABLE_STATUSES.has(status);
}
