// Drives team withdrawal (participant) and the organizers' withdrawal panel against the stand-in API.
// Usage: node e2e-audit/withdraw-flow.mjs <base>   (fake-backend.mjs on :8100 and the site on <base> must be running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3100';
const API = 'http://localhost:8100';
const OUT = 'docs/ui-ux-audit/screenshots/withdraw';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const setState = (query) => fetch(`${API}/__withdraw?${query}`).then((r) => r.json());
const posts = () => fetch(`${API}/__withdraw-posts`).then((r) => r.json());

const browser = await chromium.launch();

async function session(role, viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const token = role === 'admin' ? 'admin' : role === 'noteam' ? 'user-noteam' : 'user';
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: token, url: BASE }, { name: 'srkrcc_user_role', value: role === 'admin' ? 'ADMIN' : 'STUDENT', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), role === 'admin'
    ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true }
    : { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'STUDENT' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|\[API Error\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
  return { ctx, page, errors };
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1);
const open = async (page, path) => { await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.waitForLoadState('domcontentloaded'); };

for (const [label, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
  const tag = `[${label}]`;

  // ---- a forming, solo team is withdrawn at once, with a reason ----
  await setState('reset=1&solo=1&registered=0');
  {
    const { ctx, page, errors } = await session('user', viewport);
    await open(page, '/hackathons/hackoverflow-2026/dashboard');
    const withdraw = page.getByRole('button', { name: 'Withdraw team' });
    await withdraw.waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);
    check(`${tag} the only member sees "Withdraw team"`, await withdraw.isEnabled());
    await withdraw.click();
    const dialog = page.getByRole('dialog', { name: 'Withdraw this team?' });
    await dialog.waitFor({ timeout: 10000 });
    check(`${tag} a forming team is told it is withdrawn at once`, await dialog.getByText(/withdraws the team and cancels its pending invites/).isVisible());
    check(`${tag} the dialog states the per-person limit`, await dialog.getByText(/Each person can create 2 teams/).isVisible());
    await dialog.getByRole('button', { name: 'Withdraw team' }).click();
    check(`${tag} an empty reason is refused with a message`, await dialog.getByText('Tell the organizers why you are withdrawing.').isVisible());
    const box = await dialog.boundingBox();
    const submit = await dialog.getByRole('button', { name: 'Withdraw team' }).boundingBox();
    check(`${tag} the Withdraw button stays in view`, submit && submit.y + submit.height <= viewport.height + 1 && box.x >= -1 && box.x + box.width <= viewport.width + 1);
    await page.screenshot({ path: `${OUT}/${label}-1-modal-error.png` });
    await dialog.getByLabel(/Why are you withdrawing/).fill('We could not find teammates');
    await dialog.getByRole('button', { name: 'Withdraw team' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });
    check(`${tag} the reason is sent with the withdrawal`, (await posts()).some((entry) => entry.startsWith('leave') && entry.includes('We could not find teammates')));
    check(`${tag} no horizontal scroll`, await noOverflow(page));
    check(`${tag} no console errors (withdraw)`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ---- a registered team asks, waits, and can take the request back ----
  await setState('reset=1&solo=1&registered=1');
  {
    const { ctx, page } = await session('user', viewport);
    await open(page, '/hackathons/hackoverflow-2026/dashboard');
    const withdraw = page.getByRole('button', { name: 'Withdraw team' });
    await withdraw.waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);
    await withdraw.click();
    const dialog = page.getByRole('dialog', { name: 'Withdraw this team?' });
    await dialog.waitFor({ timeout: 10000 });
    check(`${tag} a registered team is told the organizers must approve`, await dialog.getByText(/organizers have to approve this/).isVisible());
    await dialog.getByLabel(/Why are you withdrawing/).fill('Our laptop broke');
    await dialog.getByRole('button', { name: 'Ask to withdraw' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });
    const notice = page.getByText('Withdrawal requested, waiting for the organizers');
    check(`${tag} the dashboard shows the request is waiting`, await notice.waitFor({ timeout: 15000 }).then(() => true, () => false));
    check(`${tag} the Withdraw button is disabled while waiting`, await page.getByRole('button', { name: 'Withdraw team' }).isDisabled());
    await page.screenshot({ path: `${OUT}/${label}-2-pending.png` });
    await page.getByRole('button', { name: 'Cancel request' }).click();
    check(`${tag} the leader can take the request back`, await notice.waitFor({ state: 'hidden', timeout: 15000 }).then(() => true, () => false));
    check(`${tag} cancelling reached the server`, (await posts()).some((entry) => entry.startsWith('cancel-withdrawal')));
    await ctx.close();
  }

  // ---- a denied request shows the organizers' note ----
  await setState('reset=1&solo=1&registered=1&request=DENIED&note=Please%20stay%2C%20we%20have%20a%20spot');
  {
    const { ctx, page } = await session('user', viewport);
    await open(page, '/hackathons/hackoverflow-2026/dashboard');
    check(`${tag} a denied request shows the organizers' note`, await page.getByText('Please stay, we have a spot').waitFor({ timeout: 60000 }).then(() => true, () => false));
    await page.screenshot({ path: `${OUT}/${label}-3-denied.png` });
    await ctx.close();
  }

  // ---- hitting the creation limit shows the message in the create dialog ----
  await setState('reset=1');
  {
    const { ctx, page } = await session('noteam', viewport);
    await open(page, '/hackathons/hackoverflow-2026/dashboard?ps=1'); // opens the create dialog with problem statement 1 chosen
    const dialog = page.getByRole('dialog', { name: 'Create your team' });
    await dialog.waitFor({ timeout: 60000 });
    await dialog.waitFor({ timeout: 10000 });
    await dialog.getByLabel(/Team name/).fill('Limit');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByLabel(/read and accept the rules/).check();
    await dialog.getByRole('button', { name: 'Create team' }).click();
    check(`${tag} the creation limit message appears in the create dialog`, await dialog.getByText(/already created 2 teams.*Ask the organizers/).waitFor({ timeout: 10000 }).then(() => true, () => false));
    await page.screenshot({ path: `${OUT}/${label}-4-limit.png` });
    await ctx.close();
  }
}

// ---- organizers: the panel in the Teams tab ----
for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const tag = `[admin ${label}]`;
  await setState('reset=1');
  const { ctx, page, errors } = await session('admin', viewport);
  await open(page, '/admin/hackathons/hackoverflow-2026?tab=teams');
  const panel = page.getByRole('region', { name: 'Withdrawals' });
  await panel.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(2000);
  check(`${tag} the panel lists the waiting request with its reason`, await panel.getByText('Null Pointers').isVisible() && await panel.getByText(/Our laptop broke/).isVisible());
  check(`${tag} the panel flags a repeat creator`, await panel.getByText(/created 2, withdrew 2/).isVisible());
  check(`${tag} no horizontal scroll`, await noOverflow(page));
  await page.screenshot({ path: `${OUT}/admin-${label}-panel.png` });
  await panel.getByRole('button', { name: 'Allow one more team' }).click();
  check(`${tag} allowing one more team reaches the server`, await page.waitForFunction(() => true).then(async () => { await page.waitForTimeout(800); return (await posts()).some((entry) => entry.startsWith('allow')); }));
  await panel.getByRole('button', { name: 'Approve withdrawal' }).click();
  const dialog = page.getByRole('dialog', { name: /Withdraw Null Pointers\?/ });
  await dialog.waitFor({ timeout: 10000 });
  check(`${tag} the decision dialog explains what approving does`, await dialog.getByText(/waitlist moves up/).isVisible());
  await dialog.getByLabel(/Note for the leader/).fill('ok');
  await page.screenshot({ path: `${OUT}/admin-${label}-decide.png` });
  await dialog.getByRole('button', { name: 'Withdraw the team' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  check(`${tag} the decision with its note reaches the server`, (await posts()).some((entry) => entry.startsWith('decide') && entry.includes('"approve":true') && entry.includes('"note":"ok"')));
  check(`${tag} no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
