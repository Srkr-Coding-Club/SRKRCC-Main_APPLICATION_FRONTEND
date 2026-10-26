import React from 'react';
import { Award } from 'lucide-react';
import type { HackathonCertificate } from '@/lib/types';

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** The certificate itself. Fixed light colours on purpose: it is printed or saved as a PDF. */
export function CertificateSheet({ certificate }: { certificate: HackathonCertificate }) {
  return (
    <div className="certificate-print mx-auto w-full sm:aspect-[1.414/1] max-w-4xl rounded-lg border-[10px] border-double border-[#FF7A00] bg-white p-6 text-center text-[#1A1A2E] shadow-xl sm:p-10">
      <div className="flex h-full flex-col items-center justify-between gap-6">
        <div className="space-y-2">
          <Award className="mx-auto h-10 w-10 text-[#C2410C]" aria-hidden="true" />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500 sm:text-xs">{certificate.organizer}</p>
          <h2 className="font-display text-xl font-extrabold leading-tight sm:text-4xl">{certificate.title}</h2>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] text-slate-500 sm:text-sm">This is proudly presented to</p>
          <p className="font-display text-2xl font-extrabold text-[#8B2E3B] sm:text-5xl">{certificate.name}</p>
          <p className="mx-auto max-w-2xl text-xs leading-relaxed sm:text-lg">{certificate.body}</p>
        </div>
        <div className="flex w-full items-end justify-between gap-4 text-[11px] sm:text-sm">
          <div className="text-left">
            <p className="font-semibold">{dateFormat.format(new Date(certificate.date))}</p>
            <p className="text-slate-500">{certificate.hackathon}</p>
          </div>
          {(certificate.signatory_name || certificate.signatory_title) && (
            <div className="border-t border-slate-400 px-4 pt-1 text-center">
              <p className="font-bold">{certificate.signatory_name}</p>
              <p className="text-slate-500">{certificate.signatory_title}</p>
            </div>
          )}
          <div className="max-w-[40%] text-right">
            <p className="text-slate-500">Verification code</p>
            <p className="break-all font-mono text-[10px] sm:text-[11px]">{certificate.code.length > 40 ? `${certificate.code.slice(0, 36)}…` : certificate.code}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
