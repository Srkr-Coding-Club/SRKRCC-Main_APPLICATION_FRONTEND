// Only http(s)/mailto/tel and in-app relative paths are safe to hand to a
// DOM `href`/`src` — blocks `javascript:`/`data:` payloads embedded in
// untrusted content (authored Markdown, form-response file answers) from
// executing when another viewer clicks or the resource loads.
const SAFE_URL_SCHEME = /^(https?:|mailto:|tel:)/i;

export function isSafeHref(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }
  return SAFE_URL_SCHEME.test(trimmed);
}

// Broader than isSafeHref: form-response file answers legitimately carry
// `data:` URIs (inline signature/camera captures never uploaded to storage),
// so this blocks only the schemes a browser will actually execute on click
// (`javascript:`/`vbscript:`) rather than requiring a fixed scheme allowlist.
const EXECUTABLE_URL_SCHEME = /^\s*(javascript|vbscript):/i;

export function isSafeFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !EXECUTABLE_URL_SCHEME.test(url);
}
