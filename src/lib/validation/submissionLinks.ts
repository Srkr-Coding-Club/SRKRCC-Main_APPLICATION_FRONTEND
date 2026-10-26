/**
 * Instant link checks for idea and project forms. They mirror the server rules (apps/hackathons/link_rules.py), which
 * stay the authority: this only saves a round trip. Reachability is deliberately not checked.
 */
export const MAX_URL_LENGTH = 200;

export type LinkKind = 'any' | 'repo' | 'video' | 'linkedin';

const CODE_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org', 'dev.azure.com', 'sourceforge.net', 'git.sr.ht', 'huggingface.co'];
const VIDEO_HOSTS = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'loom.com', 'streamable.com', 'drive.google.com', 'dropbox.com', '1drv.ms',
  'onedrive.live.com', 'sharepoint.com', 'linkedin.com', 'lnkd.in', 'instagram.com', 'facebook.com', 'fb.watch', 'x.com', 'twitter.com',
];
const LINKEDIN_HOSTS = ['linkedin.com', 'lnkd.in'];
const PRIVATE_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet'];

const onHost = (host: string, names: string[]) => names.some((name) => host === name || host.endsWith(`.${name}`));

function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  const bare = host.replace(/^\[|\]$/g, '');
  if (bare.includes(':')) return true; // IPv6 literal
  const v4 = bare.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224 || (a === 100 && b >= 64 && b <= 127);
}

/** The problem with a link as a short sentence, or '' when it is fine (an empty optional link is fine). */
export function linkProblem(value: string, label: string, kind: LinkKind = 'any', required = false): string {
  const text = (value ?? '').trim();
  if (!text) return required ? `${label} is required.` : '';
  if (text.length > MAX_URL_LENGTH) return `${label} is too long (at most ${MAX_URL_LENGTH} characters). Use a shorter link.`;
  if (/\s/.test(text)) return `${label} must not contain spaces.`;
  if (!/^https:\/\//i.test(text)) return `${label} must be a full https:// link.`;
  let url: URL;
  try { url = new URL(text); } catch { return `${label} must be a full https:// link.`; }
  if (url.username || url.password) return `${label} must not contain a username or password.`;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || isPrivateHost(host) || (!host.includes('.') && !host.startsWith('['))) return `${label} must be a public website, not a local or private address.`;
  if (kind === 'repo') {
    if (!onHost(host, CODE_HOSTS)) return `${label} must be on a code host such as GitHub, GitLab or Bitbucket.`;
    if (url.pathname.split('/').filter(Boolean).length < 2) return `${label} must point at the repository itself (for example https://github.com/owner/repo).`;
  } else if (kind === 'video' && !onHost(host, VIDEO_HOSTS)) {
    return `${label} must be on a video site such as YouTube, Vimeo, Loom or Google Drive.`;
  } else if (kind === 'linkedin' && !onHost(host, LINKEDIN_HOSTS)) {
    return `${label} must be a LinkedIn link (linkedin.com).`;
  }
  return '';
}
