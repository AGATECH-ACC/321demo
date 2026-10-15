import {db} from '../../../lib/database';
import {sameOrigin} from '../../../lib/http';
import {getMember,emailKey} from '../../team-auth';
import type {Member} from '../../permissions';
import {z} from 'zod';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
  const actor=await getMember();if(!actor)return json({error:'Your account does not have team access.'},403);
  const all=await db.prepare(actor.role==='editor'?'SELECT * FROM members WHERE id=?':'SELECT * FROM members ORDER BY created_at').bind(...(actor.role==='editor'?[actor.id]:[])).all<Member>();
  const events=actor.role==='owner'?await db.prepare('SELECT * FROM team_events ORDER BY at DESC LIMIT 30').all():{results:[]};
  return json({members:all.results.map(({user_id,...m})=>({...m,joined:!!user_id})),events:events.results});
}
export async function POST(request:Request){
  const actor=await getMember();if(!actor||actor.role!=='owner')return json({error:'Only the workspace owner can manage team access.'},403);
  if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
  const parsed=z.object({id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),email:z.string().trim().email().max(250),name:z.string().trim().min(1).max(100),role:z.enum(['jace','admin','editor']),active:z.boolean()}).safeParse(await request.json());
  if(!parsed.success)return json({error:'Enter a valid name, email and team role.'},400);
  const input=parsed.data,email=emailKey(input.email),now=new Date().toISOString();

  if(input.id){
    const prior=await db.prepare('SELECT * FROM members WHERE id=?').bind(input.id).first<Member>();
    if(!prior)return json({error:'Member not found.'},404);
    if(prior.role==='owner'||prior.id===actor.id)return json({error:'Owner access cannot be changed here.'},403);
    if(prior.email!==email)return json({error:'Sign-in emails cannot be replaced. Revoke this membership and add the new email.'},400);
    const r=await db.prepare('UPDATE members SET name=?,role=?,active=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(input.name,input.role,input.active?1:0,now,input.id,input.revision||0).run();
    if(!r.meta.changes)return json({error:'This membership changed. Refresh before saving.'},409);
    if(!input.active){await db.prepare('DELETE FROM account_links WHERE member_id=?').bind(input.id).run();if(prior.user_id)await db.prepare('DELETE FROM session WHERE userId=?').bind(prior.user_id).run();}
  }else{
    const found=await db.prepare('SELECT id FROM members WHERE email=?').bind(email).first();if(found)return json({error:'This email already has a membership. Update the existing entry.'},409);
    await db.prepare('INSERT INTO members (id,email,name,role,active,revision,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)').bind(crypto.randomUUID(),email,input.name,input.role,input.active?1:0,now,now).run();
  }
  await db.prepare('INSERT INTO team_events (id,at,actor,detail) VALUES (?,?,?,?)').bind(crypto.randomUUID(),now,actor.name,`${input.id?'Updated':'Added'} ${email}: ${input.role}, ${input.active?'enabled':'revoked'}`).run();
  return json({ok:true});
}
