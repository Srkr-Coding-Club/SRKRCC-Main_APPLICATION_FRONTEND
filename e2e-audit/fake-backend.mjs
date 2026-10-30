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
const exportsSeen = [];
// Team withdrawal: solo = the only member; registered = the team holds a place (needs approval); request = what the dashboard shows.
const wd = { solo: false, registered: false, request: null, posts: [], overview: null };
const ci = {
  window: 'OPEN', offline: false, arrived: new Map(), lunch: new Map(), batches: new Map(), teamScans: 0,
  sessions: [
    { id: 1, day_index: 0, slot: 'MORNING', date: '2026-11-01', name: 'Check-in', is_main: true, needs_arrival: false, counts_for_certificate: true, scan_mode: 'BOTH', is_active: true, outside_schedule: false },
    { id: 2, day_index: 0, slot: 'AFTERNOON', date: '2026-11-01', name: 'Lunch', is_main: false, needs_arrival: true, counts_for_certificate: false, scan_mode: 'BOTH', is_active: true, outside_schedule: false },
  ],
  people: Array.from({ length: 12 }, (_, i) => ({ user_id: i + 1, name: ['Asha Rao', 'Bo Li', 'Cy Doe', 'Dee Kay', 'Eli Sun', 'Fin Lee', 'Gia Ray', 'Hal Moe', 'Ian Fox', 'Joy Ng', 'Kai Oz', 'Lou Pak'][i], email: `p${i + 1}@x.io`, team_name: `Team ${Math.floor(i / 3) + 1}` })),
  held: [{ user_id: 99, name: 'Fay Forming', email: 'fay@x.io', team_name: 'Late Joiners', why: 'Team still forming' }],
};
const sidOf = (v) => (Number(v) === 2 ? 2 : 1);
const arrivals = (sid) => (sid === 2 ? ci.lunch : ci.arrived);
const sessionRows = () => ci.sessions.map((x) => ({ ...x, opens_at: x.is_main && ci.window === 'NOT_OPEN' ? iso(0, 2) : null, closes_at: null, window: x.is_main ? ci.window : 'OPEN', checked_in: arrivals(x.id).size }));
const teamMembers = (token, sid) => ci.people.filter((x) => x.team_name === `Team ${String(token).replace('team-', '')}`).map((x) => ({
  user_id: x.user_id, name: x.name, role: 'MEMBER', checked_in: arrivals(sid).has(x.user_id), checked_in_at: arrivals(sid).get(x.user_id)?.at ?? null,
  checked_in_by: arrivals(sid).get(x.user_id)?.by ?? null, via: arrivals(sid).get(x.user_id)?.via ?? null, blocked: sid === 2 && !ci.arrived.has(x.user_id) ? 'NOT_ARRIVED' : null,
}));
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
// A long list like a real event's, with long titles, mixed domains, capped and full statements.
const LONG_TITLES = ['Develop a real-time digital twin of a city that integrates IoT and GIS data for urban planners',
  'Smart real-time monitoring and inspection mobile app', 'Health records app that works without internet for Panchayat health workers',
  'AI assistant for farmers that explains soil reports in local languages', 'Low-cost water quality sensing network for village ponds'];
