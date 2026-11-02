import { ImageResponse } from 'next/og';
import { lookupCertificate } from '@/lib/certificateVerify';

export const dynamic = 'force-dynamic';
export const alt = 'Certificate verification';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const ORANGE = '#FF7A00';
const BURGUNDY = '#8B2E3B';
const NAVY = '#1A1A2E';

/** The card shown when a verification link is shared: who it was awarded to and for what, or a plain "not verified". */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const result = await lookupCertificate(decodeURIComponent((await params).code));

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: '#FFFFFF', border: `16px solid ${ORANGE}`, color: NAVY }}>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, color: '#64748B' }}>SRKR CODING CLUB</div>
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', fontSize: 34, color: '#047857', fontWeight: 700 }}>Verified certificate</div>
            <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, color: BURGUNDY, lineHeight: 1.05 }}>{result.name}</div>
            <div style={{ display: 'flex', fontSize: 40 }}>{`${result.type} · ${result.subject}`}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800 }}>Certificate not verified</div>
        )}
        <div style={{ display: 'flex', fontSize: 26, color: '#64748B' }}>Check any SRKR Coding Club certificate at this link</div>
      </div>
    ),
    size,
  );
}
