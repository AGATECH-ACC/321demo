import './env';
import {db} from '../lib/database';
import {createAccountLink} from '../lib/account-links';
const args=process.argv.slice(2),email=args.includes('--email')?args[args.indexOf('--email')+1]?.trim().toLowerCase():'';
const member=await db.prepare('SELECT id FROM members WHERE email=? AND active=1').bind(email).first<{id:string}>();
if(!member)throw Error('Supply an active account: npm run account:reset -- --email you@example.com');
console.log('Private account recovery link (one use, 24 hours):\n'+await createAccountLink(member.id));
