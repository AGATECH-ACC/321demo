import {appOrigin} from './auth';
import {sqlite} from './database';
export function sameOrigin(request:Request){return request.headers.get('origin')===appOrigin();}
export function safeReturn(value:string|null|undefined){return value&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)?value:'/';}
export function limit(key:string,max=15,seconds=60){
 const db=sqlite(),now=Date.now();
 return db.transaction(()=>{db.prepare('DELETE FROM request_limits WHERE expires_at < ?').run(now);const row=db.prepare('SELECT count FROM request_limits WHERE key=?').get(key) as {count:number}|undefined;if(row&&row.count>=max)return false;
 db.prepare('INSERT INTO request_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+seconds*1000);return true;})();
}
