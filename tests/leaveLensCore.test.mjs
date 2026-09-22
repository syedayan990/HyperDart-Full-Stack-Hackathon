import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery } from '../src/frontend/lib/hyperdart/queryParser.js';
import { parseHyperDartSearchData } from '../src/frontend/lib/hyperdart/searchDataAdapter.js';
import { normalizeHolidays } from '../src/frontend/lib/holidays/holidayNormalizer.js';
import { analyzeVacation } from '../src/frontend/lib/vacation/vacationEngine.js';

const HOLIDAYS = normalizeHolidays([
  { date:'2026-01-26', name:'Republic Day', nationalHoliday:true, holidayTypes:['Public'] },
  { date:'2026-04-03', name:'Good Friday', nationalHoliday:true, holidayTypes:['Public'] },
  { date:'2026-10-02', name:'Gandhi Jayanti', nationalHoliday:true, holidayTypes:['Public'] },
]);

test('HyperDart adapter resolves country from documented entity shape', () => {
  const ctx = parseHyperDartSearchData({
    query: 'I have 2 leaves in India 2026',
    entities: [{ collectionType:'HD_LOCATION', entityType:'LOCATION', entityInfo:{ geo:{ country:'India', countryCode:'IN' } } }],
  });
  assert.equal(ctx.countryCode, 'IN');
  assert.equal(ctx.countryName, 'India');
});

test('query parser detects leave optimization', () => {
  const q = parseQuery('I have 2 leaves in India 2026');
  assert.deepEqual({ intent:q.intent, year:q.year, leaveBudget:q.leaveBudget }, { intent:'OPTIMIZE_LEAVE', year:2026, leaveBudget:2 });
});

test('query parser detects maximum days', () => {
  const q = parseQuery('How many days off can I get with 3 leaves?');
  assert.equal(q.intent, 'MAX_DAYS');
  assert.equal(q.leaveBudget, 3);
});

test('query parser detects exact day break', () => {
  const q = parseQuery('Find 4 day breaks in India 2026');
  assert.equal(q.intent, 'TARGET_DURATION');
  assert.equal(q.targetDuration, 4);
});

test('optimizer finds a no-leave Republic Day weekend', () => {
  const result = analyzeVacation({ year:2026, holidays:HOLIDAYS, leaveBudget:0 });
  assert.equal(result.best.startDate, '2026-01-24');
  assert.equal(result.best.endDate, '2026-01-26');
  assert.equal(result.best.totalDays, 3);
  assert.equal(result.best.leaveDays, 0);
});

test('optimizer respects leave budget and grows monotonically', () => {
  const days = [0,1,2,3].map((budget) => analyzeVacation({ year:2026, holidays:HOLIDAYS, leaveBudget:budget }).best.totalDays);
  assert.ok(days[1] >= days[0]);
  assert.ok(days[2] >= days[1]);
  assert.ok(days[3] >= days[2]);
});

test('exact-duration query returns exactly the requested duration', () => {
  const result = analyzeVacation({ year:2026, holidays:HOLIDAYS, leaveBudget:4, targetDuration:4 });
  assert.ok(result.best);
  assert.equal(result.best.totalDays, 4);
});
