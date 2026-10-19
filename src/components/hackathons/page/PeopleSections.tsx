import React from 'react';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import type { HackathonContact, HackathonSponsor, PublicPerson } from '@/lib/types';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');

/** Mentors or judges: a profile card each. */
export function PeopleGrid({ people }: { people: PublicPerson[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {people.map((person, index) => (
        <li key={`${person.name}-${index}`} className="flex gap-3 rounded-2xl border border-journey-text/10 bg-journey-surface/60 p-4">
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-journey-accent/15 text-sm font-bold text-journey-accent">{initials(person.name)}</span>
          )}
          <div className="min-w-0 space-y-0.5">
            <p className="font-bold text-journey-text">{person.name}</p>
            {person.role && <p className="text-xs font-semibold text-journey-accent">{person.role}</p>}
            {person.bio && <p className="text-sm text-journey-muted">{person.bio}</p>}
            {person.link && (
              <a href={person.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-journey-accent hover:underline">
                Profile <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Sponsors grouped by tier, in the order the organizers listed them. */
export function SponsorsGrid({ sponsors }: { sponsors: HackathonSponsor[] }) {
  const tiers = [...new Set(sponsors.map((sponsor) => sponsor.tier))];
  return (
    <div className="space-y-5">
      {tiers.map((tier) => (
        <div key={tier || 'partners'} className="space-y-2">
          {tier && <p className="text-xs font-bold uppercase tracking-[0.18em] text-journey-muted">{tier}</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sponsors.filter((sponsor) => sponsor.tier === tier).map((sponsor, index) => {
              const content = sponsor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-12 w-auto max-w-full object-contain" loading="lazy" />
              ) : (
                <span className="text-sm font-bold text-journey-text">{sponsor.name}</span>
              );
              return (
                <li key={`${sponsor.name}-${index}`} className="flex min-h-20 items-center justify-center rounded-xl border border-journey-text/10 bg-white/90 p-3 dark:bg-white/95">
                  {sponsor.url ? <a href={sponsor.url} target="_blank" rel="noopener noreferrer" aria-label={sponsor.name} className="flex h-full w-full items-center justify-center">{content}</a> : content}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Who to ask, plus community chats and a directions button. */
export function ContactBlock({ contacts, links, mapUrl }: { contacts: HackathonContact[]; links: { label: string; url: string }[]; mapUrl?: string | null }) {
  return (
    <div className="space-y-5">
      {contacts.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((contact, index) => (
            <li key={`${contact.name}-${index}`} className="space-y-1 rounded-xl border border-journey-text/10 p-4">
              <p className="font-bold text-journey-text">{contact.name}</p>
              {contact.role && <p className="text-xs text-journey-muted">{contact.role}</p>}
              {contact.email && <p className="flex items-center gap-1.5 text-sm text-journey-text/80"><Mail className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" /><a href={`mailto:${contact.email}`} className="break-all hover:underline">{contact.email}</a></p>}
              {contact.phone && <p className="flex items-center gap-1.5 text-sm text-journey-text/80"><Phone className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" /><a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="hover:underline">{contact.phone}</a></p>}
            </li>
          ))}
        </ul>
      )}
      {(links.length > 0 || mapUrl) && (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-journey-text/10 px-4 text-sm font-bold text-journey-text/80 transition hover:border-journey-accent/50 hover:text-journey-accent sm:min-h-10">
              {link.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ))}
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-journey-accent px-4 text-sm font-bold text-white sm:min-h-10">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Get directions
            </a>
          )}
        </div>
      )}
    </div>
  );
}
