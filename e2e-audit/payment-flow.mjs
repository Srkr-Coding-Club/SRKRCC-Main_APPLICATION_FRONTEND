// Drives paying the fee at registration in a real browser against the stand-in API: the leader's create-team payment step,
// the pending / rejected cards, and the organizer's Payments tab (verify, reject, reopen, remove).
// Usage: node e2e-audit/payment-flow.mjs <base> [outDir]   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'docs/ui-ux-audit/screenshots/payments';
const API = 'http://localhost:8100';
const SLUG = 'hackoverflow-2026';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const seen = (locator, timeout = 10000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
const gone = (locator, timeout = 10000) => locator.waitFor({ state: 'detached', timeout }).then(() => true).catch(() => false);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const browser = await chromium.launch();

async function session(role, viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
  const token = role === 'admin' ? 'admin' : 'user-noteam';
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: role === 'admin' ? 'ADMIN' : 'STUDENT', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), role === 'admin'
    ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true }
    : { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'STUDENT' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]|\[Report Only\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  return { ctx, page, errors };
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);
/** Team step -> rules step (this event asks for them) -> payment step. */
async function toPaymentStep(dialog, name) {
  await dialog.getByLabel(/Team name/).fill(name);
  await dialog.getByRole('button', { name: 'Next' }).click();
  await dialog.getByLabel(/I have read and accept the rules/).check();
  await dialog.getByRole('button', { name: 'Next' }).click();
}
const control = (query) => fetch(`${API}/__pay?${query}`);

