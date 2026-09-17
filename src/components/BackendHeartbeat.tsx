'use client';

import { useEffect } from 'react';

// 10 minutes in milliseconds (600,000 ms)
const PING_INTERVAL_MS = 10 * 60 * 1000;

export default function BackendHeartbeat() {
  useEffect(() => {
    let lastPing = Date.now();

    const sendPing = async () => {
      try {
        lastPing = Date.now();
        // Ping the backend via the same-origin Next.js BFF proxy
        await fetch('/api/proxy/ping/', {
          method: 'GET',
          cache: 'no-store',
          keepalive: true,
        });
      } catch {
        // Silent failure — keepalive is non-intrusive and never interrupts user flow
      }
    };

    // Set up regular interval to ping every 10 minutes
    const intervalId = setInterval(sendPing, PING_INTERVAL_MS);

    // Wake-up handler: if the browser tab was backgrounded or computer slept,
    // immediately wake up the backend if 10+ minutes have elapsed since last ping
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastPing = Date.now() - lastPing;
        if (timeSinceLastPing >= PING_INTERVAL_MS) {
          sendPing();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Pure side-effect component, renders nothing in the DOM
  return null;
}
