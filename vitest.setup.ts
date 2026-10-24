import { afterEach } from 'vitest';

// A form keeps a copy of unfinished answers in session storage; one test's answers must never reach the next test.
afterEach(() => {
  try { sessionStorage.clear(); } catch { /* not a browser-like environment */ }
});
