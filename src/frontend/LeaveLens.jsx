import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, CircularProgress, Divider, IconButton, Modal, Slider } from '@mui/material';
import { CalendarMonthRounded, CheckCircleRounded, CloseRounded, ExpandMoreRounded, InfoOutlined, RefreshRounded, TravelExploreRounded } from '@mui/icons-material';
import { parseHyperDartSearchData } from './lib/hyperdart/searchDataAdapter';
import { parseQuery } from './lib/hyperdart/queryParser';
import { fetchHolidays } from './lib/holidays/holidayService';
import { analyzeVacation, buildICS } from './lib/vacation/vacationEngine';
import { budgetDeltaInsight, takeAction, whyThisWorks } from './lib/vacation/vacationExplanations';
import { addDays, dateLabel, formatISO, isWeekend, monthLabel, parseISODate } from './lib/dates/dateUtils';
import './leaveLens.css';

const MAX_BUDGET = 5;

function Timeline({ opportunity, holidays }) {
  if (!opportunity) return null;
  const holidaySet = new Map(holidays.map((h) => [h.date, h.name]));
  const days = Array.from({ length: opportunity.totalDays }, (_, i) => addDays(parseISODate(opportunity.startDate), i));
  return (
    <div className="ll-timeline" aria-label="Vacation date timeline">
      {days.map((date) => {
        const iso = formatISO(date);
        const holiday = holidaySet.get(iso);
        const type = opportunity.leaveDates.includes(iso) ? 'leave' : holiday ? 'holiday' : isWeekend(date) ? 'weekend' : 'work';
        return <div key={iso} className={`ll-day ll-day--${type}`} title={`${dateLabel(date)} · ${holiday || (type==='leave'?'Leave':type==='weekend'?'Weekend':'Workday')}`}><span className="ll-day__dow">{new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(date)}</span><strong>{date.getDate()}</strong><span className="ll-day__status">{type==='holiday'?'HOL':type==='leave'?'LEAVE':type==='weekend'?'OFF':'WORK'}</span></div>;
      })}
    </div>
  );
}

function optionTitle(opportunity){
  const holiday = opportunity?.holidayNames?.[0];
  if (holiday) return holiday.replace(/\s+Day$/i,'');
  return opportunity?.leaveDays===0 ? 'No-leave break' : 'Vacation window';
}

