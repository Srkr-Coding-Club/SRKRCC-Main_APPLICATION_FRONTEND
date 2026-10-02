export const INPUT =
  'w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]';
export const LABEL = 'block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1';
export const PANEL = 'glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6';
export const BTN = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
export const BTN_PRIMARY = `${BTN} bg-[#FF7A00] text-white hover:bg-[#E06B00]`;
export const BTN_GHOST = `${BTN} border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`;
export const BTN_DANGER = `${BTN} text-rose-600 dark:text-rose-400 hover:bg-rose-500/10`;

/** ISO → value for <input type="datetime-local"> in the browser's local zone. */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO (or null when blank). */
export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** First message from a DRF field-error body ({field: ["msg"]}) or a {detail} body. */
export function firstFieldErrors(body: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!body || typeof body !== 'object') return out;
  if (body.field && body.detail) {
    out[body.field] = body.detail;
    return out;
  }
  for (const [k, v] of Object.entries(body)) {
    if (k === 'detail' || k === 'code') continue;
    out[k] = Array.isArray(v) ? String(v[0]) : String(v);
  }
  return out;
}
