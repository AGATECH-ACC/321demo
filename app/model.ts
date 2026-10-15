import { z } from 'zod';
import {resourceList} from './resources.ts';
export const STATUSES = ['Footage pending', 'Ready to edit', 'Editing', 'Internal review', 'Client review', 'Changes requested', 'Final approved', 'Scheduled', 'Published'] as const;
export const CHECKS = [['brief', 'Brief, logo and fonts confirmed'],['research', 'Client profile and references reviewed'],['logo', 'Logo placement, size and ending checked'],['subtitles', 'Typography and subtitles checked'],['audio', 'Voice, music and left/right audio checked'],['effects', 'Effects and final export checked'],['rights', 'Rights to music and materials confirmed']] as const;
const url = z.string().max(2000).refine(s => !s || /^https?:\/\//i.test(s), 'Use an https:// or http:// link.').refine(s => {if(!s)return true;try{new URL(s);return true}catch{return false}},'Enter a valid URL.');
const date = z.string().refine(s => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s, 'Enter a valid date.');
export const jobSchema = z.object({
  clientId:z.union([z.string().uuid(),z.literal('')]).default(''),productionId:z.union([z.string().uuid(),z.literal('')]).default(''),links:resourceList.default([]),
  assigneeId: z.union([z.string().uuid(),z.literal('')]).default(''), editorNotes: z.string().max(10000).default(''),
  title: z.string().trim().min(1,'A video title is required.').max(160), client: z.string().trim().min(1,'A client is required.').max(100), editor: z.string().trim().max(100).default(''), batch: z.string().max(100).default(''),
  status: z.enum(STATUSES).default('Footage pending'), priority: z.enum(['Normal','High']).default('Normal'),
  shootDate: date.default(''), assignedOn: date.default(''), deadline: date.default(''), scheduledOn: date.default(''), deadlineBasis: z.enum(['assignment','shoot']).default('assignment'),
  sourceLink: url.default(''), briefLink: url.default(''), finalLink: url.default(''), coverLink: url.default(''), postLink: url.default(''),
  notes: z.string().max(10000).default(''), caption: z.string().max(6000).default(''),
  checks: z.record(z.boolean()).default({}), uploadConfirmed: z.boolean().default(false), backupVerified: z.boolean().default(false), captionApproved: z.boolean().default(false), handedOver: z.boolean().default(false), postingChecked: z.boolean().default(false),
  payment: z.enum(['Not specified','Pending','Paid','Not applicable']).default('Not specified'), paymentNote: z.string().max(500).default(''), archived: z.boolean().default(false),
  versions: z.array(z.object({id:z.string().max(100),url: url.refine(s=>!!s,'A version link is required.'),note:z.string().max(2000),at:z.string().max(40)})).max(100).default([]),
});
export type JobInput = z.infer<typeof jobSchema>;
export type Approval = {by:string;at:string;versionId:string};
export type Activity = {at:string;by:string;text:string};
export type Job = JobInput & {finalizedAt?:string|null;id:string;revision:number;createdAt:string;updatedAt:string;internalApproval:Approval|null;clientApproval:Approval|null;activity:Activity[]};
export function today() {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function addDays(date:string,days:number) {if(!date)return '';const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function milestones(job:JobInput){const basis=job.deadlineBasis==='shoot'?job.shootDate:job.assignedOn;return {upload:addDays(job.shootDate,1),firstDraft:addDays(job.assignedOn,3),client:addDays(basis,5),final:job.deadline||addDays(basis,7)};}
export function activeDue(job:JobInput){const d=milestones(job);if(job.status==='Published')return '';if(['Final approved','Scheduled'].includes(job.status))return job.scheduledOn;if(job.status==='Footage pending')return d.upload;if(['Ready to edit','Editing'].includes(job.status))return d.firstDraft;if(['Internal review','Client review'].includes(job.status))return d.client;return d.final;}
export function health(job:JobInput,now=today()){const d=activeDue(job);if(job.status==='Published')return 'Complete';if(!d)return 'No date';if(d<now)return 'Overdue';if(d<=addDays(now,1))return 'Due soon';return 'On track';}
export function gates(job:JobInput,internal:Approval|null,client:Approval|null):string[]{
  const errors:string[]=[];const latest=job.versions.at(-1);
  if(['Ready to edit','Editing','Internal review','Client review','Changes requested','Final approved','Scheduled','Published'].includes(job.status)) {if(!job.editor)errors.push('Assign an editor.');if(!job.assignedOn)errors.push('Set an assignment date.');if(!job.sourceLink||!job.uploadConfirmed)errors.push('Add the footage link and confirm upload.');}
  if(['Internal review','Client review','Final approved','Scheduled','Published'].includes(job.status)&&!latest)errors.push('Add a draft version for review.');
  if(['Client review','Final approved','Scheduled','Published'].includes(job.status)&&(!internal||internal.versionId!==latest?.id))errors.push('Record internal approval of the latest version.');
  if(['Final approved','Scheduled','Published'].includes(job.status)) {if(!client||client.versionId!==latest?.id)errors.push('Record client approval of the latest version.');if(!job.finalLink)errors.push('Add the final video link.');if(!job.coverLink)errors.push('Add a cover link — FA requires a cover.');if(CHECKS.some(([k])=>!job.checks[k]))errors.push('Complete the editing quality checklist.');}
  if(['Scheduled','Published'].includes(job.status)) {if(!job.handedOver)errors.push('Confirm transfer to the result folder.');if(!job.caption.trim()||!job.captionApproved)errors.push('Add and approve the caption.');if(!job.scheduledOn)errors.push('Set the posting date.');}
  if(job.status==='Published'&&(!job.postLink||!job.postingChecked))errors.push('Add the published link and confirm the posting checks.');return errors;
}
export function blankJob():JobInput{return jobSchema.parse({title:'Untitled',client:'New client',assignedOn:today()});}
