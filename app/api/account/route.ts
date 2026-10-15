import {z} from 'zod';
import {sameOrigin,limit} from '../../../lib/http';
import {completeAccountLink} from '../../../lib/account-links';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Invalid origin.'},{status:403});
 if(!limit('account-activation',30,60))return Response.json({error:'Too many attempts. Try again shortly.'},{status:429});
 try{const body=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),password:z.string().min(12).max(128)}).safeParse(await request.json());
  if(!body.success)return Response.json({error:'Use a valid account link and a password of 12–128 characters.'},{status:400});
  const email=await completeAccountLink(body.data.token,body.data.password);return Response.json({ok:true,email});
 }catch{return Response.json({error:'The link is expired, used or could not be completed. Ask the owner for a new account link.'},{status:400});}
}
