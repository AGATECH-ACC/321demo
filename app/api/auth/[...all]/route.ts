import {authReady} from '../../../../lib/auth';
import {sameOrigin,limit} from '../../../../lib/http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
 if(new URL(request.url).pathname!=='/api/auth/get-session')return Response.json({error:'Not found.'},{status:404});
 return (await authReady()).handler(request);
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Invalid origin.'},{status:403});
 const path=new URL(request.url).pathname;
 if(!['/api/auth/sign-in/email','/api/auth/sign-out','/api/auth/change-password'].includes(path))return Response.json({error:'Use an account link from the workspace owner.'},{status:403});
 if(path==='/api/auth/sign-in/email'){
  let body:{email?:unknown};try{body=await request.clone().json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>250||!await limit('login:'+email,10,300))return Response.json({error:'Too many attempts. Try again in five minutes.'},{status:429});
 }
 return (await authReady()).handler(request);
}
