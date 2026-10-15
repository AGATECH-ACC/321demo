import sharp from 'sharp';
export const LOGO_MAX_BYTES=2*1024*1024;
/** Decode and re-encode raster images; no SVG, remote fetches or uploaded metadata. */
export async function normalizeClientLogo(value:string){
 if(!value)return '';
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)throw Error('Choose a PNG, JPG or WebP logo.');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.length>LOGO_MAX_BYTES)throw Error('The logo must be 2 MB or smaller.');
 try{
  const image=sharp(bytes,{limitInputPixels:16_000_000,failOn:'warning'}),metadata=await image.metadata();
  if(!['png','jpeg','webp'].includes(metadata.format||'')||(metadata.pages||1)>1)throw Error('Unsupported image');
  const normalized=await image.rotate().resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  return 'data:image/png;base64,'+normalized.toString('base64');
 }catch{throw Error('This logo could not be read. Use a static PNG, JPG or WebP image up to 16 megapixels.');}
}
