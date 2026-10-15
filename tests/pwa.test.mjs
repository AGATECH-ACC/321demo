import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function worker(fetcher){
 const listeners={},stored=[],removed=[];
 const offline=new Response('Reconnect to Three.21 Studio');
 const context={URL,Response,fetch:fetcher,caches:{open:async()=>({addAll:async paths=>stored.push(...paths)}),keys:async()=>['unrelated-app','three21-public-v0','three21-public-v1'],delete:async key=>removed.push(key),match:async path=>path==='/offline.html'?offline:undefined},self:{location:{origin:'https://studio.example'},addEventListener:(name,handler)=>listeners[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{}}}};
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),context);
 function request(path,mode='navigate',method='GET'){let response;listeners.fetch({request:{url:new URL(path,context.self.location.origin).href,mode,method},respondWith:value=>response=value});return response;}
 return {listeners,stored,removed,request};
}
test('worker caches only public fallback and icons; cleans only its own previous cache',async()=>{
 const w=worker(()=>{});let work;w.listeners.install({waitUntil:p=>work=p});await work;
 assert(w.stored.includes('/offline.html'));assert(w.stored.every(p=>p==='/offline.html'||p.startsWith('/icons/')||p==='/apple-touch-icon.png'));
 w.listeners.activate({waitUntil:p=>work=p});await work;assert.deepEqual(w.removed,['three21-public-v0']);
});
test('offline navigation gets a generic screen, never a cached signed-in page',async()=>{
 const w=worker(async()=>{throw Error('offline');});
 assert.equal(await (await w.request('/?client=private')).text(),'Reconnect to Three.21 Studio');
 assert.equal(w.request('/api/jobs'),undefined);assert.equal(w.request('/api/auth/get-session'),undefined);assert.equal(w.request('/api/jobs','cors','POST'),undefined);
 assert.equal(w.request('/_next/static/app.js','cors'),undefined);assert.equal(w.request('https://other.example/page'),undefined);
});
test('online navigation always uses the server response',async()=>{
 const w=worker(async()=>new Response('Current authorized page'));
 assert.equal(await (await w.request('/')).text(),'Current authorized page');assert.deepEqual(w.stored,[]);
});
