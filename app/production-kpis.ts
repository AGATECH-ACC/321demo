import {CHECKS,gates,milestones,today,type Job} from './model.ts';
export const isDemo=(job:Job)=>job.id.startsWith('32100000-0000-4000-a000-');
export function mytDate(value?:string|null){if(!value)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value?'':value;const date=new Date(value);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function completed(job:Job){return ['Final approved','Scheduled','Published'].includes(job.status)&&gates(job,job.internalApproval,job.clientApproval).length===0;}
export type Timing='On time'|'Late'|'Overdue'|'Pending'|'Not measured';
export function timing(due:string,actual:string,done:boolean,now:string):Timing {if(!due||done&&!actual)return 'Not measured';if(actual)return actual<=due?'On time':'Late';return due<now?'Overdue':'Pending';}
export function videoKpi(job:Job,now=today()){
 const due=milestones(job),first=mytDate(job.versions[0]?.at),done=completed(job),final=done?mytDate(job.finalizedAt):'';
 return {job,done,draftDue:due.firstDraft,firstDraft:first,finalDue:due.final,finalAt:final,draftTiming:timing(due.firstDraft,first,job.versions.length>0,now),finalTiming:timing(due.final,final,done,now),revisions:Math.max(0,job.versions.length-1),quality:CHECKS.filter(([key])=>job.checks[key]).length};
}
export function summarizeKpis(jobs:Job[],now=today()){
 const rows=jobs.filter(j=>!j.archived).map(j=>videoKpi(j,now));
 const rate=(key:'draftTiming'|'finalTiming')=>{const eligible=rows.filter(r=>['On time','Late','Overdue'].includes(r[key]));const onTime=eligible.filter(r=>r[key]==='On time').length;return {onTime,eligible:eligible.length,percent:eligible.length?Math.round(onTime/eligible.length*100):null,missing:rows.filter(r=>r[key]==='Not measured').length,pending:rows.filter(r=>r[key]==='Pending').length};};
 return {rows,total:rows.length,done:rows.filter(r=>r.done).length,draft:rate('draftTiming'),final:rate('finalTiming'),revisions:rows.reduce((n,r)=>n+r.revisions,0)};
}
/** Server-owned milestone; old completed records stay unmeasured until a genuine new completion. */
export function completionTimestamp(prior:Job|null,next:Job,now:string){if(!completed(next))return null;if(prior&&completed(prior)&&prior.versions.at(-1)?.id===next.versions.at(-1)?.id&&prior.versions.at(-1)?.url===next.versions.at(-1)?.url)return prior.finalizedAt||null;return now;}
