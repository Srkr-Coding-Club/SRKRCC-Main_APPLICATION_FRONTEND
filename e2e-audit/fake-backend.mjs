// Stand-in Django API for the UI/UX audit. Serves realistic hackathon fixtures so the server-rendered pages and the
// /api/proxy/* calls both see data. No real data is touched. Run: node e2e-audit/fake-backend.mjs  (port 8100)
// The bearer token decides the caller: "admin" -> ADMIN, anything else -> participant. Unknown GETs answer [].
import http from 'node:http';

const iso = (days, hours = 0) => new Date(Date.now() + days * 864e5 + hours * 36e5).toISOString();
const LONG = 'The National Inter-Collegiate Sustainable Agriculture and Rural Healthcare Innovation Hackathon 2026 (Grand Edition)';

const base = {
  description: 'Build a working prototype in 36 hours. Teams of 2-4 pitch to industry judges.\n\nOpen to all engineering students.',
  prize_pool: '₹1,50,000', mode: 'HYBRID', venue: 'SRKR Engineering College, Bhimavaram', organizer_name: 'SRKR Coding Club',
  tags: ['AI', 'Web3', 'HealthTech', 'Sustainability', 'Open Innovation'], banner_image: null, logo_image: null,
  min_team_size: 2, max_team_size: 4, registration_count: 128, team_count: 36, registered_team_count: 31, waitlisted_team_count: 0,
  is_hidden: false, is_full: false, allow_open_innovation: true, team_edits_locked: false, waitlist_enabled: false,
  features: { ideas: true, submissions: true, judging: true, check_in: true, certificates: true, team_finder: true, showcase: false },
  prizes: [{ title: 'Winner', amount: '₹75,000', description: 'Cash prize and incubation support' }, { title: 'Runner-up', amount: '₹50,000', description: '' }, { title: 'Third', amount: '₹25,000', description: '' }],
  faq: [], rules: 'Teams must be 2-4 members.\nAll code must be written during the event.', require_rules_acceptance: true,
  eligibility: { colleges: ['SRKR Engineering College'], branches: ['CSE', 'IT', 'ECE'], years: ['2', '3', '4'] },
  mentors: [{ name: 'Dr. A. Rao', role: 'Mentor', bio: 'Cloud architect', photo_url: '', link: '' }],
  judges: [{ name: 'S. Kumar', role: 'Judge', bio: 'CTO, Example Labs', photo_url: '', link: '' }],
  sponsors: [{ name: 'Example Labs', logo_url: '', url: 'https://example.org', tier: 'Gold' }],
  contacts: [{ name: 'Priya', role: 'Coordinator', email: 'priya@example.org', phone: '9999999999' }],
  community_links: [], problem_domains: ['HealthTech', 'AgriTech', 'EdTech'], required_profile_fields: [],
  registration_questions: [], problems_revealed: true, submissions_open: false, results_published: false, show_leaderboard: false,
  form_slug: 'hack-reg', form_title: 'Registration',
};
const hackathons = [
  { ...base, id: 1, slug: 'hackoverflow-2026', title: 'HackOverflow 2026', theme: 'Build for Bharat', status: 'LIVE', is_registration_open: true,
    start_date: iso(14), end_date: iso(16), registration_opens_at: iso(-5), registration_closes_at: iso(10), submission_deadline: iso(16), idea_deadline: iso(7) },
  { ...base, id: 2, slug: 'long-title-agri', title: LONG, theme: 'Sustainable futures for farmers, clinics and village schools across the Godavari delta region', status: 'LIVE', is_registration_open: false,
    prize_pool: '₹10,00,000 + incubation', start_date: iso(40), end_date: iso(42), registration_opens_at: iso(20), registration_closes_at: iso(30), is_full: true, tags: ['AgriTech', 'HealthTech', 'EdTech', 'GovTech', 'ClimateTech', 'Open Innovation'] },
  { ...base, id: 3, slug: 'past-codefest', title: 'CodeFest 2025', theme: 'Retro', status: 'CLOSED', is_registration_open: false, prize_pool: '₹50,000',
    start_date: iso(-120), end_date: iso(-118), registration_opens_at: iso(-150), registration_closes_at: iso(-130), results_published: true },
];
const problems = [
  { id: 1, code: 'PS-01', title: 'Offline-first telemedicine for village clinics', description: 'Design a tool that works with unreliable connectivity.', domain: 'HealthTech', tags: ['offline', 'PWA'], max_teams: 5, is_active: true, order: 1, team_count: 3, slots_left: 2 },
  { id: 2, code: 'PS-02', title: 'Crop disease detection from a single photo', description: 'On-device model for common delta crops.', domain: 'AgriTech', tags: ['ML'], max_teams: null, is_active: true, order: 2, team_count: 1, slots_left: null },
];
const stages = [
  { id: 1, order: 1, title: 'Idea round', description: 'Submit your idea and get it reviewed.', starts_at: iso(-2), ends_at: iso(7), badge: 'Live', location: 'Online', tone: 'orange', marker: 'DATE', icon: 'flag', link_label: '', link_url: '' },
  { id: 2, order: 2, title: 'Build round', description: 'Build for 36 hours.', starts_at: iso(14), ends_at: iso(16), badge: '', location: 'Campus', tone: 'sky', marker: 'ICON', icon: 'flag', link_label: '', link_url: '' },
];
const announcements = [{ id: 1, title: 'Registrations are open', body: 'Register your squad before the deadline.', audience: 'PUBLIC', created_at: iso(-1), is_pinned: true }];
const team = { id: 11, name: 'Null Pointers', status: 'REGISTERED', hackathon_slug: 'hackoverflow-2026', members: [
  { user_id: 7, name: 'Dana R', email: 'dana@srkr.ac.in', club_id: 'SRKRCC-001', role: 'LEADER', joined_at: iso(-3), phone_number: '9000000000' },
  { user_id: 8, name: 'Chandrasekhar Venkata Subrahmanyam', email: 'chandrasekhar.venkata.subrahmanyam@srkrec.edu.in', club_id: null, role: 'MEMBER', joined_at: iso(-2) }], problem_statement: null, is_open_innovation: false };
