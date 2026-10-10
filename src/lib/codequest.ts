export const CODEQUEST_TIME_ZONE = 'Asia/Kolkata';

export function formatDateInTimeZone(
  date: Date,
  timeZone: string = CODEQUEST_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getCodeQuestToday(date: Date = new Date()): string {
  return formatDateInTimeZone(date);
}

export function formatProblemDate(dateId: string, today: string): string {
  if (dateId === today) return 'Today';
  const [year, month, day] = dateId.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}