import { cache } from 'react';
import { fetchApi } from '@/lib/api-client';
import type { CertificateVerification, EventCertificateVerification } from '@/lib/types';

/** Event certificate codes start with this; hackathon codes do not. */
export const EVENT_CODE_PREFIX = 'ev.';

export interface VerifiedCertificate {
  name: string;
  /** The event or hackathon the certificate is for. */
  subject: string;
  /** "Participation" or "Award: Best Project". */
  type: string;
  team: string | null;
}

const enc = encodeURIComponent;

function fromHackathon(result: CertificateVerification): VerifiedCertificate {
  return { name: result.name, subject: result.hackathon, type: result.award ? `Award: ${result.award}` : 'Participation', team: result.team || null };
}

function fromEvent(result: EventCertificateVerification): VerifiedCertificate {
  return { name: result.name, subject: result.event, type: 'Participation', team: null };
}

/** Looks the code up with the right module; null when it is not a genuine certificate. Cached per request. */
export const lookupCertificate = cache(async (code: string): Promise<VerifiedCertificate | null> => {
  try {
    if (code.startsWith(EVENT_CODE_PREFIX)) return fromEvent(await fetchApi<EventCertificateVerification>(`/events/certificates/verify/${enc(code)}/`));
    return fromHackathon(await fetchApi<CertificateVerification>(`/hackathons/certificates/verify/${enc(code)}/`));
  } catch {
    return null;
  }
});
