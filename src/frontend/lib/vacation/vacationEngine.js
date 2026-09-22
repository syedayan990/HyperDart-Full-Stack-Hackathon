import { addDays, daysBetweenInclusive, endOfYear, formatISO, isWeekend, parseISODate, startOfYear } from '../dates/dateUtils.js';
import { nationalHolidaysOnly } from '../holidays/holidayNormalizer.js';

const MAX_WINDOW_DAYS = 14;
const MAX_LEAVE_BUDGET = 5;

function buildStatusMap(year, holidays){
  const map = new Map();
  const holidayByDate = new Map(nationalHolidaysOnly(holidays).map((h)=>[h.date,h.name]));
  let cursor = startOfYear(year);
  const end = endOfYear(year);
  while(cursor<=end){
    if(holidayByDate.has(cursor)) map.set(cursor,{status:'holiday',name:holidayByDate.get(cursor)});
    else if(isWeekend(cursor)) map.set(cursor,{status:'weekend'});
    else map.set(cursor,{status:'work'});
    cursor=formatISO(addDays(parseISODate(cursor),1));
  }
  return map;
}

function opportunity(start,end,status){
  const dates=daysBetweenInclusive(start,end); let leaveDays=0,weekendDays=0,holidayDays=0; const leaveDates=[],holidayNames=[];
  for(const date of dates){const info=status.get(date); if(!info) continue; if(info.status==='weekend') weekendDays++; else if(info.status==='holiday'){holidayDays++; if(info.name) holidayNames.push(info.name);} else {leaveDays++; leaveDates.push(date);}}
  return {startDate:start,endDate:end,totalDays:dates.length,leaveDays,weekendDays,holidayDays,leaveDates,holidayNames:[...new Set(holidayNames)],efficiency:leaveDays?dates.length/leaveDays:null};
}

function rank(list){
  return [...list].sort((a,b)=>b.totalDays-a.totalDays || a.leaveDays-b.leaveDays || ((b.efficiency??-1)-(a.efficiency??-1)) || a.startDate.localeCompare(b.startDate));
}

function monthOverlap(start,end,month){ if(month==null) return true; return parseISODate(start).getMonth()===month || parseISODate(end).getMonth()===month || daysBetweenInclusive(start,end).some((d)=>parseISODate(d).getMonth()===month); }

function candidates(year,holidays){
  const status=buildStatusMap(year,holidays); const dates=daysBetweenInclusive(startOfYear(year),endOfYear(year)); const all=[];
  for(let i=0;i<dates.length;i++) for(let len=3;len<=MAX_WINDOW_DAYS && i+len-1<dates.length;len++){
    const c=opportunity(dates[i],dates[i+len-1],status);
    if(c.leaveDays<=MAX_LEAVE_BUDGET && c.holidayDays>0) all.push(c);
  }
  return all;
}

export function analyzeVacation({year,holidays,leaveBudget=0,targetDuration=null,month=null}){
  const all=candidates(year,holidays); const safeBudget=Math.max(0,Math.min(MAX_LEAVE_BUDGET,Number(leaveBudget??0)));
  const byBudget={}; for(let b=0;b<=MAX_LEAVE_BUDGET;b++) byBudget[b]=rank(all.filter(c=>c.leaveDays<=b))[0]||null;
  let filtered=all.filter(c=>c.leaveDays<=safeBudget && monthOverlap(c.startDate,c.endDate,month));
  let best=null;
  if(targetDuration){ const exact=filtered.filter(c=>c.totalDays===targetDuration); best=rank(exact)[0] || null; }
  else best=rank(filtered)[0] || null;
  const alternatives=best ? rank(filtered.filter(c=>c.startDate!==best.startDate || c.endDate!==best.endDate)).slice(0,4) : [];
  return {best,alternatives,byBudget};
}

export function buildICS(opportunity,{countryName='',holidayNames=[]}={}){
  if(!opportunity) return '';
  const start=parseISODate(opportunity.startDate); const endExclusive=addDays(parseISODate(opportunity.endDate),1);
  const fmt=(d)=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const summary=`Vacation (${countryName}) — ${opportunity.totalDays} days off`;
  const description=opportunity.leaveDays?`Take leave on: ${opportunity.leaveDates.join(', ')}. Built around: ${holidayNames.join(', ') || 'public holiday(s)'}.`:`No leave needed — built around: ${holidayNames.join(', ') || 'public holiday(s)'}.`;
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LeaveLens//HyperDart//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:leavelens-${opportunity.startDate}-${opportunity.endDate}@hyperdart`,`DTSTAMP:${fmt(new Date())}T000000Z`,`DTSTART;VALUE=DATE:${fmt(start)}`,`DTEND;VALUE=DATE:${fmt(endExclusive)}`,`SUMMARY:${summary}`,`DESCRIPTION:${description.replace(/,/g,'\\,')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
}
