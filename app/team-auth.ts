import {headers} from 'next/headers';
import {authReady} from '../lib/auth';
import {db} from '../lib/database';
import type {Member,SessionMember} from './permissions';
export const emailKey=(value:string)=>value.trim().toLowerCase();
export async function getMember():Promise<Member|null>{
 const auth=await authReady(),session=await auth.api.getSession({headers:await headers()});if(!session)return null;
 return db.prepare('SELECT * FROM members WHERE user_id=? AND active=1').bind(session.user.id).first<Member>();
}
export const publicMember=(m:Member):SessionMember=>({id:m.id,name:m.name,email:m.email,role:m.role});
