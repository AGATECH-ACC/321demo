import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import './env';
if(!process.env.BETTER_AUTH_SECRET){if(existsSync('.env'))throw Error('Set BETTER_AUTH_SECRET in .env to a random secret of at least 32 characters.');writeFileSync('.env',`BETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}\nBETTER_AUTH_URL=http://localhost:3000\nDATABASE_PATH=./data/studio.sqlite\n`,{mode:0o600});process.loadEnvFile('.env');}
const {authReady}=await import('../lib/auth');const {sqlite}=await import('../lib/database');const {createAccountLink}=await import('../lib/account-links');
await authReady();
const args=process.argv.slice(2),email=(args[args.indexOf('--email')+1]||'').trim().toLowerCase(),name=args.includes('--name')?args[args.indexOf('--name')+1]:'Studio owner';
if(!args.includes('--email')||!/^\S+@\S+\.\S+$/.test(email))throw Error('Database ready. To set up the owner: npm run setup -- --email you@example.com --name "Your name"');
const db=sqlite(),owner=db.prepare("SELECT id,email,user_id FROM members WHERE role='owner'").get() as {id:string;email:string;user_id:string|null}|undefined;
if(owner&&owner.email!==email)throw Error('An owner already exists. Use account:reset with their existing email.');
if(owner?.user_id)throw Error('The owner is already set up. Use npm run account:reset -- --email '+email+' for recovery.');
const id=owner?.id||crypto.randomUUID(),now=new Date().toISOString();if(!owner)db.prepare("INSERT INTO members(id,email,name,role,created_at,updated_at) VALUES(?,?,?,'owner',?,?)").run(id,email,name,now,now);
console.log('Open this private, one-use link to choose your password (expires in 24 hours):\n'+createAccountLink(id));
