import {db} from '../../../lib/database';
import {sameOrigin} from '../../../lib/http';
import {getMember} from '../../team-auth';
import {demoData} from '../../demo-data';
import {today} from '../../model';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 const actor=await getMember();if(!actor||actor.role!=='owner')return json({error:'Only the owner can add demo data.'},403);
 if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
 const {studios,jobs}=demoData(today());
 // Fixed IDs make repeat requests harmless and preserve edits to demo records.
 for(const s of studios){const existing=await db.prepare('SELECT id FROM studios WHERE id=?').bind(s.id).first();if(existing)continue;const conflict=await db.prepare('SELECT id FROM studios WHERE kind=? AND parent_id=? AND name_key=?').bind(s.kind,s.parentId,s.name.toLowerCase()).first();if(conflict)return json({error:'A client or production already uses a demo name. Rename that studio before loading the demo.'},409);}
 const statements=[...studios.map(s=>db.prepare('INSERT INTO studios (id,kind,parent_id,name_key,data,revision,updated_at) VALUES (?,?,?,?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(s.id,s.kind,s.parentId,s.name.toLowerCase(),JSON.stringify(s),s.updatedAt)),...jobs.map(j=>db.prepare('INSERT INTO jobs (id,data,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(j.id,JSON.stringify(j),j.updatedAt))];
 try{const result=await db.batch(statements);return json({ok:true,added:result.reduce((sum,r)=>sum+(r.meta.changes||0),0),clients:3,productions:4,videos:10});}catch{return json({error:'Demo data could not be added. Existing records were left unchanged.'},500);}
}
