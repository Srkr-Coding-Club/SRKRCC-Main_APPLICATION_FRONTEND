import type { CheckInByTeam } from '@/lib/types';

const STYLE = `
  body { font: 13px/1.4 system-ui, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  p.meta { margin: 0 0 14px; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  tr.team td { background: #f6f6f6; font-weight: 700; }
  td.box { width: 90px; text-align: center; font-size: 16px; }
  tr { break-inside: avoid; }
  @page { margin: 12mm; }
`;

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');

/** Builds the sheet with DOM calls and text nodes only, so a name can never be read as markup. */
export function buildAttendanceSheet(doc: Document, data: CheckInByTeam, title: string): void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const el = doc.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  doc.title = `${title}: ${data.session.name}`;
  const style = make('style', STYLE);
  doc.head.appendChild(style);
  doc.body.replaceChildren(
    make('h1', `${title}: ${data.session.name}`),
    make('p', `${data.totals.people_in} of ${data.totals.people} people in · ${data.totals.teams} teams · printed ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 'meta'),
  );
  const table = make('table');
  const head = make('tr');
  for (const label of ['Name', 'Role', 'Email', 'Phone', 'Present']) head.appendChild(make('th', label));
  table.appendChild(head);
  for (const team of data.teams) {
    const row = make('tr', undefined, 'team');
    const cell = make('td', `${team.name}: ${team.present} of ${team.total} in`);
    cell.colSpan = 5;
    row.appendChild(cell);
    table.appendChild(row);
    for (const member of team.members) {
      const line = make('tr');
      line.append(
        make('td', member.name), make('td', member.role === 'LEADER' ? 'Leader' : 'Member'), make('td', member.email), make('td', member.phone),
        make('td', member.checked_in ? `☑ ${clock(member.checked_in_at)}` : '☐', 'box'),
      );
      table.appendChild(line);
    }
  }
  doc.body.appendChild(table);
}

/** Opens the attendance sheet in a new window and prints it ("Save as PDF" there makes a file). False when the browser blocked the window. */
export function printAttendanceSheet(data: CheckInByTeam, title: string): boolean {
  const popup = window.open('', '_blank');
  if (!popup) return false;
  buildAttendanceSheet(popup.document, data, title);
  popup.focus();
  popup.print();
  return true;
}
