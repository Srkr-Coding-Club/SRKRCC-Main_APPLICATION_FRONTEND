# Manual test: dynamic form builder (everything not yet committed)

Run the backend and the frontend together (`python manage.py runserver`, `pnpm dev`), sign in as an **admin**, and use a second browser window signed in as a normal member. Tick each box as you go.

## 0. Setup
- [ ] Run migrations (`python manage.py migrate`); there are new ones up to `0031_form_language`.
- [ ] `CLIENT_IP_SHARED_SECRET` is set to the same value on backend and frontend.
- [ ] (Only for the bot check) `TURNSTILE_SECRET_KEY` on the backend, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the frontend.

## 1. Build a form (Admin → Forms → Builder)
- [ ] Add questions of every type; each has help text ("+ Add description"). Save as draft. Reload: nothing is lost.
- [ ] Add a **Page break**; the form shows "Page 1 of 2" for members.
- [ ] Add a **Hidden** question (query parameter `ref`) and a **Calculated** one (formula `{1} * {2}`).
- [ ] **Add conditions** on a question: watch an earlier question, "equals", a value. Save.
- [ ] Try to nest conditions more than 8 groups deep (via import): saving is refused with a clear message.

## 2. Fill the form (member window, `/forms/<slug>`)
- [ ] The conditional question appears and disappears as you change the answer; a required one blocks Submit only while shown.
- [ ] Calculated total updates as you type; hidden value arrives from `?ref=poster-7`.
- [ ] Press Submit with errors: focus jumps to the first problem, errors are read out, answers stay.
- [ ] Use only the keyboard (Tab, Enter, arrows in the dropdown, Escape closes it).
- [ ] Type some answers, close the tab, come back: "We restored your saved answers".
- [ ] Sign out in another tab, then press Submit: you are sent to sign in, and your answers are back afterwards.
- [ ] Double-click Submit: only one response is stored.

## 3. After submitting
- [ ] Builder → "After submitting": set a thank-you message with `{{1}}`, a redirect `/events`, delay 5s, language Telugu. Save, submit as a member: message shows the answer, countdown runs, "Stay here" cancels, "Go now" skips.
- [ ] Enter `javascript:alert(1)` as the redirect: it is flagged and refused on save.
- [ ] Switch the form language: buttons, "Page 1 of 2" and the thank-you screen change language.

## 4. Safety and limits
- [ ] Bot check on without a server secret: Publish is refused with a clear message (also when saving as published or re-opening).
- [ ] Rapidly submit/log in with a wrong password more than 10 times for one account: you are paused with "Try again in Ns"; another account on the same computer is not.
- [ ] A form with a limited option (e.g. Morning limited to 2): after 2 people choose it, it disappears for others.
- [ ] Two members submitting the last slot at the same moment: only one succeeds.

## 5. Editing a live form
- [ ] Publish, get a response, then change the form and Save: a **"Review changes"** dialog lists what changes and warns about existing responses; "Keep editing" saves nothing.
- [ ] Try to change the type of a question that already has answers: refused.
- [ ] Delete a question other questions depend on: you are warned and its rules are cleaned up.

## 6. History, copies, templates
- [ ] **History**: lists versions; pick one, "What going back would change", then Restore (asks first; saved as a new version).
- [ ] Forms list → **Duplicate**, **Save as template**, **Export file**, **Import** (good file works, broken file shows a clear message), **From template**.

## 7. Analytics and responses
- [ ] Builder → **Analytics**: totals, per-day chart, per-question counts, "where unfinished responses stopped".
- [ ] Admin → Responses: search, page through, open a response with the keyboard, select several and delete (asks first).
- [ ] Answers containing `<b>text</b>` or very long text are shown as plain text and do not break the table.

## 8. Look and feel
- [ ] Phone width (360px): no sideways scrolling; Submit is reachable; Telugu text fits.
- [ ] Dark mode on the form, builder and responses.
- [ ] Zoom the page to 200%: nothing is cut off.
- [ ] Every dialog (History, Analytics, Review, Templates): focus moves in, Tab stays inside, Escape closes, focus returns to the button.

## 9. Email verification (set `EMAIL_VERIFICATION_MODE=banner`, then `features`, then `block`)
- [ ] Sign up with a new account and any email address: nothing is sent, and a banner says "Verify your email address" (with "N days left" in `block` mode).
- [ ] Press **Verify email**: one email arrives (check spam). Press it again at once: it waits about a minute. The email has two links.
- [ ] Open the first link: the page shows your address and waits. Nothing happens until you press **Confirm my email**. Press it: "Email confirmed", the banner disappears (also on another open tab after you click back into it).
- [ ] Open the same link again, and on your phone: "Already confirmed".
- [ ] Ask for a new link and use the OLD one: "expired or replaced".
- [ ] In `features` mode, unverified: a form shows its questions but they are disabled, with "Verify your email address to fill in this form"; event or team actions open the "Verify your email" dialog. Verify, and they work.
- [ ] An unverified admin or club lead: the admin panel actions ask to verify first.
- [ ] **Wrong address?** Change it with your password: the NEW address gets a link and your address only changes after you confirm it.
- [ ] In `block` mode, set a test account's deadline in the past (Django admin, or `extend_verification_deadlines`): private pages (profile, admin, hackathon dashboards) show "Verify your email to continue"; the home page, events, forms and hackathon lists still open. Verify on another device and press "I have verified": the page returns without signing in again.
- [ ] **This wasn't me** (second link in the email): the page asks first; pressing it removes an unused account (or switches off a used one) and stops mail to that address for a while.
- [ ] Reset your password through "Forgot / Set Up?": that also verifies you.
- [ ] Break-glass: `python manage.py verify_email_manually <email>` verifies an account from the server.
