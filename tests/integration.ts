import assert from 'node:assert/strict';
import {mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,spawnSync,type ChildProcess} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import {summarizeKpis} from '../app/production-kpis';
const temp=mkdtempSync(join(tmpdir(),'three21-test-')),origin='http://localhost:3031';
process.env.DATABASE_PATH=join(temp,'studio.sqlite');process.env.BETTER_AUTH_URL=origin;process.env.BETTER_AUTH_SECRET=randomBytes(48).toString('hex');Object.assign(process.env,{NODE_ENV:'production'});
const {authReady}=await import('../lib/auth');const {sqlite}=await import('../lib/database');const {createAccountLink}=await import('../lib/account-links');const {CHECKS}=await import('../app/model');
await authReady();const local=sqlite(),ownerId=crypto.randomUUID(),at=new Date().toISOString(),password=randomBytes(24).toString('base64url');
local.prepare("INSERT INTO members(id,email,name,role,created_at,updated_at) VALUES(?,?,'Test owner','owner',?,?)").run(ownerId,'owner@example.test',at,at);
let server:ChildProcess|undefined,logs='';
async function start(){server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3031'],{env:process.env,stdio:['ignore','pipe','pipe']});server.stdout?.on('data',b=>logs+=b);server.stderr?.on('data',b=>logs+=b);for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/health')).ok)return;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,200));}throw Error('Server did not start: '+logs);}
async function stop(){if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise<void>(r=>server!.once('exit',()=>r()));}}
async function request(path:string,cookie='',body?:unknown,status=200){const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const d=await r.json();assert.equal(r.status,status,`${path}: ${JSON.stringify(d)}`);return d;}
async function login(email:string,pw=password){const send=()=>fetch(origin+'/api/auth/sign-in/email',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});let r=await send();if(r.status===429){await new Promise(done=>setTimeout(done,Math.min(15,Number(r.headers.get('retry-after')||11))*1000+500));r=await send();}assert.equal(r.status,200,await r.clone().text());const cookies=r.headers.getSetCookie();assert(cookies.some(c=>/httponly/i.test(c)));return cookies.map(c=>c.split(';')[0]).join('; ');}

