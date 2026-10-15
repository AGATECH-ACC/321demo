import {redirect} from 'next/navigation';
import Studio from './studio';
import {getMember,publicMember} from './team-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{client?:string;production?:string}>}){
 const requested=await searchParams,query=new URLSearchParams();for(const key of ['client','production'] as const){const value=requested[key];if(typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value))query.set(key,value);}
 const member=await getMember();if(!member)redirect('/sign-in?returnTo='+encodeURIComponent('/'+(query.size?'?'+query.toString():'')));
 return <Studio user={member.name} member={publicMember(member)}/>;
}
