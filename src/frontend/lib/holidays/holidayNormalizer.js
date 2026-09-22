export function normalizeHolidays(raw = []) {
  const byDate = new Map();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item?.date) continue;
    const types = item.holidayTypes || item.types || [];
    const isPublic = item.nationalHoliday === true || item.global === true || types.some((type) => /public|bank/i.test(type));
    if (!isPublic) continue;
    const normalized = {
      date: item.date,
      name: item.name || item.localName || 'Public holiday',
      isNational: Boolean(item.nationalHoliday ?? item.global),
      types,
    };
    const current = byDate.get(item.date);
    if (!current || (normalized.isNational && !current.isNational)) byDate.set(item.date, normalized);
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function nationalHolidaysOnly(holidays){ return holidays.filter((h)=>h.isNational || h.types.some((t)=>/public|bank/i.test(t))); }
