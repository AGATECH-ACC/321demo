import './env';
import {mkdirSync,chmodSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {sqlite,databasePath} from '../lib/database';
const path=resolve(process.argv[2]||'backups/studio-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
if(path===databasePath())throw Error('Backup must use a different destination.');
mkdirSync(dirname(path),{recursive:true,mode:0o700});await sqlite().backup(path);chmodSync(path,0o600);console.log('Consistent SQLite backup saved: '+path);
