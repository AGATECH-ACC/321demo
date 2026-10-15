import {randomBytes,createHash} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {db} from './database';
import {appOrigin,authReady} from './auth';
import type {Member} from '../app/permissions';
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function createAccountLink(memberId:string){
 const token=randomBytes(32).toString('base64url');
 const results=await db.batch([
  db.prepare('DELETE FROM account_links WHERE member_id=?').bind(memberId),
  db.prepare('INSERT INTO account_links(token_hash,member_id,expires_at) SELECT ?,id,? FROM members WHERE id=? AND active=1').bind(tokenHash(token),Date.now()+24*60*60*1000,memberId),
 ]);
 if(results[1].meta.changes!==1)throw Error('Choose an active member.');
 return appOrigin()+'/activate#'+token;
}
export async function completeAccountLink(token:string,password:string){
 const auth=await authReady();
 // Claim the one-use token atomically, including across serverless instances.
 const link=await db.prepare('UPDATE account_links SET used=1 WHERE token_hash=? AND used=0 AND expires_at>? AND EXISTS (SELECT 1 FROM members WHERE id=account_links.member_id AND active=1) RETURNING member_id').bind(tokenHash(token),Date.now()).first<{member_id:string}>();
 const member=link?await db.prepare('SELECT * FROM members WHERE id=? AND active=1').bind(link.member_id).first<Member>():null;
 if(!member)throw Error('This account link is expired or already used. Ask the owner for a new link.');
 const existing=await db.prepare('SELECT id FROM user WHERE email=?').bind(member.email).first<{id:string}>();
 let userId:string;
 if(existing){const hash=await hashPassword(password);await db.batch([
  db.prepare("UPDATE account SET password=?,updatedAt=? WHERE userId=? AND providerId='credential'").bind(hash,Date.now(),existing.id),
  db.prepare('DELETE FROM session WHERE userId=?').bind(existing.id),
 ]);userId=existing.id;}
 else {const result=await auth.api.signUpEmail({body:{email:member.email,name:member.name,password}});userId=result.user.id;}
 await db.prepare('UPDATE members SET user_id=?,updated_at=?,revision=revision+1 WHERE id=?').bind(userId,new Date().toISOString(),member.id).run();
 return member.email;
}
