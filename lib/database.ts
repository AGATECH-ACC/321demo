import Database from 'better-sqlite3';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const connections=globalThis as typeof globalThis & {studioSqlite?:Database.Database};
export const databasePath=()=>resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH||'data/studio.sqlite');
export function sqlite(){
 if(connections.studioSqlite)return connections.studioSqlite;
 const path=databasePath();mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new Database(path);chmodSync(path,0o600);db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');
 db.exec(`CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS studios(id TEXT PRIMARY KEY,kind TEXT NOT NULL,parent_id TEXT NOT NULL DEFAULT '',name_key TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS studios_unique_name ON studios(kind,parent_id,name_key);
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,user_id TEXT UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','jace','admin','editor')),active INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS team_events(id TEXT PRIMARY KEY,at TEXT NOT NULL,actor TEXT NOT NULL,detail TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS account_links(token_hash TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES members(id),expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS request_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS jobs_assignee ON jobs(json_extract(data,'$.assigneeId'));
 CREATE INDEX IF NOT EXISTS studios_parent ON studios(parent_id);`);
 connections.studioSqlite=db;return db;
}
type Value=string|number|null;
class Statement {
 constructor(readonly sql:string,readonly values:Value[]=[]){ }
 bind(...values:Value[]){return new Statement(this.sql,values);}
 async first<T=Record<string,unknown>>(){return (sqlite().prepare(this.sql).get(...this.values) as T|undefined)||null;}
 async all<T=Record<string,unknown>>(){return {results:sqlite().prepare(this.sql).all(...this.values) as T[]};}
 runSync(){const r=sqlite().prepare(this.sql).run(...this.values);return {meta:{changes:r.changes}};}
 async run(){return this.runSync();}
}
// Small SQL interface preserves the existing parameterized queries and atomic seed batch.
export const db={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){return sqlite().transaction(()=>statements.map(s=>s.runSync()))();}};
