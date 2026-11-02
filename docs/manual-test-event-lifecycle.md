# Manual test: the event lifecycle (everything not yet committed)

Covers My Events, cancelling, the seat coming back on a full event, feedback, attendance certificates, calendar files, round countdowns, reminders, and the phone lamp/header fixes. Each line is **do this → expect that**. Dates and times on tickets are shown in IST.

## 0. Setup
- [ ] Backend: `python manage.py migrate`. New: `events` 0005, 0006, 0007 and `notifications` 0004. `python manage.py check` is clean.
- [ ] Run `python manage.py runserver` and `pnpm dev`. Use three browser profiles (or one normal and two private windows):
  - **Admin** (role ADMIN).
  - **Asha**, a member who will attend.
  - **Ravi**, a member who registers but will not be checked in.
- [ ] In Admin → Events create these one-click events (name and email only), then change their dates with **Edit**:
  | Event | Start | Capacity | Attendance scanning |
  |---|---|---|---|
  | **Past Workshop** | 30 hours ago, 3 h long | 100 | on |
  | **Tiny Lab** | in 2 days | 2 | off |
  | **Running Talk** | 1 hour ago, 3 h long | 100 | off |
  | **Tomorrow Talk** | in 20 hours | 100 | off |
  | **Next Workshop** | in 5 days | 100 | off |
- [ ] Register Asha and Ravi for all five (Events page → Register). Register a third member for **Tiny Lab** if you want to test "full" with different people; or just use Asha + Ravi.
- [ ] For **Past Workshop**, check **Asha in** (not Ravi): open the scanner (`/attendance/scan`) as admin, scan Asha's QR badge from her profile ("View QR Badge"). If you cannot scan, Django shell: create an `AttendanceRecord` for Asha's badge.
- [ ] Expect: Past Workshop's form has attendance on, Asha has one scan, Ravi has none.

## 1. My Events (profile, as Asha)
- [ ] Open `/profile`. → One section called **My Events** with a count, tabs **Upcoming n / Past n**, and a "Forms Center" link. The old "My Enrolled Events" and "My Hackathons" headings are gone.
- [ ] Upcoming tab. → Running Talk (started, not finished), Tomorrow Talk, Tiny Lab, Next Workshop, soonest first, **ordered by the event date**.
- [ ] Look at each ticket's date line. → It is the **event's** date and time (for example "2nd Nov 2026 · 7:21 AM"), **not** the day Asha signed up.
- [ ] Past tab. → Past Workshop only, with the QR button and **Rate this event**.
- [ ] Press the **left/right arrow keys** on a focused tab. → Switches Upcoming ⇄ Past.
- [ ] Sign in as a member with only past events. → Opens on **Past**. A member with nothing registered: the empty state "No active registrations yet" with a Browse button.
- [ ] Hackathon team (any member with a team). → A team card sits in the same list, sorted by the hackathon's start date, showing "11 Nov 2026 · 2 members", its status pill and the dashboard link.
- [ ] A pending hackathon invite. → A highlighted "Invite to join …" row **above the tabs**, whichever tab is open.
- [ ] A registration for a plain form (not an event). → Listed under a separate **Forms** heading below, not in either tab.
- [ ] Narrow the window to 390px. → No sideways scroll; cards stack; tabs remain tappable (about 44px tall).

## 2. Cancel a registration (as Asha)
- [ ] Tomorrow Talk → **Cancel registration**. → A dialog asks "Cancel your registration?" with two buttons: **Keep my seat** and **Cancel registration** (red).
- [ ] Press **Keep my seat**. → Dialog closes, the ticket stays, nothing changes.
- [ ] Cancel again and confirm. → Message "Registration cancelled"; the ticket disappears; the My Events count drops by one.
- [ ] Reload `/profile`. → Still gone.
- [ ] Open Tomorrow Talk's event page. → You can register again; Admin → Events shows the registration count down by one.
- [ ] **Running Talk** (already started) and **Past Workshop**. → **No** Cancel button.
- [ ] Open a second private window as Asha and try to cancel an already-started event through the URL or API (`DELETE /api/events/<slug>/my-registration/`). → Refused with "Registration can no longer be cancelled because the event has started."
- [ ] Admin → Audit logs. → An entry "Cancelled Event Registration" naming the event.

