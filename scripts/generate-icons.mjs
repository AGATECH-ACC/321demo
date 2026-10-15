// Package the supplied transparent logo into platform icon sizes.
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('public/icons',{recursive:true});
const logo=await sharp('public/logo.png').trim().png().toBuffer();
const inset=await sharp(logo).resize({width:372,height:180,fit:'inside'}).toBuffer();
const meta=await sharp(inset).metadata();
const background=Buffer.from('<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#f8f8f4"/><rect x="24" y="24" width="464" height="464" rx="100" fill="#fff" stroke="#f9a323" stroke-width="10"/><rect x="218" y="350" width="76" height="8" rx="4" fill="#f9a323"/></svg>');
const icon=await sharp(background).composite([{input:inset,left:Math.round((512-meta.width)/2),top:Math.round((512-meta.height)/2)-10}]).png().toBuffer();
for(const [file,size] of [['icons/icon-512.png',512],['icons/icon-192.png',192],['apple-touch-icon.png',180],['favicon-192.png',192],['favicon-32.png',32]])await sharp(icon).resize(size,size).png().toFile('public/'+file);
// Full-bleed background; the logo fits inside Android's central safe circle.
const maskLogo=await sharp(logo).resize({width:350,height:160,fit:'inside'}).toBuffer();
const mm=await sharp(maskLogo).metadata();
await sharp({create:{width:512,height:512,channels:4,background:'#f8f8f4'}}).composite([{input:maskLogo,left:Math.round((512-mm.width)/2),top:Math.round((512-mm.height)/2)}]).png().toFile('public/icons/icon-maskable-512.png');
// Keep the legacy SVG path branded as well.
await writeFile('public/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,'+icon.toString('base64')+'"/></svg>');
// ICO wrapper with a PNG payload for browsers that request /favicon.ico.
const png=await sharp(icon).resize(32,32).png().toBuffer(),header=Buffer.alloc(22);
header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=32;header[7]=32;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
await writeFile('public/favicon.ico',Buffer.concat([header,png]));
console.log('Generated branded browser, Apple and Android icons.');
