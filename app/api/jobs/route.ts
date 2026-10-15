import {completionTimestamp} from '../../production-kpis';
import {db} from '../../../lib/database';
import {sameOrigin} from '../../../lib/http';
import {getMember} from '../../team-auth';
import {jobSchema,gates,CHECKS,type Job,type Approval} from '../../model';
import {canRead,authorizeEdit,jobForMember,type Member} from '../../permissions';
import {z} from 'zod';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
type JobRow={data:string;revision:number;client_name?:string;production_name?:string};
const jobSelect="SELECT j.data,j.revision,json_extract(c.data,'$.name') client_name,json_extract(p.data,'$.name') production_name FROM jobs j LEFT JOIN studios c ON c.id=json_extract(j.data,'$.clientId') LEFT JOIN studios p ON p.id=json_extract(j.data,'$.productionId')";
function decode(row:JobRow):Job {const raw=JSON.parse(row.data);return {...raw,...jobSchema.parse(raw),client:row.client_name||raw.client,batch:row.production_name||raw.batch,revision:row.revision};}
export async function GET(){
  const member=await getMember();if(!member)return json({error:'Your account does not have team access.'},403);
  try{
    const sql=jobSelect+(member.role==='editor'?" WHERE json_extract(j.data,'$.assigneeId')=?":"")+' ORDER BY j.updated_at DESC';
    const statement=db.prepare(sql);const result=await (member.role==='editor'?statement.bind(member.id):statement).all<{data:string;revision:number}>();
    return json(result.results.map(row=>jobForMember(member,decode(row))));
  }catch{return json({error:'The workspace could not be loaded. Please try again.'},503);}
}
export async function POST(request:Request){
  const member=await getMember();if(!member)return json({error:'Your account does not have team access.'},403);
  if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
  try{
    const envelope=z.object({id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),job:z.unknown(),action:z.enum(['approve-internal','approve-client','approve-caption','request-changes']).optional(),feedbackText:z.string().max(2000).optional()}).safeParse(await request.json());
    if(!envelope.success)return json({error:'Invalid save request.'},400);
    const body=envelope.data;const parsed=jobSchema.safeParse(body.job);if(!parsed.success)return json({error:parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join(' ')},400);
    const input=parsed.data,now=new Date().toISOString();let prior:Job|null=null;
    if(body.id){
      const row=await db.prepare(jobSelect+' WHERE j.id=?').bind(body.id).first<JobRow>();
      if(!row)return json({error:'Video not found.'},404);prior=decode(row);
      if(!canRead(member,prior))return json({error:'Video not found.'},404);
      if(row.revision!==body.revision)return json({error:'This video changed in another session. Close and reopen it to load the latest version.'},409);
    }
    // Labels are derived from immutable studio IDs for an editor. A concurrent
    // studio rename must not turn an otherwise valid progress update into a denial.
    if(member.role==='editor'&&prior){input.client=prior.client;input.batch=prior.batch;}
    const denied=authorizeEdit(member,prior,input,body.action);if(denied)return json({error:denied},403);
    // New cut timestamps are receipt times, never browser-supplied backdates.
    input.versions=input.versions.map(v=>({...v,at:prior?.versions.find(old=>old.id===v.id)?.at||now}));
    const context=await db.prepare("SELECT json_extract(c.data,'$.name') client_name,json_extract(p.data,'$.name') production_name,json_extract(c.data,'$.archived') client_archived,json_extract(p.data,'$.archived') production_archived FROM studios p JOIN studios c ON c.id=p.parent_id WHERE p.id=? AND p.kind='production' AND c.id=? AND c.kind='client'").bind(input.productionId,input.clientId).first<{client_name:string;production_name:string;client_archived:number;production_archived:number}>();
    if(!context)return json({error:'Choose a client and a production studio belonging to that client.'},400);
    if(!input.archived&&(context.client_archived||context.production_archived))return json({error:'Restore the client and production studios before adding or restoring active videos.'},400);
    input.client=context.client_name;input.batch=context.production_name;
    if(member.role==='editor'&&prior){input.payment=prior.payment;input.paymentNote=prior.paymentNote;}
    if(input.assigneeId){
      const editor=await db.prepare('SELECT * FROM members WHERE id=? AND active=1').bind(input.assigneeId).first<Member>();
      if(!editor&&input.assigneeId!==prior?.assigneeId)return json({error:'Choose an active team member for this assignment.'},400);
      if(editor)input.editor=editor.name;
    }
    let internal:Approval|null=prior?.internalApproval||null,client:Approval|null=prior?.clientApproval||null;
    const latest=input.versions.at(-1),oldLatest=prior?.versions.at(-1),versionChanged=latest?.id!==oldLatest?.id||latest?.url!==oldLatest?.url;
    if(versionChanged){internal=null;client=null;}
    // Approval flags are derived from trusted saved state or a permitted action.
    input.captionApproved=!!prior?.captionApproved&&input.caption===prior.caption;
    let action='';
    if(body.action==='approve-internal'){
      if(!latest||CHECKS.some(([k])=>!input.checks[k]))return json({error:'Add a draft and complete all quality checks before internal approval.'},400);
      internal={by:member.name,at:now,versionId:latest.id};action='Internal approval recorded';
    }else if(body.action==='approve-client'){
      if(!latest||internal?.versionId!==latest.id)return json({error:'Internal approval of the latest version is required first.'},400);
      client={by:member.name,at:now,versionId:latest.id};action='Client approval recorded by coordinator';
    }else if(body.action==='approve-caption'){
      if(!input.caption.trim())return json({error:'Write the caption before approving it.'},400);input.captionApproved=true;action='Caption approval recorded';
    }else if(body.action==='request-changes'){
      if(!body.feedbackText?.trim())return json({error:'Describe the requested changes, including timecodes where useful.'},400);
      input.status='Changes requested';internal=null;client=null;action='Changes requested: '+body.feedbackText.trim();
    }
    const errors=gates(input,internal,client);if(errors.length)return json({error:errors.join(' ')},400);
    const id=prior?.id||crypto.randomUUID(),revision=(prior?.revision||0)+1;
    const event=action||(!prior?'Video created':input.assigneeId!==prior.assigneeId?`Assigned to ${input.editor||'unassigned'}`:input.archived!==prior.archived?(input.archived?'Video archived':'Video restored'):versionChanged?'New version added; review approvals reset':input.status!==prior.status?`Moved to ${input.status}`:'Video details updated');
    const job:Job={...input,id,revision,internalApproval:internal,clientApproval:client,createdAt:prior?.createdAt||now,updatedAt:now,activity:[{at:now,by:member.name,text:event},...(prior?.activity||[])].slice(0,200)};
    job.finalizedAt=completionTimestamp(prior,job,now);
    const guard=input.archived?'':" AND EXISTS (SELECT 1 FROM studios p JOIN studios c ON c.id=p.parent_id WHERE p.id=? AND c.id=? AND COALESCE(json_extract(p.data,'$.archived'),0)=0 AND COALESCE(json_extract(c.data,'$.archived'),0)=0)";
    const guardValues=input.archived?[]:[input.productionId,input.clientId];
    if(prior){const r=await db.prepare('UPDATE jobs SET data=?,revision=?,updated_at=? WHERE id=? AND revision=?'+guard).bind(JSON.stringify(job),revision,now,id,prior.revision,...guardValues).run();if(!r.meta.changes)return json({error:'Another update or studio archive was saved first. Reopen this video and try again.'},409);}
    else {const r=await db.prepare('INSERT INTO jobs (id,data,revision,updated_at) SELECT ?,?,?,? WHERE 1=1'+guard).bind(id,JSON.stringify(job),revision,now,...guardValues).run();if(!r.meta.changes)return json({error:'The studio was archived. Refresh before adding a video.'},409);}
    return json(jobForMember(member,job));
  }catch(e){console.error('Job operation failed',e instanceof Error?e.message:'Unknown error');return json({error:'Could not save this video. Check your connection and try again.'},500);}
}
