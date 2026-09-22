import { dateLabel, parseISODate } from '../dates/dateUtils.js';
export function takeAction(opportunity){ if(!opportunity || opportunity.leaveDays===0) return 'No leave needed'; return `Take ${opportunity.leaveDates.map((d)=>dateLabel(parseISODate(d))).join(' + ')}`; }
export function whyThisWorks(opportunity){
  if(!opportunity) return '';
  const {leaveDays,holidayNames,weekendDays,totalDays}=opportunity;
  if(leaveDays===0) return holidayNames.length ? `${holidayNames[0]} sits next to the weekend, giving you ${totalDays} consecutive days off without using leave.` : `A ready-made ${totalDays}-day break — no leave needed.`;
  if(holidayNames.length) return `${leaveDays} leave day${leaveDays===1?'':'s'} connect ${holidayNames[0]} with the weekend, creating ${totalDays} consecutive days off.`;
  return `${leaveDays} leave day${leaveDays===1?'':'s'} bridge the weekend into ${totalDays} consecutive days off.`;
}
export function budgetDeltaInsight(previous,next){ if(!previous||!next) return null; const delta=next.totalDays-previous.totalDays; return delta>0?`One additional leave day unlocks ${delta} more vacation day${delta===1?'':'s'}.`:null; }
