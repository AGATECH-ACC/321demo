import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest {
 return {
  id:'/',name:'Three.21 Studio',short_name:'3.21 Studio',
  description:'Your 3.21 Consultancy video production workspace.',
  start_url:'/',scope:'/',display:'standalone',
  background_color:'#f8f8f4',theme_color:'#f8f8f4',lang:'en',
  icons:[
   {src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ],
 };
}
