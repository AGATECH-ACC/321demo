import {db} from '../../../lib/database';
import {authReady} from '../../../lib/auth';
export const dynamic='force-dynamic';
export async function GET(){try{await authReady();await db.prepare('SELECT 1').first();return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
