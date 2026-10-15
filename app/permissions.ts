import type {Job,JobInput} from './model';
export type Role='owner'|'jace'|'admin'|'editor';
export type Member={id:string;email:string;user_id:string|null;name:string;role:Role;active:number;revision:number;created_at:string;updated_at:string};
export type SessionMember=Pick<Member,'id'|'name'|'role'|'email'>;
export const ROLE_LABELS={owner:'Owner',jace:'Jace / reviewer',admin:'Admin',editor:'Editor'};
export const manages=(role:Role)=>role!=='editor';
export const canApprove=(role:Role,action:string)=>action==='approve-client'?role!=='editor':role==='owner'||role==='jace';
export function canRead(member:SessionMember,job:Job){return member.role!=='editor'||!!job.assigneeId&&job.assigneeId===member.id;}
export const EDITOR_FIELDS=['status','versions','checks','finalLink','coverLink','editorNotes','links'] as const;
export function jobForMember(member:SessionMember,job:Job):Job{
  if(member.role!=='editor')return job;
  return {...job,payment:'Not specified',paymentNote:''};
}
export function authorizeEdit(member:SessionMember,prior:Job|null,input:JobInput,action?:string):string|null{
  if(prior&&!canRead(member,prior))return 'This video is not available to your account.';
  if(action?.startsWith('approve-')&&!canApprove(member.role,action))return 'Your role cannot record this approval.';
  if(member.role!=='editor')return null;
  if(!prior)return 'Only admin, Jace or the owner can create videos.';
  if(action)return 'Editors can submit cuts for review, but cannot approve or request changes.';
  if(prior.archived)return 'An archived video is read-only. Ask admin to restore it.';
  if(['Final approved','Scheduled','Published'].includes(prior.status))return 'This video is approved for delivery. Ask admin to reopen it before editing.';
  const visible=jobForMember(member,prior);
  for(const key of Object.keys(input) as (keyof JobInput)[]){
    if(!(EDITOR_FIELDS as readonly string[]).includes(key)&&JSON.stringify(input[key])!==JSON.stringify(visible[key]??(key==='assigneeId'||key==='editorNotes'? '':undefined)))return `Your role cannot change ${key}.`;
  }
  if(input.status!==prior.status&&!['Editing','Internal review'].includes(input.status))return 'Editors can move their videos to Editing or Internal review.';
  if(input.versions.length<prior.versions.length||prior.versions.some((v,i)=>JSON.stringify(v)!==JSON.stringify(input.versions[i])))return 'Existing versions cannot be edited or removed. Add a new cut.';
  return null;
}