for (const [label, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
  await control('reset=1&stage=REGISTRATION');
  const leader = await session('user', viewport);
  const { page } = leader;

  // ---------- the leader pays while creating the team ----------
  await page.goto(`${BASE}/hackathons/${SLUG}/dashboard?ps=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const dialog = page.getByRole('dialog');
  check(`[${label}] the create-team dialog opens with the fee shown on the page behind it`, await seen(dialog, 60000));
  await page.waitForTimeout(1500);
  check(`[${label}] the dialog lists a Payment step`, await seen(dialog.getByRole('list', { name: 'Progress' }).getByText('Payment')));
  await toPaymentStep(dialog, 'Alpha');
  check(`[${label}] the payment step states the amount`, await seen(dialog.getByText('Pay ₹200 to register your team')));
  check(`[${label}] the payment QR code and note are shown`, (await seen(dialog.getByRole('img', { name: 'Payment QR code' }))) && (await seen(dialog.getByText('UPI: club@upi'))));
  await page.screenshot({ path: `${OUT}/${label}-payment-step.png` });

  await dialog.getByRole('button', { name: 'Pay and create team' }).click();
  check(`[${label}] nothing is sent without a screenshot and a transaction id`, (await seen(dialog.getByText('Upload the screenshot of your payment.'))) && (await seen(dialog.getByText('Enter the transaction ID of your payment.'))));

  await dialog.locator('input[type="file"]').setInputFiles({ name: 'pay.png', mimeType: 'image/png', buffer: PNG });
  check(`[${label}] the screenshot uploads and is attached`, await seen(dialog.getByText('pay.png').first(), 15000));
  await dialog.getByLabel(/Transaction ID/).fill('DUP');
  await dialog.getByRole('button', { name: 'Pay and create team' }).click();
  check(`[${label}] a used transaction id is refused on its own field and the form keeps its values`, (await seen(dialog.getByText(/already been used/))) && (await dialog.getByLabel(/Transaction ID/).inputValue()) === 'DUP');
  check(`[${label}] no horizontal scroll in the payment step`, await noOverflow(page));

  await dialog.getByLabel(/Transaction ID/).fill('UPI-2026-1');
  await dialog.getByRole('button', { name: 'Pay and create team' }).click();
  check(`[${label}] the team is created and shows as waiting for the organizers`, await seen(page.getByText('Waiting for the organizers').first(), 15000));
  check(`[${label}] the header says payment pending`, await seen(page.getByText('Payment pending').first()));
  check(`[${label}] the transaction id and amount are shown`, (await seen(page.getByText('UPI-2026-1'))) && (await seen(page.getByText('₹200').first())));
  check(`[${label}] a pending team has no member list, idea or submission panels`, (await page.getByText(/Team members \(/).count()) === 0 && (await page.getByText('Idea and project submission').count()) === 0);
  await page.screenshot({ path: `${OUT}/${label}-pending.png`, fullPage: true });

  // ---------- the organizer rejects it ----------
  const organizer = await session('admin', viewport);
  const admin = organizer.page;
  await admin.goto(`${BASE}/admin/hackathons/${SLUG}?tab=payments`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  check(`[${label}] the Payments tab lists the team waiting for a check`, await seen(admin.getByText('Alpha').first(), 60000) && await seen(admin.getByText(/1 to check/).first()));
  check(`[${label}] amount, reference and the leader's contacts are shown`, (await seen(admin.getByText('UPI-2026-1'))) && (await seen(admin.getByRole('link', { name: /dana@srkr.ac.in/ }))));
  await admin.waitForTimeout(1500);
  await admin.screenshot({ path: `${OUT}/${label}-admin-queue.png`, fullPage: true });
  await admin.getByRole('button', { name: 'Reject', exact: true }).click();
  await admin.getByLabel(/Why is it being rejected/).fill('Amount does not match');
  await admin.getByRole('button', { name: 'Reject payment' }).click();
  check(`[${label}] rejecting leaves the pending list`, await seen(admin.getByText('Nothing is waiting for a check.')));
  await admin.getByRole('tab', { name: /Rejected/ }).click();
  check(`[${label}] the reason is kept for organizers`, await seen(admin.getByText(/Reason \(only organizers see this\): Amount does not match/)));

  // ---------- the leader sees "contact the club", never a refund ----------
  await page.reload({ waitUntil: 'domcontentloaded' });
  check(`[${label}] the leader is told to contact the club representatives`, await seen(page.getByText('Your payment could not be verified. Please contact the club representatives.'), 20000));
  check(`[${label}] the club contacts are listed`, await seen(page.getByRole('list', { name: 'Club representatives' }).getByText('Ravi Kumar')));
  const text = (await page.locator('body').innerText()).toLowerCase();
  check(`[${label}] nothing on the page mentions a refund or the organizers' reason`, !text.includes('refund') && !text.includes('amount does not match'));
  check(`[${label}] a rejected team cannot be cancelled by the leader`, (await page.getByRole('button', { name: 'Cancel and start again' }).count()) === 0);
  await page.screenshot({ path: `${OUT}/${label}-rejected.png`, fullPage: true });

  // ---------- reopened, then verified ----------
  await admin.getByRole('button', { name: /Reopen/ }).click();
  await admin.getByRole('tab', { name: /To check/ }).click();
  check(`[${label}] a reopened payment is back in the queue`, await seen(admin.getByRole('button', { name: 'Verify', exact: true })));
  await admin.getByRole('button', { name: 'Verify', exact: true }).click();
  await admin.getByRole('dialog').getByRole('button', { name: 'Verify payment' }).click();
  check(`[${label}] verifying leaves the waiting list`, await seen(admin.getByText('Nothing is waiting for a check.')));
  await admin.getByRole('tab', { name: /Verified/ }).click();
  check(`[${label}] the verified payment shows who verified it`, await seen(admin.getByText(/Verified by Ada Min/)));
  check(`[${label}] a verified payment cannot be removed from here`, (await admin.getByRole('button', { name: /Remove team/ }).count()) === 0);
  await admin.screenshot({ path: `${OUT}/${label}-admin-verified.png`, fullPage: true });
  check(`[${label}] no horizontal scroll on the Payments tab`, await noOverflow(admin));
  check(`[${label}] no console errors for the organizer`, organizer.errors.length === 0, organizer.errors.join(' | '));

  await page.reload({ waitUntil: 'domcontentloaded' });
  check(`[${label}] once verified the leader sees the normal team page`, await seen(page.getByText(/Team members \(/), 20000) && (await page.getByText('Waiting for the organizers').count()) === 0);
  check(`[${label}] no console errors for the leader`, leader.errors.length === 0, leader.errors.join(' | '));
  await leader.ctx.close();
  await organizer.ctx.close();

  // ---------- cancel while pending, and remove from the queue ----------
  await control('reset=1&stage=REGISTRATION');
  const again = await session('user', viewport);
  await again.page.goto(`${BASE}/hackathons/${SLUG}/dashboard?ps=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const second = again.page.getByRole('dialog');
  await second.waitFor({ timeout: 60000 });
  await again.page.waitForTimeout(1500);
  await toPaymentStep(second, 'Beta');
  await second.locator('input[type="file"]').setInputFiles({ name: 'pay.png', mimeType: 'image/png', buffer: PNG });
  await seen(second.getByText('pay.png').first(), 15000);
  await second.getByLabel(/Transaction ID/).fill('UPI-2');
  await second.getByRole('button', { name: 'Pay and create team' }).click();
  await seen(again.page.getByText('Waiting for the organizers').first(), 15000);
  await again.page.getByRole('button', { name: 'Cancel and start again' }).click();
  check(`[${label}] cancelling asks for confirmation`, await seen(again.page.getByRole('dialog').getByText('Cancel this registration?')));
  await again.page.getByRole('dialog').getByRole('button', { name: 'Cancel registration' }).click();
  check(`[${label}] after cancelling the leader can create a team again`, await seen(again.page.getByRole('button', { name: /Create a team/ }), 15000));
  check(`[${label}] the dashboard mentions the fee before creating a team`, await seen(again.page.getByText(/Registering costs ₹200/)));
  check(`[${label}] no console errors after cancelling`, again.errors.length === 0, again.errors.join(' | '));
  await again.ctx.close();
}

// ---------- a hackathon with no fee asks for nothing ----------
await control('reset=1&stage=NONE');
{
  const { ctx, page, errors } = await session('user', { width: 390, height: 844 });
  await page.goto(`${BASE}/hackathons/${SLUG}/dashboard?ps=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1000);
  check('without a fee there is no payment step', (await dialog.getByRole('list', { name: 'Progress' }).getByText('Payment').count()) === 0 && (await dialog.getByText(/Pay ₹/).count()) === 0);
  check('no console errors without a fee', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
await control('reset=1&stage=NONE');
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
