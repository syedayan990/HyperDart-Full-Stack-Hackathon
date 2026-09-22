const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const WORD_NUMBERS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function wordOrDigit(token) {
  return /^\d+$/.test(token) ? Number(token) : (WORD_NUMBERS[token] ?? null);
}

function extractYear(query, now = new Date()) {
  const explicit = query.match(/\b(20\d{2})\b/);
  if (explicit) return Number(explicit[1]);
  if (/\bnext year\b/i.test(query)) return now.getFullYear() + 1;
  return now.getFullYear();
}

function extractMonth(query) {
  const match = query.toLowerCase().match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  return match ? MONTHS.indexOf(match[1]) : null;
}

function extractLeaveBudget(query) {
  const lower = query.toLowerCase();
  const patterns = [
    /(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:leave|leaves|leave days?)/,
    /(?:with|using|use)\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+leaves?/,
    /i\s+have\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+leaves?/,
  ];
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) return wordOrDigit(match[1]);
  }
  return null;
}

function extractTargetDuration(query) {
  const lower = query.toLowerCase();
  const match = lower.match(/(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*day[s]?\s*(?:break|breaks|vacation|vacations|holiday|holidays|off|trip)?/);
  return match ? wordOrDigit(match[1]) : null;
}

function detectIntent(query, leaveBudget, targetDuration) {
  const lower = query.toLowerCase();
  if (targetDuration !== null && /\b(find|show|get|list)\b.*\bday/.test(lower)) return 'TARGET_DURATION';
  if (/\b(how\s+many|how\s+much|maximum|maximize|max)\b.*\b(days? off|vacation|break)\b/.test(lower) && leaveBudget !== null) return 'MAX_DAYS';
  if (/\blong weekends?\b/.test(lower)) return 'LONG_WEEKEND';
  if (leaveBudget !== null) return 'OPTIMIZE_LEAVE';
  if (/holiday|vacation|leave|break|time off|days off/.test(lower)) return 'GENERAL_HOLIDAY_QUERY';
  return 'GENERAL_HOLIDAY_QUERY';
}

export function parseQuery(query = '', now = new Date()) {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const leaveBudget = extractLeaveBudget(normalized);
  const targetDuration = extractTargetDuration(normalized);
  return {
    intent: detectIntent(normalized, leaveBudget, targetDuration),
    year: extractYear(normalized, now),
    leaveBudget,
    targetDuration,
    month: extractMonth(normalized),
  };
}