## 3. A full event gives the seat back
- [ ] With Asha and Ravi both registered for Tiny Lab (capacity 2): the event page. → "Event full", register button disabled. In Admin → Forms the event's form is **Closed**.
- [ ] As Asha cancel Tiny Lab. → Admin → Forms: the form is **Published** again. The event page shows a seat open and the Register button is back.
- [ ] As a third member register for Tiny Lab. → Works; the form closes again.
- [ ] Edge: close an event's form on purpose while it still has room, then cancel someone. → The form **stays closed** (only a form that was full is reopened).
- [ ] Edge: raise Tiny Lab's capacity from 2 to 5 in Admin → Events while it is full. → The form reopens and people can register.

## 4. Feedback
**As Asha (checked in), Profile → Past → Past Workshop**
- [ ] Press **Rate this event**. → A dialog with five stars, "Would you recommend it to a friend?" (Yes/No) and two optional boxes with 0/500 counters.
- [ ] Press **Send feedback** with no stars. → "Choose a rating from 1 to 5." Nothing is saved.
- [ ] Choose 4 stars, type a comment, send. → "Thanks for your feedback"; the dialog closes.
- [ ] Open **Rate this event** again. → "You rated this event 4 out of 5." with **Change my answer**; change to 5 and save. → Still one answer (the admin count stays 1).
- [ ] Use the keyboard only (Tab to the stars, arrow keys, Space). → Stars are selectable; focus ring visible; the label reads "4 out of 5, Very good".

**As Ravi (registered, never checked in)**
- [ ] Past Workshop → **Rate this event**. → "Feedback is for people who were checked in at the event." and **no** Send button.

**Before the event ends**
- [ ] Call `PUT /api/events/<upcoming-slug>/feedback/` as Asha. → 403 "Feedback opens once the event has ended."

**As Admin → Events → Past Workshop → Feedback**
- [ ] Open the panel. → Average rating, Would recommend %, Response rate ("1 of 1 checked in"), the 1–5 spread (labels such as "4 stars" on one line), and the written answer with Asha's name.
- [ ] **Export** → CSV, Excel and JSON. → A file downloads, one row per answer. Put `=1+1` in a comment first: the CSV cell must not start with `=`.
- [ ] Open the panel on an event that has not ended. → A yellow note "This event has not ended yet…".
- [ ] A member opens the same API URL. → 403.

## 5. Attendance certificates
**Before release**
- [ ] Asha's Past Workshop ticket. → **No** Certificate button. Opening `/events/<slug>/certificate` directly shows "Certificates have not been released yet."

**As Admin → Events → Past Workshop → Certificates**
- [ ] Open the panel. → A "Release certificates" switch with "1 person was checked in…", a wording box, "Signed by" and "Their role", and a preview of the certificate.
- [ ] Type wording `{name} completed {event} with distinction.`, signer "Dr. Rao", role "Faculty Advisor", turn the switch on, **Save**. → "Certificate settings saved … Attendees can now open their certificates."
- [ ] Type `{team}` in the wording and Save. → A field message "Unknown placeholder(s): team".

**As Asha**
- [ ] Reload `/profile` → Past. → A **Certificate** button on Past Workshop.
- [ ] Press it. → A landscape certificate with her name, your wording, the event date, "Dr. Rao / Faculty Advisor" and a verification code; below it **Print or save as PDF**, **Copy verification link**, **Add to LinkedIn**.
- [ ] **Copy verification link**. → Button says "Link copied"; paste it into a private window.
- [ ] **Add to LinkedIn**. → Opens LinkedIn's "add certification" form in a new tab with the name, organization, date and your verification link filled in.
- [ ] **Print or save as PDF**. → The print preview shows only the certificate (no buttons, no site header).

**Public check (private window, signed out)**
- [ ] Open the verification link. → "This certificate is genuine" with Awarded to / For / Type: Participation. The browser tab reads "Asha Tester: Past Workshop certificate | SRKR Coding Club" (the club name **once**).
- [ ] Change the last characters of the link. → "We could not verify this certificate."
- [ ] Paste the link into a chat app or social card tester. → A card showing "Verified certificate", her name and "Participation · Past Workshop". For a bad code: "Certificate not verified".