const activate=(url:string,pw=password)=>request('/api/account','',{token:url.split('#')[1],password:pw});
try{
 await start();
 assert.equal((await fetch(origin+'/?client=32100000-0000-4000-a000-000000000001',{redirect:'manual'})).status,307);
 await request('/api/jobs','',undefined,403);await request('/api/studios','',undefined,403);
 await request('/api/auth/sign-up/email','',{email:'intruder@example.test',password,name:'Intruder'},403);
 assert.equal((await fetch(origin+'/api/account',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'})).status,403);
 const setup=createAccountLink(ownerId);await activate(setup);await request('/api/account','',{token:setup.split('#')[1],password},400);
 let owner=await login('owner@example.test');assert.equal((await request('/api/team',owner)).members[0].role,'owner');
 assert.equal((await request('/api/demo',owner,{})).added,17);assert.equal((await request('/api/demo',owner,{})).added,0);
 const logo='data:image/png;base64,'+(await sharp({create:{width:20,height:10,channels:4,background:{r:20,g:40,b:60,alpha:0.5}}}).png().toBuffer()).toString('base64');
 let clientStudio=(await request('/api/studios',owner)).clients[0];
 clientStudio=await request('/api/studios',owner,{id:clientStudio.id,revision:clientStudio.revision,studio:{...clientStudio,logo}});assert(clientStudio.logo.startsWith('data:image/png;base64,'));
 await request('/api/studios',owner,{id:clientStudio.id,revision:clientStudio.revision,studio:{...clientStudio,logo:'data:image/png;base64,YmFk'}},400);
 const cookies:Record<string,string>={},ids:Record<string,string>={};
 for(const role of ['jace','admin','editor']){await request('/api/team',owner,{email:role+'@example.test',name:'Test '+role,role,active:true});const m=(await request('/api/team',owner)).members.find((m:{email:string})=>m.email===role+'@example.test');ids[role]=m.id;const link=await request('/api/team/account-link',owner,{id:m.id});await activate(link.url);cookies[role]=await login(m.email);}
 let job=(await request('/api/jobs',owner)).find((j:{status:string})=>j.status==='Ready to edit');
 job=await request('/api/jobs',owner,{id:job.id,revision:job.revision,job:{...job,assigneeId:ids.editor,payment:'Not applicable',paymentNote:'Private finance note'}});
 const editorJobs=await request('/api/jobs',cookies.editor);assert.equal(editorJobs.length,1);assert.equal(summarizeKpis(editorJobs).total,1);assert.equal(editorJobs[0].paymentNote,'');
 const editorStudios=await request('/api/studios',cookies.editor);assert.equal(editorStudios.clients.length,1);assert.equal(editorStudios.productions.length,1);const ownClient=editorStudios.clients[0];await request('/api/studios',cookies.editor,{id:ownClient.id,revision:ownClient.revision,studio:{...ownClient,logo}},403);
 await request('/api/jobs',cookies.editor,{id:job.id,revision:job.revision,job:{...editorJobs[0],assigneeId:ids.admin}},403);
 await request('/api/demo',cookies.editor,{},403);await request('/api/team/account-link',cookies.admin,{id:ids.editor},403);
 let mine=await request('/api/jobs',cookies.editor,{id:job.id,revision:job.revision,job:{...editorJobs[0],status:'Editing',editorNotes:'Progress saved from editor'}});
 const stale=mine;mine=await request('/api/jobs',cookies.editor,{id:mine.id,revision:mine.revision,job:{...mine,editorNotes:'A newer update'}});await request('/api/jobs',cookies.editor,{id:stale.id,revision:stale.revision,job:stale},409);
 mine=await request('/api/jobs',cookies.editor,{id:mine.id,revision:mine.revision,job:{...mine,status:'Internal review',checks:Object.fromEntries(CHECKS.map(([k])=>[k,true])),versions:[{id:crypto.randomUUID(),url:'https://example.com/test-draft',note:'Test',at:'2000-01-01T00:00:00Z'}]}});
 assert.notEqual(mine.versions[0].at,'2000-01-01T00:00:00Z');assert.equal(mine.finalizedAt,null);
 job=(await request('/api/jobs',owner)).find((j:{id:string})=>j.id===mine.id);
 await request('/api/jobs',cookies.admin,{id:job.id,revision:job.revision,job,action:'approve-internal'},403);
 job=await request('/api/jobs',cookies.jace,{id:job.id,revision:job.revision,job:{...job,status:'Client review'},action:'approve-internal'});
 job=await request('/api/jobs',cookies.admin,{id:job.id,revision:job.revision,job:{...job,status:'Final approved',finalLink:'https://example.com/final',coverLink:'https://example.com/cover'},action:'approve-client'});
 assert(job.clientApproval&&job.internalApproval);assert(job.finalizedAt);assert.equal(summarizeKpis([job]).done,1);const completion=job.finalizedAt;job=await request('/api/jobs',owner,{id:job.id,revision:job.revision,job:{...job,finalizedAt:'2000-01-01T00:00:00Z'}});assert.equal(job.finalizedAt,completion);await request('/api/jobs',cookies.editor,{id:job.id,revision:job.revision,job:{...job,editorNotes:'Not permitted'}},403);
 const newPassword=randomBytes(24).toString('base64url'),recover=await request('/api/team/account-link',owner,{id:ids.editor});await activate(recover.url,newPassword);await request('/api/jobs',cookies.editor,undefined,403);cookies.editor=await login('editor@example.test',newPassword);
 let editor=(await request('/api/team',owner)).members.find((m:{id:string})=>m.id===ids.editor);await request('/api/team',owner,{...editor,active:false});await request('/api/jobs',cookies.editor,undefined,403);
 // Missing and foreign origins cannot mutate authenticated work.
 for(const headers of [new Headers({Cookie:owner}),new Headers({Cookie:owner,Origin:'https://other.example'})])assert.equal((await fetch(origin+'/api/demo',{method:'POST',headers})).status,403);
 const backup=join(temp,'backup.sqlite');let result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/backup.ts',backup],{env:process.env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert(existsSync(backup));
 const restored=join(temp,'restored.sqlite');result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/restore.ts',backup],{env:{...process.env,DATABASE_PATH:restored},encoding:'utf8'});assert.equal(result.status,0,result.stderr);const restoredDb=new Database(restored);assert.equal((restoredDb.prepare('SELECT count(*) n FROM jobs').get() as {n:number}).n,10);restoredDb.close();
 await stop();await start();assert.equal((await request('/api/studios',owner)).clients.find((c:{id:string})=>c.id===clientStudio.id).logo,clientStudio.logo);clientStudio=await request('/api/studios',owner,{id:clientStudio.id,revision:clientStudio.revision,studio:{...clientStudio,logo:''}});assert.equal(clientStudio.logo,'');assert.equal((await request('/api/jobs',owner)).length,10);assert.equal((await request('/api/jobs',owner)).find((j:{id:string})=>j.id===job.id).status,'Final approved');
 await request('/api/auth/sign-out',owner,{});await request('/api/jobs',owner,undefined,403);
 console.log('PASS: real Next.js production server; login and one-use setup/recovery; owner/Jace/admin/editor isolation; assignments and finance redaction; edits, stale writes, approvals, revocation; origin protection; seed idempotency; backups/restore; persistence across restart; sign-out.');
}finally{await stop();local.close();}
