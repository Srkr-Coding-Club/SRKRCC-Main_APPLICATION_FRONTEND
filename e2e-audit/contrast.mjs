// Lists every colour-contrast failure axe finds on the given routes, with the measured ratio and colours.
// Usage: node e2e-audit/contrast.mjs <light|dark> <base> <role> route [route...]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [theme, BASE, role, ...routes] = process.argv.slice(2);
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
if (role !== 'anon') {
  await ctx.addCookies([{ name: 'srkrcc_access_token', value: role, url: BASE }, { name: 'srkrcc_user_role', value: role === 'admin' ? 'ADMIN' : 'NON_AFFILIATE', url: BASE }]);
  await ctx.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), role === 'admin'
    ? { id: 1, email: 'admin@srkr.ac.in', username: 'admin', first_name: 'Ada', last_name: 'Min', role: 'ADMIN', is_staff: true }
    : { id: 7, email: 'dana@srkr.ac.in', username: 'dana', first_name: 'Dana', last_name: 'R', role: 'NON_AFFILIATE' });
}
for (const route of routes) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.addScriptTag({ content: axeSrc });
  const out = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['color-contrast'] });
    return r.violations.flatMap((v) => v.nodes.map((n) => {
      const d = n.any[0]?.data || {};
      return { ratio: d.contrastRatio, fg: d.fgColor, bg: d.bgColor, size: d.fontSize, weight: d.fontWeight, text: (n.html.match(/>([^<]{1,40})/) || [])[1], cls: (n.html.match(/class="([^"]{0,70})/) || [])[1] };
    }));
  });
  console.log(`\n## ${theme} ${role} ${route}: ${out.length} failures`);
  for (const o of out) console.log(`${o.ratio}  ${o.fg} on ${o.bg}  ${o.size}/${o.weight}  "${o.text}"  .${o.cls}`);
  await page.close();
}
await browser.close();
