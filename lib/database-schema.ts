export const schema=`CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS studios(id TEXT PRIMARY KEY,kind TEXT NOT NULL,parent_id TEXT NOT NULL DEFAULT '',name_key TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS studios_unique_name ON studios(kind,parent_id,name_key);
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,user_id TEXT UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','jace','admin','editor')),active INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS team_events(id TEXT PRIMARY KEY,at TEXT NOT NULL,actor TEXT NOT NULL,detail TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS account_links(token_hash TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES members(id),expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS request_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS jobs_assignee ON jobs(json_extract(data,'$.assigneeId'));
 CREATE INDEX IF NOT EXISTS studios_parent ON studios(parent_id);`;