export default function LeaveLens({ searchData, messageHandlers }) {
  const context = useMemo(()=>parseHyperDartSearchData(searchData),[searchData]);
  const query = context.rawQuery || '';
  const parsed = useMemo(()=>parseQuery(query || `Best long weekends in India ${new Date().getFullYear()}`),[query]);
  const [loading,setLoading]=useState(false);
  const [apiError,setApiError]=useState(false);
  const [holidays,setHolidays]=useState([]);
  const [source,setSource]=useState('');
  const [leaveBudget,setLeaveBudget]=useState(Math.max(0,Math.min(MAX_BUDGET,parsed.leaveBudget ?? (parsed.intent==='LONG_WEEKEND'?0:2))));
  const [selected,setSelected]=useState(null);
  const [compareOpen,setCompareOpen]=useState(false);
  const previousBest=useRef(null);
  const [deltaInsight,setDeltaInsight]=useState(null);

  useEffect(()=>{
    messageHandlers?.componentLoaded?.();
    // HyperDart expects componentLoaded once the shell is render-ready;
    // never couple readiness to remote holiday API latency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    setSelected(null);
    setCompareOpen(false);
    setLeaveBudget(Math.max(0,Math.min(MAX_BUDGET,parsed.leaveBudget ?? (parsed.intent==='LONG_WEEKEND'?0:2))));
  },[context.countryCode,parsed.year,parsed.intent,parsed.leaveBudget]);

  const load = async()=>{
    if(!context.countryCode){setApiError(false);setLoading(false);return;}
    setLoading(true); setApiError(false);
    try{ const result=await fetchHolidays(context.countryCode,parsed.year); setHolidays(result.holidays); setSource(result.source); }
    catch{ setHolidays([]); setApiError(true); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ load(); },[context.countryCode,parsed.year]);

  const analysis = useMemo(()=>{
    if(!holidays.length) return {best:null,alternatives:[],byBudget:{}};
    return analyzeVacation({year:parsed.year,holidays,leaveBudget,targetDuration:parsed.targetDuration,month:parsed.month});
  },[holidays,parsed.year,parsed.targetDuration,parsed.month,leaveBudget]);

  const best=selected || analysis.best;
  useEffect(()=>{
    if(previousBest.current && best){ const insight=budgetDeltaInsight(previousBest.current,best); setDeltaInsight(insight); }
    else setDeltaInsight(null);
    previousBest.current=best;
  },[leaveBudget]);

  const downloadICS=()=>{
    if(!best) return;
    const ics=buildICS(best,{countryName:context.countryName || context.countryCode,holidayNames:best.holidayNames});
    const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`leavelens-${best.startDate}-to-${best.endDate}.ics`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  if(!context.countryCode) return <div className="ll-card ll-state-card"><div className="ll-state-icon"><TravelExploreRounded /></div><div><div className="ll-eyebrow">LEAVELENS</div><h3>Which country are you planning around?</h3><p>Try “I have 2 leaves in India 2026”.</p></div></div>;
  if(loading) return <div className="ll-card ll-loading-card"><div className="ll-loading-spinner"><CircularProgress size={20}/></div><div><div className="ll-eyebrow">LEAVELENS</div><div className="ll-loading-title">Finding your best break</div><div className="ll-muted">Checking holidays, weekends, and leave efficiency.</div></div></div>;
  if(apiError) return <div className="ll-card ll-state-card"><div className="ll-state-icon"><RefreshRounded /></div><div><div className="ll-eyebrow">HOLIDAY DATA</div><h3>Couldn’t load holiday data</h3><p>Check your connection and try again.</p><Button size="small" onClick={load}>Retry</Button></div></div>;
  if(!best){ const closest=analysis.byBudget?.[0]; return <div className="ll-card ll-state-card"><div className="ll-eyebrow">NO MATCH</div><h3>{parsed.targetDuration ? `No ${parsed.targetDuration}-day break found` : 'No suitable vacation window found'}</h3><p>{closest ? `The closest option gives you ${closest.totalDays} consecutive days.` : 'Try another year or a larger leave budget.'}</p>{closest && <Button size="small" onClick={()=>setSelected(closest)}>See closest match</Button>}</div>; }

  const isNoLeaveMode=parsed.intent==='LONG_WEEKEND' && parsed.leaveBudget===null;
  const contextLabel=parsed.month!==null ? `${monthLabel(parsed.month)} · ${parsed.year}` : String(parsed.year);
  return (
    <div className="ll-shell">
      <div className="ll-context-row">
        <div className="ll-brand"><div className="ll-brand-mark"><TravelExploreRounded /></div><div><div className="ll-brand-name">LeaveLens</div><div className="ll-brand-sub">Vacation intelligence</div></div></div>
        <div className="ll-context-chip"><CalendarMonthRounded fontSize="small" /><span>{context.countryName || context.countryCode} · {contextLabel}</span></div>
      </div>
      <div className="ll-query-context" title={query}><span>Planning around</span><strong>{query}</strong></div>
      <div className="ll-card">
        <div className="ll-card-head">
          <div>
            <div className="ll-eyebrow">{isNoLeaveMode ? 'BEST NO-LEAVE BREAK' : 'YOUR BEST BREAK'}</div>
            <div className="ll-title">{best.totalDays}<span>{best.totalDays===1?'day off':'days off'}</span></div>
            <div className="ll-human-caption">{best.leaveDays ? `Turn ${best.leaveDays} leave day${best.leaveDays===1?'':'s'} into ${best.totalDays} consecutive days away from work.` : `A ready-made ${best.totalDays}-day break — no leave needed.`}</div>
          </div>
          <div className="ll-head-side"><span className="ll-best-badge"><CheckCircleRounded fontSize="inherit" /> Best match</span><div className="ll-metric-stack"><div><strong>{best.leaveDays}</strong><span>{best.leaveDays===1?'leave':'leaves'}</span></div><div><strong>{best.efficiency?`${best.efficiency.toFixed(1)}×`:'—'}</strong><span>efficiency</span></div></div></div>
        </div>
        <Divider className="ll-divider" />
        <div className="ll-control-row"><div><div className="ll-control-label">How much leave can you spare?</div><div className="ll-muted">Maximum days you are willing to spend</div></div><div className="ll-slider-wrap"><Slider value={leaveBudget} min={0} max={MAX_BUDGET} step={1} marks size="small" aria-label="Leave budget" onChange={(_,value)=>{setSelected(null);setLeaveBudget(value)}}/><span className="ll-slider-value">{leaveBudget}</span></div></div>
        <div className="ll-answer-callout"><div className="ll-answer-icon"><CheckCircleRounded /></div><div><div className="ll-answer-label">RECOMMENDED</div><div className="ll-answer-main">{takeAction(best)}</div></div></div>
        <div className="ll-timeline-wrap"><div className="ll-timeline-header"><div className="ll-section-title">Your break</div><span>{dateLabel(parseISODate(best.startDate))} – {dateLabel(parseISODate(best.endDate))}</span></div><Timeline opportunity={best} holidays={holidays}/></div>
        <div className="ll-insight"><span className="mark">✦</span><p>{deltaInsight || whyThisWorks(best)}</p></div>
        <div className="ll-secondary-actions"><button type="button" className="ll-compare-toggle" onClick={()=>setCompareOpen(true)}><span>Compare other breaks</span><ExpandMoreRounded fontSize="small" /></button><button type="button" className="ll-ics-button" onClick={downloadICS}>Add to calendar</button></div>
        <footer className="ll-footer"><span>{source === 'Nager.Date' ? 'Live holiday data · Nager.Date' : source === 'Tallyfy fallback' ? 'Live holiday data · fallback source' : 'Fallback holiday data'}</span><span>Mon–Fri workweek assumption</span><span><InfoOutlined fontSize="inherit" /></span></footer>
      </div>
      <Modal open={compareOpen} onClose={()=>setCompareOpen(false)} aria-labelledby="ll-compare-title"><div className="ll-modal"><div className="ll-modal-head"><div><div className="ll-eyebrow">EXPLORE</div><h3 id="ll-compare-title">Other strong breaks</h3></div><IconButton onClick={()=>setCompareOpen(false)} aria-label="Close"><CloseRounded /></IconButton></div><div className="ll-compare-list">{analysis.alternatives.length ? analysis.alternatives.map((opt,index)=><button type="button" key={`${opt.startDate}-${opt.endDate}`} className={`ll-opportunity ${selected?.startDate===opt.startDate?'ll-opportunity--active':''}`} onClick={()=>{setSelected(opt);setCompareOpen(false)}}><span className="ll-opportunity__rank">{String(index+1).padStart(2,'0')}</span><span className="ll-opportunity__body"><strong>{optionTitle(opt)}</strong><span>{opt.totalDays} days · {opt.leaveDays} leave{opt.leaveDays===1?'':'s'} · {dateLabel(parseISODate(opt.startDate))} – {dateLabel(parseISODate(opt.endDate))}</span></span><span className="ll-opportunity__eff">{opt.efficiency?`${opt.efficiency.toFixed(1)}×`:'—'}</span></button>) : <p className="ll-muted">No other strong options at this leave budget.</p>}</div></div></Modal>
    </div>
  );
}