const user = { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'NON_AFFILIATE', is_email_verified: true };
const admin = { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true, is_email_verified: true };

const log = [];
function handle(req, res, raw) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/api/, '').replace(/\/$/, '');
  const noTeam = /Bearer user-noteam/.test(req.headers.authorization || '');
  const who = /Bearer admin/.test(req.headers.authorization || '') ? admin : user;
  const send = (body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  log.push(`${req.method} ${p}`);
  const fullTeam = { ...team, leader_id: 7, member_count: 2, pending_invites: [], open_innovation: null, created_at: iso(-3), updated_at: iso(-1), looking_for_members: false, looking_for: '' };
  if (p === '/__log') return send(log);
  let m;
  if (p === '/feature-flags') return send([{ key: 'hackathons', is_enabled: true }]);
  if (p === '/hackathons') return send(hackathons);
  if (p === '/hackathons/my-teams') return send([{ ...fullTeam, hackathon_title: 'HackOverflow 2026', is_leader: true }]);
  if (p === '/hackathons/my-invites') return send([]);
  if ((m = p.match(/^\/hackathons\/([^/]+)$/))) { const h = hackathons.find((x) => x.slug === m[1]); return h ? send(h) : send({ detail: 'Not found.' }, 404); }
  if (/\/problem-statements$/.test(p)) return send(problems);
  if (/\/announcements$/.test(p)) return send(announcements);
  if (/\/stages$/.test(p)) return send(stages);
  if (/\/results$/.test(p)) return send(null);
  if (/\/showcase$/.test(p)) return send({ enabled: false, projects: [] });
  if (p === '/auth/me') return send(who);
  const slugOf = (x) => (x.match(/^\/hackathons\/([^/]+)\//) || [])[1];
  if (req.method === 'POST' && /\/hackathons\/[^/]+\/teams$/.test(p)) { const b = JSON.parse(raw || '{}'); return b.name === 'Taken' ? send({ field: 'name', detail: 'A team with this name already exists.' }, 400) : send(fullTeam, 201); }
  if (/\/my-team$/.test(p)) return send({ hackathon: hackathons.find((h) => h.slug === slugOf(p)) || hackathons[0], profile_missing: [], team: noTeam ? null : fullTeam, is_leader: !noTeam, invites: [],
    rounds: [{ id: 1, order: 1, name: 'Idea round', kind: 'IDEA', effective_status: 'ACTIVE', description: 'Submit your idea', starts_at: iso(-2), ends_at: iso(7), status: 'ACTIVE', results_published: false, entry: null, details_form: null }],
    registration: { rules_accepted: true, answers: {}, missing: [] } });
  if (/\/my-permissions$/.test(p)) return send({ permissions: ['settings', 'content', 'teams', 'rounds', 'ideas', 'submissions', 'judging', 'judge', 'results', 'check_in', 'insights', 'staff'], is_site_organizer: who === admin, roles: who === admin ? ['ORGANIZER'] : [], catalog: [], presets: { ORGANIZER: [], JUDGE: [], VOLUNTEER: [] } });
  if (/\/ideas$/.test(p)) return send({ state: 'OPEN', rows: [], missing: [{ id: 5, name: 'Half Team' }], counts: { SUBMITTED: 0, APPROVED: 0, CHANGES_REQUESTED: 0, REJECTED: 0 }, config: { fee_amount: 0, payment_note: '', deck_required: false, linkedin_required: false, files_available: false, payment_qr: null, edits_enabled: true, edits_until: null } });
  if (/\/submissions$/.test(p)) return send({ state: 'NOT_OPEN', rows: [], missing: [{ id: 5, name: 'Half Team' }] });
  if (/\/leaderboard$/.test(p)) return send({ judges: 0, rows: [], criteria: [] });
  if (/\/judging\/ideas$/.test(p)) return send({ enabled: true, criteria: [], ideas: [], reviewed: 0, total: 0 });
  if (/\/staff$/.test(p)) return send([{ id: 1, role: 'ORGANIZER', user_id: 7, email: 'dana@srkr.ac.in', name: 'Dana R', permissions: ['settings', 'teams'] }]);
  if (/\/finder\/requests$/.test(p)) return send({ incoming: [], mine: [] });
  if (/\/stats$/.test(p)) return send({ teams_by_status: { FORMING: 5, REGISTERED: 31, DISQUALIFIED: 0, WITHDRAWN: 0 }, teams_total: 36, participants: 128, pending_invites: 4, open_innovation_teams: 6,
    problem_statements: problems.map((x) => ({ id: x.id, code: x.code, title: x.title, teams: x.team_count, max_teams: x.max_teams })), rounds: [], forming_teams: [{ id: 5, name: 'Half Team', leader_email: 'l@example.org', members: 1, needed: 1 }],
    min_team_size: 2, registration_closes_at: iso(10), is_registration_open: true });
  if (/\/finder$/.test(p)) return send({ seekers: [{ id: 8, name: 'Chandrasekhar Venkata Subrahmanyam', skills: 'React, Django, Figma, DevOps, Machine Learning', note: 'Looking for a team that wants to build for rural healthcare.', profile: 'CSE 3rd year', is_me: false, phone: '9000000001' }],
    teams: [{ id: 12, name: 'Segmentation Faults', looking_for: 'A designer and a backend developer', members: 2, max_members: 4, problem: 'PS-01', leader: 'Ravi K' }], my_profile: null, my_requests: [] });
  if (/\/judging$/.test(p)) return send({ enabled: true, criteria: [{ key: 'innovation', label: 'Innovation', max: 10, weight: 1 }], submissions: [], reviewed: 0, total: 0 });
  if (/\/check-in$/.test(p)) return send({ participants: team.members.map((mm) => ({ user_id: mm.user_id, name: mm.name, email: mm.email, team_id: 11, team_name: 'Null Pointers', role: mm.role, checked_in: false, checked_in_at: null })), total: 2, checked_in: 0 });
  if (/\/my-check-in$/.test(p)) return send({ token: 'abc123', checked_in: false, checked_in_at: null });
  if (/\/my-certificate$/.test(p)) return send({ kind: 'PARTICIPATION', title: 'Certificate of Participation', body: 'for participating in HackOverflow 2026', name: 'Dana R', team: 'Null Pointers', hackathon: 'HackOverflow 2026', organizer: 'SRKR Coding Club', date: iso(16), signatory_name: 'A. Lead', signatory_title: 'President', code: 'CERT-123' });
  if (/\/analytics$/.test(p)) return send({ funnel: [{ key: 'registered', label: 'Registered', count: 128 }, { key: 'teams', label: 'Teams', count: 36 }], checked_in: 0, waitlisted_teams: 0, by_branch: [{ label: 'CSE', count: 80 }, { label: 'IT', count: 48 }], by_year: [{ label: '3', count: 70 }], by_college: [{ label: 'SRKR', count: 128 }], joined_per_day: [{ date: '2026-10-20', count: 12 }, { date: '2026-10-21', count: 30 }], capacity: { max_teams: 60, max_participants: 240, placed_teams: 36, placed_participants: 128 } });
  if (/\/my-idea$/.test(p)) return send({ state: 'OPEN', opens_at: iso(-2), deadline: iso(7), review_required: true, project_requires_idea: false, idea: null, can_edit: true, edit_blocked_reason: '', config: { fee_amount: 0, payment_note: '', deck_required: false, linkedin_required: false, files_available: false, payment_qr: null, edits_enabled: true, edits_until: null } });
  if (/\/my-submission$/.test(p)) return send({ state: 'NOT_OPEN', gate: { required: false, satisfied: true, reason: '' }, opens_at: iso(14), deadline: iso(16), submission: null, can_edit: false });
  if (/\/my-registration$/.test(p)) return send({ rules_accepted: true, answers: {}, missing: [] });
  if (/\/team\/me$/.test(p)) return send(team);
  if (/\/teams$/.test(p)) return send([fullTeam]);
  if (/\/registrations$|\/participants$/.test(p)) return send(team.members.map((mm) => ({ ...mm, status: 'REGISTERED' })));
  if (p === '/forms/hack-reg') return send({ id: 9, title: 'Registration', slug: 'hack-reg', status: 'PUBLISHED', version: 1, fields: [{ id: 1, label: 'Full name', type: 'TEXT', is_required: true, order: 1, options: [], validation_rules: {}, conditional_logic: {} }] });
  return req.method === 'GET' ? send([]) : send({});
}
const server = http.createServer((req, res) => {
  let raw = ''; req.on('data', (c) => { raw += c; });
  req.on('end', () => handle(req, res, raw));
});
const PORT = Number(process.env.FAKE_PORT || 8100);
server.listen(PORT, () => console.log('fake backend on :' + PORT));
