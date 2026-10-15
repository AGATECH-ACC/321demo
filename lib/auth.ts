import {betterAuth,type BetterAuthOptions} from 'better-auth';
import {getMigrations} from 'better-auth/db/migration';
import {sqlite,databaseReady,usesRemoteDatabase} from './database';
import {LibsqlDialect} from '@libsql/kysely-libsql';

let instance:ReturnType<typeof createAuth>|undefined;
let migration:Promise<void>|undefined;
export function appOrigin(){
 const value=process.env.BETTER_AUTH_URL;
 if(process.env.VERCEL&&(!value||!value.startsWith('https://')))throw Error('Set BETTER_AUTH_URL to the production HTTPS website URL in Vercel.');
 return new URL(value||'http://localhost:3000').origin;
}
function options(){
 const secret=process.env.BETTER_AUTH_SECRET;
 if(!secret||secret.length<32)throw Error('Set BETTER_AUTH_SECRET to at least 32 random characters in the hosting environment. For local setup, run npm run setup.');
 return {appName:'Three.21 Studio',baseURL:appOrigin(),secret,database:usesRemoteDatabase()?{dialect:new LibsqlDialect({url:process.env.TURSO_DATABASE_URL!,authToken:process.env.TURSO_AUTH_TOKEN}),type:'sqlite' as const}:sqlite(),
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:false},
  session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
  rateLimit:{enabled:true,storage:'database',window:60,max:30},
  advanced:{cookiePrefix:'three21',useSecureCookies:appOrigin().startsWith('https://')},
 } satisfies BetterAuthOptions;
}
function createAuth(){return betterAuth(options());}
export function getAuth(){return instance??=createAuth();}
export async function authReady(){migration??=(async()=>{await databaseReady();const {runMigrations}=await getMigrations(options());await runMigrations();})().catch(error=>{migration=undefined;throw error;});await migration;return getAuth();}
