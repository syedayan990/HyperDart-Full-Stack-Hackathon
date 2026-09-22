export const WEEKEND_DAYS = new Set([0, 6]);
export const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseISODate(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d); }
export function addDays(date, days) { const next = new Date(date); next.setDate(next.getDate()+days); return next; }
export function isWeekend(dateOrIso) { const date = typeof dateOrIso === 'string' ? parseISODate(dateOrIso) : dateOrIso; return WEEKEND_DAYS.has(date.getDay()); }
export function dateLabel(dateOrIso) { const date = typeof dateOrIso === 'string' ? parseISODate(dateOrIso) : dateOrIso; return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric'}).format(date); }
export function monthLabel(index) { return MONTH_LABELS[index] ?? null; }
export function dayLabel(iso) { return DAY_LABELS[parseISODate(iso).getDay()]; }
export function dayOfMonth(iso) { return parseISODate(iso).getDate(); }
export function daysBetweenInclusive(startIso,endIso){ const out=[]; let cur=startIso; while(cur<=endIso){out.push(cur); cur=formatISO(addDays(parseISODate(cur),1));} return out; }
export function startOfYear(year){ return `${year}-01-01`; }
export function endOfYear(year){ return `${year}-12-31`; }
export function diffDays(start,end){ return Math.round((new Date(end.getFullYear(),end.getMonth(),end.getDate()) - new Date(start.getFullYear(),start.getMonth(),start.getDate()))/86400000); }
