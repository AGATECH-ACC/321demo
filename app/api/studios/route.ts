import {normalizeClientLogo} from '../../../lib/client-logo';
import {db} from '../../../lib/database';
import {sameOrigin} from '../../../lib/http';
import {z} from 'zod';
import {getMember} from '../../team-auth';
import {studioSchema,decodeStudio,type StudioRow} from '../../studios-model';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
  const actor=await getMember();if(!actor)return json({error:'Your account does not have team access.'},403);
  const sql=actor.role==='editor'?`SELECT * FROM studios s WHERE EXISTS (SELECT 1 FROM jobs j WHERE json_extract(j.data,'$.assigneeId')=? AND ((s.kind='client' AND s.id=json_extract(j.data,'$.clientId')) OR (s.kind='production' AND s.id=json_extract(j.data,'$.productionId')))) ORDER BY s.updated_at DESC`:'SELECT * FROM studios ORDER BY updated_at DESC';
  const stmt=db.prepare(sql),result=await (actor.role==='editor'?stmt.bind(actor.id):stmt).all<StudioRow>();
  const rows=result.results.map(decodeStudio).map(s=>actor.role==='editor'?{...s,activity:[]}:s);
  return json({clients:rows.filter(s=>s.kind==='client'),productions:rows.filter(s=>s.kind==='production')});
}
export async function POST(request:Request){
  const actor=await getMember();if(!actor||actor.role==='editor')return json({error:'Only admin, Jace or the owner can manage shared studios.'},403);
  if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
  try{
    if(Number(request.headers.get('content-length'))>3_000_000)return json({error:'The studio request is too large. Use a logo up to 2 MB.'},413);
    const parsed=z.object({id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),studio:studioSchema}).safeParse(await request.json());
    if(!parsed.success)return json({error:parsed.error.issues.map(i=>i.message).join(' ')},400);
    const {id,revision,studio:input}=parsed.data,now=new Date().toISOString();
    const row=id?await db.prepare('SELECT * FROM studios WHERE id=?').bind(id).first<StudioRow>():null;
    if(id&&!row)return json({error:'Studio not found.'},404);
    const prior=row?decodeStudio(row):null;
    if(prior&&prior.revision!==revision)return json({error:'This studio changed. Refresh before saving.'},409);
    if(prior&&(prior.kind!==input.kind||prior.parentId!==input.parentId))return json({error:'A studio’s type and parent client cannot be changed. Move individual videos instead.'},400);
    if(input.kind==='production'){
      const parent=await db.prepare("SELECT * FROM studios WHERE id=? AND kind='client'").bind(input.parentId).first<StudioRow>();
      if(!parent)return json({error:'Choose an existing client studio.'},400);
      if(decodeStudio(parent).archived&&!input.archived)return json({error:'Restore the client studio first.'},400);
    }
    const key=input.name.toLowerCase(),duplicate=await db.prepare('SELECT id FROM studios WHERE kind=? AND parent_id=? AND name_key=? AND id<>?').bind(input.kind,input.parentId,key,id||'').first();
    if(duplicate)return json({error:'A studio with this name already exists here. Open or restore that studio.'},409);
    if(input.logo!==prior?.logo){try{input.logo=await normalizeClientLogo(input.logo);}catch(e){return json({error:e instanceof Error?e.message:'Invalid logo.'},400);}}
    const nextId=id||crypto.randomUUID();
    const change=!prior?'Studio created':prior.archived!==input.archived?(input.archived?'Studio archived':'Studio restored'):'Studio details and resources updated';
    const data={...input,activity:[{at:now,by:actor.name,text:change},...(prior?.activity||[])].slice(0,100)};
    // Archive guards are checked in the write itself, so concurrent creation
    // cannot silently strand an active video or production under an archive.
    const archiveGuard=input.archived?` AND NOT EXISTS (SELECT 1 FROM jobs WHERE json_extract(data,'$.${input.kind==='client'?'clientId':'productionId'}')=? AND COALESCE(json_extract(data,'$.archived'),0)=0)${input.kind==='client'?" AND NOT EXISTS (SELECT 1 FROM studios WHERE parent_id=? AND COALESCE(json_extract(data,'$.archived'),0)=0)":''}`:'';
    const parentGuard=input.kind==='production'&&!input.archived?" AND EXISTS (SELECT 1 FROM studios WHERE id=? AND kind='client' AND COALESCE(json_extract(data,'$.archived'),0)=0)":'';
    const guardValues=[...(input.archived?[nextId,...(input.kind==='client'?[nextId]:[])]:[]),...(input.kind==='production'&&!input.archived?[input.parentId]:[])];
    const result=prior?await db.prepare(`UPDATE studios SET name_key=?,data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?${archiveGuard}${parentGuard}`).bind(key,JSON.stringify(data),now,nextId,prior.revision,...guardValues).run():await db.prepare(`INSERT INTO studios (id,kind,parent_id,name_key,data,revision,updated_at) SELECT ?,?,?,?,?,1,? WHERE 1=1${archiveGuard}${parentGuard}`).bind(nextId,input.kind,input.parentId,key,JSON.stringify(data),now,...guardValues).run();
    if(!result.meta.changes)return json({error:'Studio changed or has active work. Refresh; archive videos before productions, and productions before clients. Restore the client before its productions.'},409);
    return json({...data,id:nextId,revision:(prior?.revision||0)+1,updatedAt:now});
  }catch(e){if(e instanceof SyntaxError)return json({error:'Invalid request.'},400);if(e instanceof Error&&e.message.includes('UNIQUE'))return json({error:'A studio with this name already exists.'},409);console.error('Studio save failed');return json({error:'Could not save the studio. Please retry.'},500);}
}
