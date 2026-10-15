import Database from 'better-sqlite3';
import {createClient,type Client} from '@libsql/client';
import {schema} from './database-schema';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const connections=globalThis as typeof globalThis & {studioSqlite?:Database.Database;studioRemote?:Client};
export const databasePath=()=>resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH||'data/studio.sqlite');
export const usesRemoteDatabase=()=>Boolean(process.env.TURSO_DATABASE_URL);
export function sqlite(){
 if(usesRemoteDatabase()||process.env.VERCEL)throw Error("Local SQLite is unavailable in cloud mode. Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN; never use /tmp for production data.");
 if(connections.studioSqlite)return connections.studioSqlite;
 const path=databasePath();mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new Database(path);chmodSync(path,0o600);db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');
 db.exec(schema);
 connections.studioSqlite=db;return db;
}
export function remoteClient(){
 if(connections.studioRemote)return connections.studioRemote;
 const url=process.env.TURSO_DATABASE_URL;
 if(!url)throw Error('Connect a Turso database and set TURSO_DATABASE_URL.');
 if(process.env.VERCEL&&(!/^(libsql|https):\/\//.test(url)||!process.env.TURSO_AUTH_TOKEN))throw Error('Vercel requires a remote Turso URL and TURSO_AUTH_TOKEN.');
 return connections.studioRemote=createClient({url,authToken:process.env.TURSO_AUTH_TOKEN});
}
let ready:Promise<void>|undefined;
export function databaseReady(){
 if(!usesRemoteDatabase()){sqlite();return Promise.resolve();}
 return ready??=(async()=>{await remoteClient().batch(schema.split(';').map(s=>s.trim()).filter(Boolean),'write');})().catch(error=>{ready=undefined;throw error;});
}
type Value=string|number|null;
class Statement {
 constructor(readonly sql:string,readonly values:Value[]=[]){ }
 bind(...values:Value[]){return new Statement(this.sql,values);}
 async first<T=Record<string,unknown>>(){
  await databaseReady();
  if(usesRemoteDatabase())return ((await remoteClient().execute({sql:this.sql,args:this.values})).rows[0] as unknown as T|undefined)||null;
  return (sqlite().prepare(this.sql).get(...this.values) as T|undefined)||null;
 }
 async all<T=Record<string,unknown>>(){
  await databaseReady();
  if(usesRemoteDatabase())return {results:(await remoteClient().execute({sql:this.sql,args:this.values})).rows as unknown as T[]};
  return {results:sqlite().prepare(this.sql).all(...this.values) as T[]};
 }
 runSync(){const r=sqlite().prepare(this.sql).run(...this.values);return {meta:{changes:r.changes}};}
 async run(){await databaseReady();if(usesRemoteDatabase()){const r=await remoteClient().execute({sql:this.sql,args:this.values});return {meta:{changes:r.rowsAffected}};}return this.runSync();}
}
export const db={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){
 await databaseReady();
 if(usesRemoteDatabase())return (await remoteClient().batch(statements.map(s=>({sql:s.sql,args:s.values})),'write')).map(r=>({meta:{changes:r.rowsAffected}}));
 return sqlite().transaction(()=>statements.map(s=>s.runSync()))();
}};
