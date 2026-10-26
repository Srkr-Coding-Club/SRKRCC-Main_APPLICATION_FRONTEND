import { expect, test } from '@playwright/test';
import { helper, signIn, uniqueEmail } from './live';

/**
 * The idea deck as a PDF, end to end (real backend, real S3 API): picked and previewed by the team, saved, previewed and
 * downloaded by the organizers, readable by a judge; a fake PDF and a wrong type are refused; a .pptx still works but is
 * download-only.
 */
test.describe.configure({ mode: 'serial' });

const SLUG = 'pdf-pitch';
/** A real one-page PDF (so the browser's viewer has something to draw). */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
  + '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n'
  + '4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 40 100 Td (Bin Busters) Tj ET\nendstream endobj\n'
  + '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);
const PPTX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(2000, 7)]);

interface IdeaState { id: number; status: string; deck: { name: string; state: string; key: string } | null }
const idea = () => helper<IdeaState | null>('idea_state', SLUG);

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
  helper('make_idea_hackathon', SLUG, '--leader', leader, '--judge', judge);
});

test.beforeEach(() => { helper('clear_cache'); });

const fillBasics = async (page: import('@playwright/test').Page) => {
  await page.getByLabel(/Idea title/).fill('Smart bins');
  await page.getByLabel(/The problem/).fill('Campus waste is not sorted, so recyclables end up in landfill every day.');
  await page.getByLabel(/Your approach/).fill('Cameras and a small model sort waste at the bin and alert the cleaners.');
};

test('a wrong file type is refused with the list of allowed types, and a fake PDF is refused', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  const deck = page.locator('input[type=file]').first();
  await deck.setInputFiles({ name: 'notes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: PPTX });
  await expect(page.getByText(/\.ppt, \.pptx or \.pdf|ppt, pptx or pdf/i)).toBeVisible();
  await deck.setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('this is plain text, not a pdf at all') });
  await expect(page.getByText(/does not look like a real \.pdf/i)).toBeVisible();
  expect(idea()).toBeNull();
});

test('the team picks a PDF deck, previews it before sending, and submits', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await fillBasics(page);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'deck.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(page.getByText(/uploaded/)).toBeVisible();
  await page.getByRole('button', { name: /Preview deck\.pdf/ }).click();
  const dialog = page.getByRole('dialog', { name: /deck\.pdf/ });
  await expect(dialog.locator('iframe')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit idea' }).click();
  await expect(page.getByRole('article', { name: 'Your submission' })).toBeVisible();
  expect(idea()).toMatchObject({ status: 'SUBMITTED', deck: { name: 'deck.pdf', state: 'ATTACHED' } });
});

test('the saved PDF opens in a preview from the team page, and the signed link serves a PDF', async ({ page }) => {
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await page.getByRole('button', { name: /Preview deck\.pdf/ }).click();
  const frame = page.getByRole('dialog', { name: /deck\.pdf/ }).locator('iframe');
  await expect(frame).toBeVisible();
  const src = (await frame.getAttribute('src')) ?? '';
  expect(src).toContain('X-Amz-Signature');
  const type = await page.evaluate(async (url) => (await fetch(url)).headers.get('content-type'), src);
  expect(type).toContain('application/pdf');
  await expect(page.getByRole('dialog', { name: /deck.pdf/ }).getByRole('button', { name: 'Download deck.pdf' })).toBeVisible();
});

test('the organizers preview and download the PDF; a judge can reach it', async ({ page }) => {
  await signIn(page, admin);
  await page.goto(`/hackathons/${SLUG}/manage?tab=ideas`);
  await page.getByRole('button', { name: 'Read and review' }).first().click();
  await page.getByRole('button', { name: /Preview deck\.pdf/ }).click();
  await expect(page.getByRole('dialog', { name: /deck\.pdf/ }).locator('iframe')).toBeVisible();
  await page.keyboard.press('Escape');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download deck.pdf' }).click()]);
  expect(download.url()).toContain('X-Amz-Signature');
  expect(download.suggestedFilename()).toMatch(/.pdf$/);   // moto ignores the filename override real S3 honours

  await signIn(page, judge);
  const ideaId = idea()!.id;
  const status = await page.evaluate(async (id) => (await fetch(`/api/proxy/hackathons/pdf-pitch/ideas/${id}/files/deck/link/?inline=1`, { credentials: 'include' })).status, ideaId);
  expect(status).toBe(200);
});

test('a PowerPoint deck still works, as a download without a preview', async ({ page }) => {
  await signIn(page, admin);
  await page.goto(`/hackathons/${SLUG}/manage?tab=ideas`);
  // replace through the team's own page instead: the leader swaps the deck for a .pptx
  await signIn(page, leader);
  await page.goto(`/hackathons/${SLUG}/dashboard`);
  await page.getByRole('button', { name: 'Edit submission' }).click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'deck.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: PPTX });
  await expect(page.getByText(/uploaded/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Preview deck\.pptx/ })).toHaveCount(0);
  await expect(page.getByText(/cannot be previewed/i)).toBeVisible();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: /Download deck\.pptx/ })).toBeVisible();
  expect(idea()!.deck).toMatchObject({ name: 'deck.pptx', state: 'ATTACHED' });
});
