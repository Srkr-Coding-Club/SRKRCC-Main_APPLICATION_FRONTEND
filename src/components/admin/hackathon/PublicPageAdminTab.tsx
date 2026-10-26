'use client';

import React, { useEffect, useState } from 'react';
import { Handshake, LifeBuoy, Link2, MapPin, Save, UserCheck, Users } from 'lucide-react';
import type { Hackathon, HackathonContact, HackathonSponsor, PublicPerson } from '@/lib/types';
import { ObjectListEditor, type ListField } from './ObjectListEditor';
import { BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

type CommunityLink = { label: string; url: string };

const PERSON_FIELDS: ListField<PublicPerson>[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role / company', placeholder: 'e.g. Senior engineer, Acme' },
  { key: 'bio', label: 'Short bio', type: 'textarea' },
  { key: 'photo_url', label: 'Photo link', type: 'url', placeholder: 'https://…' },
  { key: 'link', label: 'Profile link (LinkedIn, website)', type: 'url', placeholder: 'https://…' },
];
const SPONSOR_FIELDS: ListField<HackathonSponsor>[] = [
  { key: 'name', label: 'Sponsor name' },
  { key: 'tier', label: 'Tier', placeholder: 'e.g. Gold, Title sponsor' },
  { key: 'logo_url', label: 'Logo link', type: 'url', placeholder: 'https://…' },
  { key: 'url', label: 'Website', type: 'url', placeholder: 'https://…' },
];
const CONTACT_FIELDS: ListField<HackathonContact>[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role', placeholder: 'e.g. Event coordinator' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
];
const LINK_FIELDS: ListField<CommunityLink>[] = [
  { key: 'label', label: 'Label', placeholder: 'e.g. Discord' },
  { key: 'url', label: 'Link', type: 'url', placeholder: 'https://…' },
];

const blankPerson = (): PublicPerson => ({ name: '', role: '', bio: '', photo_url: '', link: '' });
const personLabel = (person: PublicPerson, index: number) => person.name || `Person ${index + 1}`;

interface PublicPageAdminTabProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
}

/** Who and what appears on the public hackathon page beyond the basics: people, sponsors, contacts, links, venue map. */
export function PublicPageAdminTab({ hackathon, onSaved }: PublicPageAdminTabProps) {
  const { busy, errors, save } = useHackathonPatch(hackathon, onSaved);
  const [mentors, setMentors] = useState<PublicPerson[]>([]);
  const [judges, setJudges] = useState<PublicPerson[]>([]);
  const [sponsors, setSponsors] = useState<HackathonSponsor[]>([]);
  const [contacts, setContacts] = useState<HackathonContact[]>([]);
  const [links, setLinks] = useState<CommunityLink[]>([]);
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    setMentors(hackathon.mentors ?? []);
    setJudges(hackathon.judges ?? []);
    setSponsors(hackathon.sponsors ?? []);
    setContacts(hackathon.contacts ?? []);
    setLinks(hackathon.community_links ?? []);
    setMapUrl(hackathon.venue_map_url ?? '');
  }, [hackathon]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void save({ mentors, judges, sponsors, contacts, community_links: links, venue_map_url: mapUrl.trim() || null }, 'Public page saved');
  };

  const error = (key: string) => errors[key] && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors[key]}</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><LifeBuoy className="h-4 w-4 text-journey-accent" /> Mentors</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">People who help teams during the event. Shown on the public page.</p>
        <ObjectListEditor<PublicPerson> items={mentors} onChange={setMentors} fields={PERSON_FIELDS} blank={blankPerson} addLabel="Add mentor" itemLabel={personLabel} max={30} reorderable emptyText="No mentors listed." />
        {error('mentors')}
      </section>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><UserCheck className="h-4 w-4 text-journey-accent" /> Judges on the public page</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">A profile card for each judge. This is separate from who can score: assign scorers in the Judging tab.</p>
        <ObjectListEditor<PublicPerson> items={judges} onChange={setJudges} fields={PERSON_FIELDS} blank={blankPerson} addLabel="Add judge" itemLabel={personLabel} max={30} reorderable emptyText="No judges listed." />
        {error('judges')}
      </section>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Handshake className="h-4 w-4 text-journey-accent" /> Sponsors and partners</h3>
        <ObjectListEditor<HackathonSponsor> items={sponsors} onChange={setSponsors} fields={SPONSOR_FIELDS} blank={() => ({ name: '', logo_url: '', url: '', tier: '' })} addLabel="Add sponsor" itemLabel={(sponsor, index) => sponsor.name || `Sponsor ${index + 1}`} max={30} reorderable emptyText="No sponsors listed." />
        {error('sponsors')}
      </section>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Users className="h-4 w-4 text-journey-accent" /> Organizer contacts</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Each contact needs an email or a phone number.</p>
        <ObjectListEditor<HackathonContact> items={contacts} onChange={setContacts} fields={CONTACT_FIELDS} blank={() => ({ name: '', role: '', email: '', phone: '' })} addLabel="Add contact" itemLabel={(contact, index) => contact.name || `Contact ${index + 1}`} max={10} emptyText="No contacts listed." />
        {error('contacts')}
      </section>

      <section className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Link2 className="h-4 w-4 text-journey-accent" /> Community and venue</h3>
        <ObjectListEditor<CommunityLink> items={links} onChange={setLinks} fields={LINK_FIELDS} blank={() => ({ label: '', url: '' })} addLabel="Add link" itemLabel={(link, index) => link.label || `Link ${index + 1}`} max={10} emptyText="No community links (Discord, WhatsApp…)." />
        {error('community_links')}
        <div>
          <label htmlFor="venue-map" className={`${LABEL} flex items-center gap-1`}><MapPin className="h-3.5 w-3.5" /> Venue map link</label>
          <input id="venue-map" type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/…" className={INPUT} />
          {error('venue_map_url')}
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Shown as a &ldquo;Get directions&rdquo; button next to the venue.</p>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save public page details'}</button>
      </div>
    </form>
  );
}
