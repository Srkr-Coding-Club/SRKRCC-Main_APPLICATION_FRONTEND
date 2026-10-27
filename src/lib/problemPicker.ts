/** One problem statement as the team form's picker shows it (already limited to what the team may choose). */
export interface PickerEntry {
  id: string;
  code: string;
  title: string;
  domain: string;
  description: string;
  tags: string[];
  /** "Full", "3 left" or "Current"; empty when the statement has no cap. */
  hint: string;
  /** Full statements stay visible but cannot be chosen. */
  disabled: boolean;
}

export const ALL_DOMAINS = '';

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** Every typed word must appear in the code, title, domain or a tag, so "iot twin" finds "digital twin ... IoT". */
export function filterEntries(entries: PickerEntry[], query: string, domain: string = ALL_DOMAINS): PickerEntry[] {
  const words = normalise(query).split(' ').filter(Boolean);
  return entries.filter((entry) => {
    if (domain !== ALL_DOMAINS && entry.domain !== domain) return false;
    if (!words.length) return true;
    const haystack = normalise([entry.code, entry.title, entry.domain, ...entry.tags].join(' '));
    return words.every((word) => haystack.includes(word));
  });
}

/** Domains in first-seen order with how many statements each holds (statements without a domain are not listed). */
export function domainCounts(entries: PickerEntry[]): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) if (entry.domain) counts.set(entry.domain, (counts.get(entry.domain) ?? 0) + 1);
  return [...counts].map(([domain, count]) => ({ domain, count }));
}

export function slotHint(slotsLeft: number | null, isCurrent: boolean): { hint: string; disabled: boolean } {
  if (slotsLeft === 0 && !isCurrent) return { hint: 'Full', disabled: true };
  if (slotsLeft !== null) return { hint: `${slotsLeft} left`, disabled: false };
  return { hint: '', disabled: false };
}
