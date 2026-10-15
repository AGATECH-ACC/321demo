import {betterAuth,type BetterAuthOptions} from 'better-auth';
import {getMigrations} from 'better-auth/db/migration';
import {sqlite} from './database';

let instance:ReturnType<typeof createAuth>|undefined;
let migration:Promise<void>|undefined;
export function appOrigin(){return new URL(process.env.BETTER_AUTH_URL||'http://localhost:3000').origin;}
function options(){
 const secret=process.env.BETTER_AUTH_SECRET;
 if(!secret||secret.length<32)throw Error('Run npm run setup to generate BETTER_AUTH_SECRET before starting the app.');
 return {appName:'Three.21 Studio',baseURL:appOrigin(),secret,database:sqlite(),
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:false},
  session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
  rateLimit:{enabled:true,storage:'database',window:60,max:30},
  advanced:{cookiePrefix:'three21',useSecureCookies:appOrigin().startsWith('https://')},
 } satisfies BetterAuthOptions;
}
function createAuth(){return betterAuth(options());}
export function getAuth(){return instance??=createAuth();}
export async function authReady(){migration??=(async()=>{const {runMigrations}=await getMigrations(options());await runMigrations();})();await migration;return getAuth();}
