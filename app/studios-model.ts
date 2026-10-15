import {z} from 'zod';
import {resourceList} from './resources.ts';
export const PREP_CHECKS=[['brief','Shoot brief and deliverables confirmed'],['equipment','Equipment and props checked; PIC photos recorded'],['schedule','Call time, location and crew confirmed'],['backup','Footage uploaded, classified and backup verified'],['handoff','Admin acknowledged footage handoff']] as const;
export const studioSchema=z.object({
  kind:z.enum(['client','production']),parentId:z.union([z.string().uuid(),z.literal('')]).default(''),
  name:z.string().trim().min(1,'A studio name is required.').max(160),summary:z.string().max(2000).default(''),
  notes:z.string().max(12000).default(''),coordinator:z.string().max(100).default(''),location:z.string().max(300).default(''),
  shootDate:z.string().refine(s=>!s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,'Use a valid shoot date.').default(''),
  logo:z.string().max(2_800_000,'The logo must be 2 MB or smaller.').regex(/^(?:data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2})?$/,'Choose a PNG, JPG or WebP logo.').default(''),
  links:resourceList.default([]),checks:z.record(z.boolean()).default({}),archived:z.boolean().default(false),
}).superRefine((v,c)=>{if(v.kind==='production'&&v.logo)c.addIssue({code:'custom',message:'Set the logo on the client studio.',path:['logo']});if(v.kind==='production'&&!v.parentId)c.addIssue({code:'custom',message:'Choose a client studio.',path:['parentId']});if(v.kind==='client'&&v.parentId)c.addIssue({code:'custom',message:'Client studios cannot have a parent.',path:['parentId']});});
export type StudioInput=z.infer<typeof studioSchema>;
export type StudioRecord=StudioInput&{id:string;revision:number;updatedAt:string;activity:{at:string;by:string;text:string}[]};
export type StudioData={clients:StudioRecord[];productions:StudioRecord[]};
export type StudioRow={id:string;data:string;revision:number;updated_at:string};
export function decodeStudio(row:StudioRow):StudioRecord{const raw=JSON.parse(row.data);return {...studioSchema.parse(raw),id:row.id,revision:row.revision,updatedAt:row.updated_at,activity:Array.isArray(raw.activity)?raw.activity:[]};}
