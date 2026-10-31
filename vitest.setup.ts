import { configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// A full run keeps every core busy; the default one second to wait for something to appear is then too tight and makes
// tests that pass alone fail at random.
configure({ asyncUtilTimeout: 4000 });

// A form keeps a copy of unfinished answers in session storage; one test's answers must never reach the next test.
afterEach(() => {
  try { sessionStorage.clear(); } catch { /* not a browser-like environment */ }
});
