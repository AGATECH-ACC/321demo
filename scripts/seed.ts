import './env';
import {db} from '../lib/database';
import {demoData} from '../app/demo-data';
import {today} from '../app/model';
const {studios,jobs}=demoData(today());
const results=await db.batch([...studios.map(s=>db.prepare('INSERT INTO studios(id,kind,parent_id,name_key,data,revision,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(s.id,s.kind,s.parentId,s.name.toLowerCase(),JSON.stringify(s),s.updatedAt)),...jobs.map(j=>db.prepare('INSERT INTO jobs(id,data,revision,updated_at) VALUES(?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(j.id,JSON.stringify(j),j.updatedAt))]);
console.log(`Added ${results.reduce((n,r)=>n+r.meta.changes,0)} demo records. Existing edits preserved.`);