**Others**
- [ ] As Ravi open `/events/<slug>/certificate`. → "Only people who were checked in at the event can get a certificate."
- [ ] A hackathon certificate (`/hackathons/<slug>/certificate`). → Looks as before, now with the same three buttons, and its verification link still works.

## 6. Calendar files and round countdown
- [ ] Event page for an event with a date (signed out is fine). → An **Add to calendar** button under the register button. For a closed event or one with no date: no button.
- [ ] Press it. → A `.ics` file downloads. Open it in your calendar: the event title, start/end, venue and the page link are there.
- [ ] Hackathon with two dated rounds → dashboard → **Add to calendar** (and the public page's button). → The file also holds "Hackathon: Round 1, Name" for each dated round; a round with no dates is missing.
- [ ] Hackathon dashboard → rounds timeline. → An upcoming round shows "· Starts in 2 days 3 hours"; the active round "· Ends in 45 minutes"; a finished round shows neither. Wait a minute: the text updates without reload.

## 7. Reminders and the email switch
- [ ] Profile (left column). → A **Notifications** card with "Email me before events" **on** by default.
- [ ] Turn it **off** as Ravi, reload. → Still off; message "Event reminder emails are off".
- [ ] On the server run `python manage.py send_event_reminders`. → "Sent N day-before and 0 hour-before reminder(s)." (Tomorrow Talk, in 20 hours, is due.)
- [ ] Run it a **second time**. → "Sent 0 …" (nothing twice).
- [ ] Asha's bell. → One notification "Tomorrow Talk starts tomorrow" (or "…today" if it starts later the same day), with the date, time and venue, a blue EVENT tag, and a link reading **Open event** (not "Open action"). Clicking it opens the event page.
- [ ] Asha's inbox (or the console if `EMAIL_PROVIDER=console`). → A "Reminder: Tomorrow Talk starts tomorrow" email with the page link and a line about turning emails off.
- [ ] Ravi. → The bell notification is there, but **no email**.
- [ ] Register a new member **after** the 24-hour mark of an event, then run the command. → That member gets **no** day-before reminder.
- [ ] A member who cancelled. → No reminder.
- [ ] Add `python manage.py send_event_reminders` to your hourly cron. → (Deployment step; reminders never go out without it.)

## 8. Phone and themes (390 × 844)
- [ ] `/profile` in **dark** and **light** theme. → No sideways scroll; My Events tabs, tickets and the Notifications card fit.
- [ ] Light theme, scroll down a long page. → The header is almost solid (about 90%): page text does **not** show through it.
- [ ] The lamp. → The light beam is a short cone that stays inside the header bar; the bead on the cord hangs inside the bar, not over the content below.
- [ ] Tap the lamp, then pull it. → The theme switches; the cord stretches while pulled and springs back.
- [ ] Open the phone menu (☰). → The big lamp in the menu still shows its long beam; the theme switch works.
- [ ] Desktop width. → The header is still glass-like (translucent); the desktop lamp's long beam is unchanged.

## 8b. Event cards, the event page and the phone menu
- [ ] `/events`. → Each event is a card like the hackathon cards: poster cover (or a ticket icon when there is none), a status chip top-left ("Registration open", "Opens soon", "Event full", "Closed"), the category and title on the cover, the description, **When** and **Where**, "N of M seats left", and the **Details** and **Register now** buttons.
- [ ] Scroll the list slowly. → The cards animate in with the **same sequence as the hackathon and form cards**: cover unveils top to bottom, chip pops, title rises out of a mask, the little timeline draws itself, the footer rises last. Nothing stays half-faded; scrolling back up replays it. With reduced motion on, the cards simply appear.
- [ ] Click a card, its title, or **Details**. → You go to `/events/<slug>`. **No pop-up** opens anywhere.
- [ ] The event page. → Poster banner, the title as the page heading, category and status chips, Date / Time (with IST) / Venue / Seats, a **Registration** panel (seats left, a bar, "Filling fast" near the end, the registration window, **Register now**, **Add to calendar**, **Share**), **About this event** (Markdown renders), and **More events** (up to three, soonest first, never this one).
- [ ] On a phone. → Registration sits **above** About; no sideways scroll; the buttons are about 44px tall.
- [ ] **Share** on a desktop. → "Link copied" and the link is on your clipboard. On a phone, the share sheet opens.
- [ ] A full event and a closed event. → The chip says "Event full" / "Closed", there is no Register button (the reason is shown instead), and a closed event has no Add to calendar.
- [ ] A one-click event: press **Register now** while signed in. → "You're registered"; the seats count goes down by one; reload keeps "You're registered".
- [ ] Share the event link in a chat. → The preview shows the poster and title. `/events/does-not-exist` is a real 404.
- [ ] Phone menu (☰). → **Only the lamp** changes the theme: there are no Light / Dark buttons above Sign out or Login. Pull or tap the lamp: the theme switches.

## 8c. Listings by time, a lone card, and withdrawal controls
- [ ] `/events` with a finished event in the data. → "Upcoming events (n)" counts **only** events still ahead; the finished one is not under it. A button **Past events (m)** sits below; opening it shows the finished events with "Event ended" and no Register button. Anything on right now has its own "Happening now" section above Upcoming.
- [ ] `/hackathons` likewise: a finished hackathon is under **Past hackathons**, labelled "Ended", with no Register Team button.
- [ ] When only **one** event is upcoming, its card is shown **wide** (poster left, details right) and centred, not alone in a third of the row. With two, they share the middle of the row. With three or more, three columns. On a phone every card is one column.
- [ ] A one-seat event says "1 seat", never "1 seats".
- [ ] **Events, Admin → Events → Edit → "Cancelling a registration".** Leave it allowed with hours `0`: the member's ticket has **Cancel registration** and no "until" line. Set `48` on an event more than 48 hours away: the ticket says "You can cancel until <date> IST". Set more hours than are left: the button is gone and the ticket says "Cancelling has closed for this event." Switch **Let registered people cancel** off: the button is gone, the ticket says "Cancelling is closed for this event.", and a direct `DELETE /api/events/<slug>/my-registration/` returns 409 `CANCELLATION_LOCKED`. Switch it back on: the button returns. A value below 0 or above 720 is refused by the form.
- [ ] **Hackathons, Admin → Hackathon → Settings → "Withdrawing a team".** *Needs approval* (default): the leader asks, sees "Request sent", the team stays registered until an organizer decides. *Instant*: the leader withdraws and the team is withdrawn at once with no request (a team in a round or checked in still asks). *Locked*: the **Withdraw team** button is off and the dashboard says "The organizers have closed withdrawals…"; the server refuses with `WITHDRAWAL_LOCKED`. Set a **deadline** in the future: the dashboard says "Withdrawals close <time>". Set it in the past: the button is off and it says "Withdrawals closed on <date> IST…". After the hackathon has ended nobody can withdraw, whatever the policy. A team still forming can always leave (before the end).

## 9. Regression checks (should be unchanged)
- [ ] Admin → Events: create, edit, **Close/Reopen**, **Hide/Show** and **Delete** an event as before. The new **Feedback** and **Certificates** buttons sit beside them.
- [ ] One-click and custom-form event registration, QR badge and the attendance scanner work as before.
- [ ] A hackathon dashboard loads, rounds, announcements and certificate card behave as before.
- [ ] The notification bell: mark as read, mark all read and delete still work for old notification types.
- [ ] The profile's other cards (Club membership, Celebrations, email verification, edit profile) work as before.

## 10. Automated checks
- [ ] `pnpm exec tsc --noEmit` is clean.
- [ ] `pnpm vitest run src/lib src/components/profile src/components/events src/components/nav src/components/notifications src/components/admin/__tests__/EventFeedbackPanel.test.tsx src/components/admin/__tests__/EventCertificatesPanel.test.tsx src/components/hackathons/__tests__/CertificateActions.test.tsx` passes.
- [ ] Backend: `python manage.py test apps.events apps.notifications apps.hackathons.tests.test_my_teams_dates` passes.
- [ ] End to end (own database, real backend and site): `pnpm test:e2e:live --headed e2e-live/event-lifecycle.live.spec.ts` (add `LIVE_SLOWMO=600` to watch). 15 tests; screenshots in `test-results/live/event-lifecycle/`.
