import { fetchApi } from '@/lib/api-client';
import { downloadServerExport, type ExportFormat } from '@/lib/exportApi';
import type {
  EventCertificate, EventCertificateSettings, EventCertificateSettingsInput, EventCertificateVerification,
  EventFeedbackInput, EventFeedbackState, EventFeedbackSummary,
} from '@/lib/types';

const enc = encodeURIComponent;

export const eventFeedbackApi = {
  mine: (slug: string) => fetchApi<EventFeedbackState>(`/events/${enc(slug)}/feedback/`),
  save: (slug: string, body: EventFeedbackInput) =>
    fetchApi<EventFeedbackInput>(`/events/${enc(slug)}/feedback/`, { method: 'PUT', body: JSON.stringify(body) }),
  summary: (slug: string) => fetchApi<EventFeedbackSummary>(`/events/${enc(slug)}/feedback/summary/`),
  exportFile: (slug: string, format: ExportFormat) => downloadServerExport(`/events/${enc(slug)}/feedback/export/`, format, {}, `${slug}-feedback.${format}`),
};

export const eventCertificateApi = {
  mine: (slug: string) => fetchApi<EventCertificate>(`/events/${enc(slug)}/my-certificate/`),
  settings: (slug: string) => fetchApi<EventCertificateSettings>(`/events/${enc(slug)}/certificates/`),
  saveSettings: (slug: string, body: EventCertificateSettingsInput) =>
    fetchApi<EventCertificateSettings>(`/events/${enc(slug)}/certificates/`, { method: 'PUT', body: JSON.stringify(body) }),
  verify: (code: string) => fetchApi<EventCertificateVerification>(`/events/certificates/verify/${enc(code)}/`),
};

export const eventRegistrationApi = {
  /** The member cancels their own registration; the server refuses once the event has started or they were checked in. */
  cancel: (slug: string) => fetchApi<void>(`/events/${enc(slug)}/my-registration/`, { method: 'DELETE' }),
};
