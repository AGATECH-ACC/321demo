import {z} from 'zod';
export const LINK_CATEGORIES=['Brand assets','Brief & SOP','Script & storyboard','Footage','Working files','Review','Final delivery','Cover','Publishing','Reference','Other'] as const;
export const resourceSchema=z.object({
  id:z.string().uuid(),label:z.string().trim().min(1).max(140),category:z.enum(LINK_CATEGORIES),
  url:z.string().trim().max(2000).url().refine(s=>/^https?:\/\//i.test(s),'Use an http:// or https:// link.'),
  note:z.string().max(2000).default(''),archived:z.boolean().default(false),
});
export type Resource=z.infer<typeof resourceSchema>;
export const resourceList=z.array(resourceSchema).max(100).refine(items=>new Set(items.map(i=>i.id)).size===items.length,'Each link must have a unique ID.');