const DOMAINS = ['Smart City', 'IoT', 'HealthTech', 'AgriTech', 'EdTech', 'Sustainability'];
for (let i = 3; i <= 28; i += 1) {
  problems.push({ id: i, code: 'PS-' + String(i).padStart(3, '0'), title: LONG_TITLES[i % LONG_TITLES.length] + (i % 3 === 0 ? ' with offline support and multilingual voice' : ''),
    description: ['**Background**', '', 'Communities struggle with ' + i + ' recurring problems.', '', '- Build a prototype', '- Test with real users', '', 'Expected outcome: a working demo in 36 hours.'].join('\n'),
    domain: DOMAINS[i % DOMAINS.length], tags: i % 2 ? ['offline', 'PWA'] : ['ML'], max_teams: i % 7 === 0 ? 2 : null, is_active: true, order: i, team_count: i % 7 === 0 ? 2 : 0, slots_left: i % 7 === 0 ? 0 : (i % 4 === 0 ? 3 : null) });
}
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
// Registration payment: one team a leader created with its fee, and what an organizer does with it.
const pay = { team: null };
const PAY_STATUS = { PAYMENT_PENDING: 'PENDING', PAYMENT_REJECTED: 'REJECTED', REGISTERED: 'VERIFIED' };
const QR_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><rect x="20" y="20" width="60" height="60"/><rect x="120" y="20" width="60" height="60"/><rect x="20" y="120" width="60" height="60"/></svg>');
const payTeam = () => ({ ...team, id: 21, name: pay.team.name, status: pay.team.status, leader_id: 7, member_count: 1, members: [team.members[0]], pending_invites: [], open_innovation: null, created_at: pay.team.at, updated_at: pay.team.at, looking_for_members: false, looking_for: '' });
const payRow = () => ({ id: 1, team_id: 21, team_name: pay.team.name, team_status: pay.team.status, leader_name: 'Dana R', leader_email: 'dana@srkr.ac.in', leader_phone: '9000000000', members: 1, amount: 200, transaction_id: pay.team.tx,
  status: PAY_STATUS[pay.team.status], reason: pay.team.reason, submitted_at: pay.team.at, reviewed_by: pay.team.by || null, reviewed_at: pay.team.by ? iso(0) : null,
  screenshot: { id: 'f-1', name: 'pay.png', size: 70, type: 'image/png', state: 'ATTACHED' }, problem: 'PS-01' });
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
  // --- registration payment ---
  if (p === '/__pay') {
    const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if (q.reset) pay.team = null;
    if (q.stage) Object.assign(hackathons[0], q.stage === 'NONE'
      ? { payment_stage: 'NONE', idea_fee_amount: 0, idea_payment_note: '', payment_qr_id: null, contacts: [] }
      : { payment_stage: q.stage, idea_fee_amount: 200, idea_payment_note: 'UPI: club@upi', payment_qr_id: 'qr-1', contacts: [{ name: 'Ravi Kumar', role: 'Club lead', email: 'ravi@club.org', phone: '+91 90000 11111' }] });
    return send({ team: pay.team, stage: hackathons[0].payment_stage });
  }
  if (/\/idea-qr\/link$/.test(p)) return send({ url: QR_SVG, expires_in: 60, inline: true });
  if (req.method === 'POST' && /\/payment-files$/.test(p)) {
    const b = JSON.parse(raw || '{}');
    return send({ file: { id: 'f-1', name: b.name, size: b.size, type: 'image/png', state: 'PENDING' }, post: { url: 'http://localhost:8100/__upload', fields: {} }, max_bytes: 5242880 }, 201);
  }
  if (/\/payment-files\/[^/]+$/.test(p)) {
    if (req.method === 'POST') return send({ file: { id: 'f-1', name: 'pay.png', size: 70, type: 'image/png', state: 'UPLOADED' } });
    res.writeHead(204); return res.end();
  }
  if (req.method === 'POST' && /\/hackathons\/hackoverflow-2026\/teams$/.test(p) && hackathons[0].payment_stage === 'REGISTRATION') {
    const b = JSON.parse(raw || '{}');
    if (!String(b.transaction_id || '').trim()) return send({ field: 'transaction_id', detail: 'Enter the transaction ID of your payment.', code: 'INVALID' }, 400);
    if (!b.payment_file_id) return send({ field: 'payment_file_id', detail: 'Upload the screenshot of your payment of \u20b9200.', code: 'INVALID' }, 400);
    if (String(b.transaction_id).toLowerCase() === 'dup') return send({ field: 'transaction_id', detail: 'This transaction ID has already been used. Check it, or contact the club representatives.', code: 'TRANSACTION_REUSED' }, 400);
    pay.team = { name: b.name, status: 'PAYMENT_PENDING', tx: String(b.transaction_id).trim(), at: new Date().toISOString(), reason: '', by: null };
    return send(payTeam(), 201);
  }
  if (pay.team && /\/my-team$/.test(p)) {
    return send({ hackathon: hackathons[0], profile_missing: [], team: payTeam(), payment: { id: 1, status: PAY_STATUS[pay.team.status], amount: 200, transaction_id: pay.team.tx, submitted_at: pay.team.at, reviewed_at: pay.team.by ? iso(0) : null },
      is_leader: true, invites: [], rounds: [], registration: { rules_accepted: true, answers: {}, missing: [] } });
  }
  if (req.method === 'POST' && /\/teams\/21\/cancel-payment$/.test(p)) { pay.team = null; return send({ cancelled: true, hackathon_slug: 'hackoverflow-2026' }); }
  if (/\/payments$/.test(p) && req.method === 'GET') {
    const status = url.searchParams.get('status');
    const rows = pay.team && (!status || PAY_STATUS[pay.team.status] === status) ? [payRow()] : [];
    const counts = { PENDING: 0, VERIFIED: 0, REJECTED: 0 }; if (pay.team) counts[PAY_STATUS[pay.team.status]] += 1;
    return send({ counts, fee_amount: hackathons[0].idea_fee_amount, stage: hackathons[0].payment_stage, payments: rows });
  }
  if (/\/payments\/1\/link$/.test(p)) return send({ url: QR_SVG, expires_in: 60, inline: true });
  if ((m = p.match(/\/payments\/1\/(verify|reject|reopen|remove)$/)) && req.method === 'POST') {
    if (!pay.team) return send({ detail: 'That payment was not found.', code: 'NOT_FOUND' }, 404);
    const b = JSON.parse(raw || '{}');
    const handled = (word) => send({ detail: `This payment was already ${word} by Ada Min.`, code: 'PAYMENT_ALREADY_HANDLED', payment_status: PAY_STATUS[pay.team.status] }, 409);
    if (m[1] === 'verify' || m[1] === 'reject') {
      if (pay.team.status !== 'PAYMENT_PENDING') return handled(PAY_STATUS[pay.team.status] === 'VERIFIED' ? 'verified' : 'rejected');
      pay.team.status = m[1] === 'verify' ? 'REGISTERED' : 'PAYMENT_REJECTED'; pay.team.by = 'Ada Min'; pay.team.reason = m[1] === 'reject' ? String(b.reason || '') : '';
    } else if (m[1] === 'reopen') {
      if (pay.team.status !== 'PAYMENT_REJECTED') return send({ detail: 'Only a rejected payment can be reopened.', code: 'NOT_REJECTED' }, 409);
      pay.team.status = 'PAYMENT_PENDING'; pay.team.by = null; pay.team.reason = '';
    } else {
      if (pay.team.status === 'REGISTERED') return send({ detail: 'This team is already placed.', code: 'ALREADY_PLACED' }, 409);
      pay.team = null; return send({ removed: true });
    }
    return send({ payment: payRow() });
  }
  // --- team withdrawal ---
  if (p === '/__withdraw') {
    const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if (q.reset) { wd.solo = false; wd.registered = false; wd.request = null; wd.posts = []; wd.overview = null; }
    if (q.solo !== undefined) wd.solo = q.solo === '1';
    if (q.registered !== undefined) wd.registered = q.registered === '1';
    if (q.request) wd.request = q.request === 'none' ? null : { id: 1, status: q.request, reason: 'Our laptop broke', created_at: iso(-0.1), decision_note: q.note || '', decided_at: null };
    return send({ ...wd, posts: wd.posts });
  }
  if (p === '/__withdraw-posts') return send(wd.posts);
  if (/\/my-team$/.test(p) && (wd.solo || wd.registered || wd.request)) {
    const members = wd.solo ? team.members.slice(0, 1) : team.members;
    return send({ hackathon: hackathons[0], profile_missing: [], is_leader: true, invites: [], rounds: [],
      team: { ...fullTeam, status: wd.registered ? 'REGISTERED' : 'FORMING', members, member_count: members.length },
      registration: { rules_accepted: true, answers: {}, missing: [] }, withdrawal_request: wd.request, team_limits: { max_teams: 2, cooldown_minutes: 10 } });
  }
  if ((m = p.match(/^\/hackathons\/teams\/(\d+)\/(leave|cancel-withdrawal)$/)) && req.method === 'POST') {
    wd.posts.push(m[2] + ' ' + raw);
    const b = JSON.parse(raw || '{}');
    if (m[2] === 'cancel-withdrawal') { wd.request = null; return send(fullTeam); }
    if (!b.reason) return send({ detail: 'Tell the organizers why you are withdrawing.', code: 'REASON_REQUIRED', field: 'reason' }, 400);
    if (wd.registered) { wd.request = { id: 1, status: 'PENDING', reason: b.reason, created_at: new Date().toISOString(), decision_note: '', decided_at: null }; return send({ left: false, withdrawal_requested: true, hackathon_slug: 'hackoverflow-2026' }); }
    wd.solo = false;
    return send({ left: true, withdrawal_requested: false, hackathon_slug: 'hackoverflow-2026' });
  }
  if (/\/hackathons\/[^/]+\/withdrawals$/.test(p)) {
    return send(wd.overview || { pending: [{ id: 1, status: 'PENDING', reason: 'Our laptop broke', created_at: iso(-0.1), team_id: 11, team_name: 'Null Pointers', team_status: 'REGISTERED', is_waitlisted: false, requested_by: 'Dana R', requested_by_email: 'dana@srkr.ac.in', decided_by: null, decided_at: null, decision_note: '' }],
      decided: [], repeaters: [{ user_id: 8, name: 'Rep Eater', email: 'rep@srkr.ac.in', teams_created: 2, teams_withdrawn: 2, extra_allowed: 0, at_limit: true }], limits: { max_teams: 2, cooldown_minutes: 10 } });
  }
  if ((m = p.match(/\/hackathons\/[^/]+\/withdrawals\/(\d+)\/decide$/)) && req.method === 'POST') {
    wd.posts.push('decide ' + raw);
    wd.overview = { pending: [], decided: [{ id: 1, status: 'APPROVED', reason: 'Our laptop broke', created_at: iso(-0.1), team_id: 11, team_name: 'Null Pointers', team_status: 'WITHDRAWN', is_waitlisted: false, requested_by: 'Dana R', requested_by_email: 'dana@srkr.ac.in', decided_by: 'Ada Min', decided_at: iso(0), decision_note: 'ok' }], repeaters: [], limits: { max_teams: 2, cooldown_minutes: 10 } };
    return send({ id: 1, status: 'APPROVED' });
  }
  if (/\/hackathons\/[^/]+\/team-allowances$/.test(p) && req.method === 'POST') { wd.posts.push('allow ' + raw); return send({ user_id: 8, extra: 1 }); }
  // --- exports: every download goes through the server, so the stand-in records the request and answers with a file ---
  if (p === '/__exports') return send(exportsSeen);
  if ((m = p.match(/^\/hackathons\/([^/]+)\/export\/([^/]+)$/))) {
    const fmt = (new URL(req.url, 'http://x').searchParams.get('export_format') || 'csv');
    exportsSeen.push(req.url);
    res.writeHead(200, { 'content-type': fmt === 'json' ? 'application/json' : 'text/csv', 'content-disposition': `attachment; filename="${m[1]}-${m[2]}-20261027_115200.${fmt}"` });
    return res.end('\ufeffTeam\nAlpha\n');
  }
  if ((m = p.match(/^\/forms\/(\d+)\/attendance\/report\/export$/))) {
    const fmt = (new URL(req.url, 'http://x').searchParams.get('export_format') || 'csv');
    exportsSeen.push(req.url);
    res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': `attachment; filename="workshop-attendance-20261027_115200.${fmt}"` });
    return res.end('\ufeffResponse ID\n1\n');
  }
  if (p === '/auth/users') {
    return send([1, 2, 3].map((n) => ({ id: 100 + n, email: `member${n}@srkr.ac.in`, username: `member${n}`, first_name: `Member${n}`, last_name: 'Test', role: 'MEMBER', branch: 'CSE', year: 2, roll_number: `R${n}`, club_id: `C${n}`, phone_number: '9999999999', membership_status: 'ACTIVE', created_at: iso(-3), registered_at: iso(-3) })));
  }
  if (p === '/admin/dmc/datasets/users/export') {
    exportsSeen.push('POST ' + req.url + ' ' + raw);
    res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="users-export-20261027_115200.csv"' });
    return res.end('\ufeffEmail\na@x.io\n');
  }
  if (/\/ideas$/.test(p) && who !== user) {
    return send({ state: 'OPEN', rows: [{ id: 1, team_id: 11, team_name: 'Null Pointers', team_status: 'REGISTERED', title: 'Idea', problem: 'p', solution: 's', plan: '', tech_stack: ['React'], deck_url: null, linkedin_url: null, deck_file: null, payment_proof: null, transaction_id: '', status: 'SUBMITTED', feedback: '', reviewed_at: null, score: 0, review_count: 0, created_at: iso(-1), updated_at: iso(-1) }],
      missing: [], counts: { SUBMITTED: 1, APPROVED: 0, CHANGES_REQUESTED: 0, REJECTED: 0 }, config: { fee_amount: 0, payment_note: '', deck_required: false, linkedin_required: false, files_available: false, payment_qr: null, edits_enabled: true, edits_until: null } });
  }
  if (/\/submissions$/.test(p) && who !== user) {
    return send({ state: 'OPEN', rows: [{ id: 1, team_id: 11, team: 'Null Pointers', team_status: 'REGISTERED', project_title: 'Tele', tagline: '', description: 'd', repo_url: 'https://x.io/r', demo_url: '', video_url: '', slides_url: '', tech_stack: ['Django'], is_public: true, score: 80, review_count: 2, submitted_at: iso(-1), updated_at: iso(-1) }], missing: [] });
  }
  if (/\/hackathons\/[^/]+\/rounds$/.test(p)) {
    return send([{ id: 1, order: 1, name: 'Screening', kind: 'SCREENING', shortlist_limit: null, description: '', starts_at: null, ends_at: null, status: 'ACTIVE', effective_status: 'ACTIVE', details_form: null, details_form_slug: null, details_form_title: null, results_published: false,
      entry_counts: { PENDING: 1, SHORTLISTED: 0, REJECTED: 0, WAITLISTED: 0, total: 1, details_submitted: 0 }, created_at: iso(-2), updated_at: iso(-2) }]);
  }
  if (/\/rounds\/1\/entries$/.test(p)) {
    return send([{ id: 1, team_id: 11, team_name: 'Null Pointers', team_status: 'REGISTERED', leader_email: 'dana@srkr.ac.in', member_count: 2, problem_statement: null, problem_code: 'PS-01', status: 'PENDING', admin_notes: '', feedback: '', decided_by_name: null, decided_at: null, details_response_id: null, idea_status: null, idea_score: null, has_project: false, project_score: null, checked_in: 0 }]);
  }
  // --- check-in (stateful: two sessions, person codes and team codes) ---
  if (p === '/__checkin') { const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams); if (q.window) ci.window = q.window; if (q.reset) { ci.arrived = new Map(); ci.lunch = new Map(); ci.batches = new Map(); ci.teamScans = 0; } if (q.single) ci.single = q.single === '1'; return send({ ...ci, arrived: [...ci.arrived.keys()], lunch: [...ci.lunch.keys()] }); }
  if (/\/check-in\/sessions$/.test(p)) return send(ci.single ? sessionRows().slice(0, 1) : sessionRows());
  if ((m = p.match(/\/check-in\/sessions\/(\d+)$/)) && req.method === 'PATCH') {
    const row = ci.sessions.find((x) => x.id === Number(m[1])); const b = JSON.parse(raw || '{}');
    if (b.opens_at && b.closes_at && b.closes_at <= b.opens_at) return send({ closes_at: ['Must be after the time check-in opens.'] }, 400);
    Object.assign(row, ['name', 'scan_mode', 'needs_arrival', 'counts_for_certificate', 'is_active'].reduce((acc, k) => (k in b ? { ...acc, [k]: b[k] } : acc), {}));
    return send(sessionRows().find((x) => x.id === row.id));
  }
  if (/\/check-in\/stats$/.test(p)) {
    const sid = sidOf(new URL(req.url, 'http://x').searchParams.get('session'));
    const rows = [...arrivals(sid).values()];
    const by = {}; rows.forEach((r) => { by[r.by] = (by[r.by] || 0) + 1; });
    const base0 = Math.floor(Date.now() / 9e5) * 9e5 - 3 * 9e5;
    const via = {}; rows.forEach((r) => { via[r.via || 'MEMBER_QR'] = (via[r.via || 'MEMBER_QR'] || 0) + 1; });
    return send({ total: rows.length, overrides: rows.filter((r) => r.override).length, bucket_minutes: 15, by_via: via, team_scans: ci.teamScans, session: sessionRows().find((x) => x.id === sid),
      volunteers: Object.entries(by).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      timeline: rows.length ? [0, 1, 2, 3].map((i) => ({ at: new Date(base0 + i * 9e5).toISOString(), count: i === 1 ? rows.length : 0 })) : [] });
  }
  if (/\/check-in\/no-shows$/.test(p)) {
    if (req.method === 'POST') { const b = JSON.parse(raw || '{}'); return b.action === 'remind' ? send({ reminded: ci.people.filter((x) => !ci.arrived.has(x.user_id)).length }) : send({ withdrawn: (b.team_ids || []).length }); }
    const sid = sidOf(new URL(req.url, 'http://x').searchParams.get('session')); const there = arrivals(sid);
    const missingTeams = [...new Set(ci.people.filter((x) => !there.has(x.user_id)).map((x) => x.team_name))];
    return send({ window: ci.window === 'OPEN' ? 'OPEN' : 'CLOSED', session: sessionRows().find((x) => x.id === sid), teams: missingTeams.map((n, i) => ({ team_id: i + 1, name: n, members: ci.people.filter((x) => x.team_name === n).length })),
      absent_participants: ci.people.filter((x) => !there.has(x.user_id)).length, waitlisted_teams: 2 });
  }
  const checkInMember = (id, sid, how) => {
    const person = ci.people.find((x) => x.user_id === id) || ci.held.find((x) => x.user_id === id);
    if (!person) return { error: send.bind(null, { detail: 'That QR code is not valid.', code: 'INVALID_QR' }, 400) };
    if (ci.held.includes(person) && !(how.override && how.reason)) return { error: send.bind(null, { detail: 'Fay Forming team is not registered (still forming or waitlisted).', code: 'TEAM_NOT_REGISTERED' }, 400) };
    if (sid === 2 && !ci.arrived.has(id) && !how.override) return { error: send.bind(null, { detail: `${person.name} has not checked in on arrival yet.`, code: 'NOT_ARRIVED' }, 400) };
    const created = !arrivals(sid).has(id);
    if (created) arrivals(sid).set(id, { at: new Date().toISOString(), by: 'Vik Vol', override: Boolean(how.override), via: how.via || 'MEMBER_QR', batch: how.batch });
    const row = arrivals(sid).get(id);
    return { body: { kind: 'member', created, user_id: id, name: person.name, team_name: person.team_name, checked_in_at: row.at, checked_in_by: 'Vik Vol', session_id: sid, via: row.via } };
  };
  if (/\/check-in\/scan$/.test(p) && req.method === 'POST') {
    const b = JSON.parse(raw || '{}'); const sid = sidOf(b.session);
    if (ci.offline) { req.socket.destroy(); return; }
    if (b.token === 'expired') return send({ detail: 'That QR code has expired. Ask the participant to reopen their code, or check them in from the list.', code: 'QR_EXPIRED' }, 400);
    if (String(b.token).startsWith('team-')) {
      const members = teamMembers(b.token, sid);
      return send({ kind: 'team', team: { id: Number(String(b.token).replace('team-', '')), name: `Team ${String(b.token).replace('team-', '')}`, status: 'REGISTERED', placed: true, problem_code: 'PS-01', problem_title: 'Rural health' },
        session: sessionRows().find((x) => x.id === sid), members, all_checked_in: members.every((x) => x.checked_in), can_override: true });
    }
    const out = checkInMember(Number(String(b.token).replace('person-', '')), sid, {});
    return out.error ? out.error() : send(out.body);
  }
  if (/\/check-in\/team-batch$/.test(p) && req.method === 'POST') {
    const b = JSON.parse(raw || '{}'); const sid = sidOf(b.session);
    if (b.token === 'expired') return send({ detail: 'That QR code has expired. Ask the participant to reopen their code, or check them in from the list.', code: 'QR_EXPIRED' }, 400);
    const batchId = `batch-${ci.batches.size + 1}`; const made = [];
    const results = (b.user_ids || []).map((id) => {
      const person = ci.people.find((x) => x.user_id === id);
      const out = checkInMember(id, sid, { override: b.override, reason: b.reason, via: 'TEAM_QR', batch: batchId });
      if (out.error) return { user_id: id, name: person?.name ?? null, status: 'refused', detail: 'Has not checked in on arrival yet' };
      if (out.body.created) made.push(id);
      return { user_id: id, name: person.name, status: out.body.created ? 'created' : 'already', checked_in_at: out.body.checked_in_at };
    });
    if (made.length) { ci.batches.set(batchId, { sid, ids: made }); ci.teamScans += 1; }
    return send({ batch_id: made.length ? batchId : null, team: { id: 1, name: 'Team' }, session_id: sid, results,
      created: results.filter((r) => r.status === 'created').length, already: results.filter((r) => r.status === 'already').length, refused: results.filter((r) => r.status === 'refused').length });
  }
  if ((m = p.match(/\/check-in\/batches\/([^/]+)$/)) && req.method === 'DELETE') {
    const batch = ci.batches.get(m[1]); if (!batch) return send({ detail: 'Not found.' }, 404);
    batch.ids.forEach((id) => arrivals(batch.sid).delete(id)); ci.batches.delete(m[1]);
    return send({ removed: batch.ids.length });
  }
  if ((m = p.match(/\/check-in\/(\d+)$/)) && req.method === 'DELETE') { arrivals(sidOf(new URL(req.url, 'http://x').searchParams.get('session'))).delete(Number(m[1])); return send({ deleted: true }); }
  if (/\/check-in$/.test(p)) {
    const url = new URL(req.url, 'http://x'); const q = (url.searchParams.get('q') || '').toLowerCase(); const missing = url.searchParams.get('missing') === '1';
    const limit = Number(url.searchParams.get('limit') || 100); const sid = sidOf(url.searchParams.get('session'));
    if (req.method === 'POST') {
      const b = JSON.parse(raw || '{}');
      if (ci.offline) { req.socket.destroy(); return; }
      if (b.token === 'expired') return send({ detail: 'That QR code has expired. Ask the participant to reopen their code, or check them in from the list.', code: 'QR_EXPIRED' }, 400);
      if (String(b.token).startsWith('team-')) return send({ detail: 'That is a team code.', code: 'TEAM_CODE' }, 400);
      const out = checkInMember(b.user_id ?? Number(String(b.token).replace('person-', '')), sidOf(b.session), { override: b.override, reason: b.reason });
      return out.error ? out.error() : send(out.body);
    }
    const there = arrivals(sid);
    const rows = ci.people.filter((x) => (!missing || !there.has(x.user_id)) && (!q || [x.name, x.email, x.team_name].some((t) => t.toLowerCase().includes(q))));
    const held = q ? ci.held.filter((x) => !there.has(x.user_id) && [x.name, x.email, x.team_name].some((t) => t.toLowerCase().includes(q))) : [];
    return send({ participants: rows.slice(0, limit).map((x) => ({ ...x, team_id: 1, role: 'MEMBER', via: there.get(x.user_id)?.via ?? null, checked_in: there.has(x.user_id), checked_in_at: there.get(x.user_id)?.at ?? null, checked_in_by: there.get(x.user_id)?.by ?? null })),
      total: ci.people.length, checked_in: ci.people.filter((x) => there.has(x.user_id)).length, count: rows.length, limit, offset: 0, held_back: held, session: sessionRows().find((x) => x.id === sid) });
  }
  if (/\/my-check-in$/.test(p)) {
    const open = ci.window === 'OPEN';
    return send({ token: open ? 'person-1' : '', team_token: open ? 'team-1' : '', team: { id: 1, name: 'Team 1' }, checked_in: ci.arrived.has(1), checked_in_at: ci.arrived.get(1)?.at ?? null, window: ci.window, opens_at: iso(0, 2), closes_at: null,
      sessions: ci.single ? undefined : sessionRows().map((x) => ({ id: x.id, name: x.name, is_main: x.is_main, window: x.window, opens_at: x.opens_at, closes_at: x.closes_at, checked_in: arrivals(x.id).has(1), checked_in_at: arrivals(x.id).get(1)?.at ?? null })) });
  }
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
  if (req.method === 'POST' && /\/hackathons\/[^/]+\/teams$/.test(p)) { const b = JSON.parse(raw || '{}'); if (b.name === 'Limit') return send({ detail: 'You have already created 2 teams for this hackathon, which is the most one person can. Ask the organizers if you need another.', code: 'TEAM_LIMIT_REACHED', limit: 2 }, 400); return b.name === 'Taken' ? send({ field: 'name', detail: 'A team with this name already exists.' }, 400) : send(fullTeam, 201); }
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
  if (/\/stats$/.test(p)) return send({ teams_by_status: { FORMING: 5, REGISTERED: 31, DISQUALIFIED: 0, WITHDRAWN: 0, PAYMENT_PENDING: pay.team && pay.team.status === 'PAYMENT_PENDING' ? 1 : 0, PAYMENT_REJECTED: 0 }, teams_total: 36, participants: 128, pending_invites: 4, open_innovation_teams: 6,
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
  // The browser sends the screenshot straight to "storage": accept it from the site's origin.
  if (req.url.startsWith('/__upload')) {
    res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' });
    req.resume();
    return res.end();
  }
  let raw = ''; req.on('data', (c) => { raw += c; });
  req.on('end', () => handle(req, res, raw));
});
const PORT = Number(process.env.FAKE_PORT || 8100);
server.listen(PORT, () => console.log('fake backend on :' + PORT));
