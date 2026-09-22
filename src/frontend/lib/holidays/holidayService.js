import { normalizeHolidays } from './holidayNormalizer.js';

const NAGER_BASE = 'https://date.nager.at/api/v4/Holidays';
const TALLYFY_BASE = 'https://tallyfy.com/national-holidays/api';
const TIMEOUT_MS = 3200;
const cache = new Map();

const DEMO_HOLIDAYS = {
  'IN-2026': [
    { date:'2026-01-26', name:'Republic Day', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-03-04', name:'Holi', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-04-03', name:'Good Friday', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-08-15', name:'Independence Day', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-10-02', name:'Gandhi Jayanti', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-11-08', name:'Diwali', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-11-24', name:'Guru Nanak Jayanti', nationalHoliday:true, holidayTypes:['Public'] },
    { date:'2026-12-25', name:'Christmas Day', nationalHoliday:true, holidayTypes:['Public'] },
  ],
  'GB-2026': [
    { date:'2026-01-01', name:"New Year's Day", nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-04-03', name:'Good Friday', nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-04-06', name:'Easter Monday', nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-05-04', name:'Early May Bank Holiday', nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-05-25', name:'Spring Bank Holiday', nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-08-31', name:'Summer Bank Holiday', nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-12-25', name:'Christmas Day', nationalHoliday:true, holidayTypes:['Public','Bank'] },
    { date:'2026-12-28', name:'Boxing Day (substitute)', nationalHoliday:true, holidayTypes:['Public','Bank'] },
  ],
};

async function requestJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.status === 204) throw new Error('No holiday content');
    return await response.json();
  } finally { clearTimeout(timer); }
}

function normalizeTallyfy(payload){
  const items = Array.isArray(payload?.holidays) ? payload.holidays : [];
  return normalizeHolidays(items.map((item)=>({ date:item?.date, name:item?.name, nationalHoliday:item?.type==='national'||item?.type==='public'||item?.nationalHoliday===true, holidayTypes:item?.type?[item.type]:['Public'] })));
}

export async function fetchHolidays(countryCode, year) {
  const code = String(countryCode).toUpperCase();
  const key = `${code}-${year}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const data = normalizeHolidays(await requestJson(`${NAGER_BASE}/${code}/${year}`));
    if (!data.length) throw new Error('Nager returned no holidays');
    const result = { holidays:data, source:'Nager.Date', isFallback:false };
    cache.set(key,result); return result;
  } catch (nagerError) {
    try {
      const data = normalizeTallyfy(await requestJson(`${TALLYFY_BASE}/${code}/${year}.json`));
      if (!data.length) throw new Error('Tallyfy returned no holidays');
      const result = { holidays:data, source:'Tallyfy fallback', isFallback:true };
      cache.set(key,result); return result;
    } catch (fallbackError) {
      const data = normalizeHolidays(DEMO_HOLIDAYS[key] || []);
      if (!data.length) throw new Error(`Holiday data unavailable for ${code} ${year}`);
      const result = { holidays:data, source:'Bundled emergency data', isFallback:true, emergencyFallback:true };
      cache.set(key,result); return result;
    }
  }
}

export function clearHolidayCache(){ cache.clear(); }
