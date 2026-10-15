import {appOrigin} from './auth';
import {db} from './database';
export function sameOrigin(request:Request){return request.headers.get('origin')===appOrigin();}
export function safeReturn(value:string|null|undefined){return value&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)?value:'/';}
export async function limit(key:string,max=15,seconds=60){
 const now=Date.now();
 // One atomic UPSERT serializes competing requests on local and hosted SQLite.
 const row=await db.prepare(`INSERT INTO request_limits(key,count,expires_at) VALUES(?,1,?)
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
 expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
 WHERE expires_at<=? OR count<? RETURNING count`).bind(key,now+seconds*1000,now,now,now,max).first<{count:number}>();
 await db.prepare('DELETE FROM request_limits WHERE expires_at<?').bind(now).run();
 return !!row;
}
