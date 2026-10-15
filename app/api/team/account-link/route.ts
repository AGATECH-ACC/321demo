import {z} from 'zod';
import {getMember} from '../../../team-auth';
import {sameOrigin} from '../../../../lib/http';
import {createAccountLink} from '../../../../lib/account-links';
import {db} from '../../../../lib/database';
export async function POST(request:Request){
 const actor=await getMember();if(actor?.role!=='owner')return Response.json({error:'Only the owner can issue account links.'},{status:403});
 if(!sameOrigin(request))return Response.json({error:'Invalid origin.'},{status:403});
 try{const {id}=z.object({id:z.string().uuid()}).parse(await request.json());const url=await createAccountLink(id);
  await db.prepare('INSERT INTO team_events(id,at,actor,detail) VALUES(?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),actor.name,'Issued account setup/recovery link for member '+id).run();
  return Response.json({url},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Choose an active member.'},{status:400});}
}
