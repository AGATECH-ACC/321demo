import {randomBytes,createHash} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {sqlite} from './database';
import {appOrigin,authReady} from './auth';
import type {Member} from '../app/permissions';
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export function createAccountLink(memberId:string){
 const db=sqlite(),token=randomBytes(32).toString('base64url');
 db.transaction(()=>{const member=db.prepare('SELECT * FROM members WHERE id=? AND active=1').get(memberId) as Member|undefined;if(!member)throw Error('Choose an active member.');db.prepare('DELETE FROM account_links WHERE member_id=?').run(memberId);db.prepare('INSERT INTO account_links(token_hash,member_id,expires_at) VALUES(?,?,?)').run(tokenHash(token),memberId,Date.now()+24*60*60*1000);})();
 return appOrigin()+'/activate#'+token;
}
export async function completeAccountLink(token:string,password:string){
 const auth=await authReady(),db=sqlite();
 const member=db.transaction(()=>{const link=db.prepare('SELECT member_id FROM account_links WHERE token_hash=? AND used=0 AND expires_at>?').get(tokenHash(token),Date.now()) as {member_id:string}|undefined;
  if(!link)return null;const member=db.prepare('SELECT * FROM members WHERE id=? AND active=1').get(link.member_id) as Member|undefined;if(!member)return null;
  db.prepare('UPDATE account_links SET used=1 WHERE token_hash=?').run(tokenHash(token));return member;
 })();
 if(!member)throw Error('This account link is expired or already used. Ask the owner for a new link.');
 // Tokens are one-use and authorized for one membership, including owner-issued recovery.
 const existing=db.prepare('SELECT id FROM user WHERE email=?').get(member.email) as {id:string}|undefined;
 let userId:string;
 if(existing){const hash=await hashPassword(password);db.transaction(()=>{db.prepare("UPDATE account SET password=?,updatedAt=? WHERE userId=? AND providerId='credential'").run(hash,Date.now(),existing.id);db.prepare('DELETE FROM session WHERE userId=?').run(existing.id);})();userId=existing.id;}
 else {const result=await auth.api.signUpEmail({body:{email:member.email,name:member.name,password}});userId=result.user.id;}
 db.prepare('UPDATE members SET user_id=?,updated_at=?,revision=revision+1 WHERE id=?').run(userId,new Date().toISOString(),member.id);
 return member.email;
}
