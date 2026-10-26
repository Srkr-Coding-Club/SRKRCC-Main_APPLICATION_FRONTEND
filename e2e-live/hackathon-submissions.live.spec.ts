import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * The project phase end to end against the real backend: a team leader submits, the organizers can read what was
 * submitted, a judge can see it, and the links and details are checked the way the rules say.
 */
test.describe.configure({ mode: 'default' });

const SLUG = 'build-week';
const REPO = 'https://github.com/code-owls/smart-bins';
const DESCRIPTION = 'Smart bins sort campus waste with a camera and a small model, and tell the cleaners which bin is full.';

interface ProjectState { id: number; title: string; repo: string; demo: string | null; video: string | null; slides: string | null; tech: string[]; description: string }
const project = () => helper<ProjectState | null>('project_state', SLUG);

let leader = '';
let admin = '';
let judge = '';

test.beforeAll(() => {
  leader = uniqueEmail('lead');
  admin = uniqueEmail('boss');
  judge = uniqueEmail('judge');
  helper('create_user', leader, '--verified');
  helper('create_user', admin, '--verified', '--staff', '--role', 'ADMIN');
  helper('create_user', judge, '--verified');
  helper('make_project_hackathon', SLUG, '--leader', leader, '--judge', judge);
});

test.beforeEach(() => { helper('clear_cache'); });

test('the team leader submits a project and sees it saved', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await page.getByLabel(/Project title/).fill('Smart Bins');
  await page.getByLabel(/One-line pitch/).fill('Waste that sorts itself');
  await page.getByLabel(/What did you build/).fill(DESCRIPTION);
  await page.getByLabel(/Code repository/).fill(REPO);
  await page.getByLabel(/Live demo/).fill('https://smart-bins.vercel.app');
  await page.getByLabel(/Demo video/).fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByLabel(/^Slides/).fill('https://docs.google.com/presentation/d/abc123/edit');
  const tech = page.locator('#sub-tech');
  for (const item of ['React', 'Django']) { await tech.fill(item); await tech.press('Enter'); }
  await page.getByRole('button', { name: 'Submit project' }).click();

  await expect(page.getByText(/Project saved at/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  expect(project()).toMatchObject({ title: 'Smart Bins', repo: REPO, video: 'https://youtu.be/dQw4w9WgXcQ', tech: ['React', 'Django'] });

  await page.reload();
  await expect(page.getByLabel(/Project title/)).toHaveValue('Smart Bins');
  await expect(page.getByLabel(/Code repository/)).toHaveValue(REPO);
});

test('a refused save keeps what was typed and says which field to fix', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await page.getByLabel(/Project title/).fill('Smart Bins v2');
  await page.getByLabel(/Code repository/).fill('https://example.com/not-a-repo');
  await page.getByRole('button', { name: /Save changes|Submit project/ }).click();
  await expect(page.locator('#sub-repo')).toBeFocused();
  await expect(page.getByText(/Not saved yet/)).toBeVisible();
  await expect(page.getByLabel(/Project title/)).toHaveValue('Smart Bins v2');
  expect(project()!.title).toBe('Smart Bins');   // nothing half-saved
});

test('the organizers can read the whole project: description, tech and every link', async ({ page }) => {
  await signIn(page, admin);
  await page.goto(`/hackathons/${SLUG}/manage?tab=submissions`);
  const row = page.getByRole('row', { name: /Code Owls/ });
  await expect(row).toContainText('Smart Bins');
  await expect(row.getByRole('link', { name: /Repo/ })).toHaveAttribute('href', REPO);
  await expect(row.getByRole('link', { name: /Video/ })).toHaveAttribute('href', 'https://youtu.be/dQw4w9WgXcQ');
  await row.getByRole('button', { name: /Read project/ }).click();
  const detail = page.getByRole('dialog', { name: /Smart Bins/ });
  await expect(detail).toContainText(DESCRIPTION);
  await expect(detail).toContainText('React');
  await expect(detail).toContainText('Django');
});

