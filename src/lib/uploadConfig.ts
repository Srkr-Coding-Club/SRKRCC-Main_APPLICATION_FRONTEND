import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api-client';

export interface UploadConfig {
  direct_upload: boolean;
  default_mb: number;
  max_mb: number;
}

const FALLBACK: UploadConfig = { direct_upload: false, default_mb: 4, max_mb: 4 };
let cached: Promise<UploadConfig> | null = null;

/** What the server allows for file questions: where files go, the size used when an admin sets none, and the largest an admin may set. */
export function loadUploadConfig(): Promise<UploadConfig> {
  if (!cached) {
    cached = fetchApi<UploadConfig>('/forms/upload-config/').catch(() => {
      cached = null;
      return FALLBACK;
    });
  }
  return cached;
}

export function useUploadConfig(): UploadConfig & { loaded: boolean } {
  const [config, setConfig] = useState<UploadConfig & { loaded: boolean }>({ ...FALLBACK, loaded: false });
  useEffect(() => {
    let live = true;
    void loadUploadConfig().then((found) => live && setConfig({ ...found, loaded: true }));
    return () => { live = false; };
  }, []);
  return config;
}

/** The note shown under an admin's "Max file size" box. */
export function fileLimitHint(config: UploadConfig, chosen: number | string | undefined): string {
  const asked = Number(chosen);
  if (Number.isFinite(asked) && asked > config.max_mb) return `Over the platform maximum of ${config.max_mb} MB: it will not save.`;
  return `Blank = ${config.default_mb} MB. Largest allowed: ${config.max_mb} MB.`;
}
