import {db} from '../../../lib/database';
export const dynamic='force-dynamic';
export async function GET(){try{await db.prepare('SELECT 1').first();return Response.json({status:'ok'});}catch{return Response.json({status:'unavailable'},{status:503});}}