test('a judge sees the project in the judging list', async ({ page }) => {
  await signIn(page, judge);
  const body = await page.evaluate(async () => (await fetch(`/api/proxy/hackathons/build-week/judging/`, { credentials: 'include' })).text());
  expect(body).toContain('Smart Bins');
});

/** What the server says to each link and detail (the rules are in docs/hackathon-submissions-plan.md). */
const BASE = { project_title: 'Smart Bins', tagline: '', description: DESCRIPTION, repo_url: REPO, demo_url: '', video_url: '', slides_url: '', tech_stack: ['React'], is_public: true };
const CASES: Array<[string, Record<string, unknown>, number, string?]> = [
  ['a GitHub repo', { repo_url: 'https://github.com/owner/repo' }, 200],
  ['a GitLab repo with a group', { repo_url: 'https://gitlab.com/group/sub/repo' }, 200],
  ['a repo link ending in .git or a slash', { repo_url: 'https://github.com/owner/repo.git/' }, 200],
  ['a repo on an unknown site', { repo_url: 'https://example.com/owner/repo' }, 400, 'repo_url'],
  ['a repo host without a repository path', { repo_url: 'https://github.com/' }, 400, 'repo_url'],
  ['only the owner, no repository', { repo_url: 'https://github.com/owner' }, 400, 'repo_url'],
  ['http instead of https', { repo_url: 'http://github.com/owner/repo' }, 400, 'repo_url'],
  ['a link with a password in it', { repo_url: 'https://user:pass@github.com/owner/repo' }, 400, 'repo_url'],
  ['localhost', { demo_url: 'https://localhost:3000/app' }, 400, 'demo_url'],
  ['a loopback address', { demo_url: 'https://127.0.0.1/app' }, 400, 'demo_url'],
  ['a private network address', { demo_url: 'https://192.168.1.10/app' }, 400, 'demo_url'],
  ['a .local host', { demo_url: 'https://printer.local/app' }, 400, 'demo_url'],
  ['a host with no dot', { demo_url: 'https://intranet/app' }, 400, 'demo_url'],
  ['javascript:', { demo_url: 'javascript:alert(1)' }, 400, 'demo_url'],
  ['ftp', { slides_url: 'ftp://files.example.com/deck.pdf' }, 400, 'slides_url'],
  ['a public demo site', { demo_url: 'https://smart-bins.vercel.app/' }, 200],
  ['a YouTube video', { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, 200],
  ['a video on an unknown site', { video_url: 'https://example.com/video.mp4' }, 400, 'video_url'],
  ['a Google Slides deck', { slides_url: 'https://docs.google.com/presentation/d/abc/edit' }, 200],
  ['a very long link', { demo_url: `https://example.com/${'a'.repeat(600)}` }, 400, 'demo_url'],
  ['a one-letter title', { project_title: 'A' }, 400, 'project_title'],
  ['a description that says nothing', { description: 'good project' }, 400, 'description'],
  ['a title of only spaces', { project_title: '     ' }, 400, 'project_title'],
  ['more than ten technologies', { tech_stack: Array.from({ length: 11 }, (_, i) => `Tech${i}`) }, 400, 'tech_stack'],
  ['a technology name that is too long', { tech_stack: ['x'.repeat(41)] }, 400, 'tech_stack'],
];

test('every link and detail is checked as the rules say', async ({ page }) => {
  await signIn(page, leader);
  const results: string[] = [];
  for (const [name, change, status, field] of CASES) {
    const reply = await page.evaluate(async (body) => {
      const response = await fetch('/api/proxy/hackathons/build-week/my-submission/', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    }, { ...BASE, ...change });
    const ok = reply.status === status && (!field || reply.body?.field === field);
    if (!ok) results.push(`${name}: expected ${status}${field ? ` on ${field}` : ''}, got ${reply.status}${reply.body?.field ? ` on ${reply.body.field}` : ''} (${reply.body?.detail ?? 'saved'})`);
  }
  expect(results, results.join('\n')).toEqual([]);
});
