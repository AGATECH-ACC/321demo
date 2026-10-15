'use client';
import {createContext,useContext,useEffect,useState} from 'react';
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const InstallContext=createContext<{available:boolean;installed:boolean;install:()=>Promise<void>}>({available:false,installed:false,install:async()=>{}});
export const useInstall=()=>useContext(InstallContext);
export default function PwaProvider({children}:{children:React.ReactNode}) {
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false);
 useEffect(()=>{
  const display=window.matchMedia('(display-mode: standalone)');
  const update=()=>setInstalled(display.matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
  const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
  const complete=()=>{setInstalled(true);setPrompt(null);};
  update();display.addEventListener('change',update);
  window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',complete);
  if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Online workspace remains available if installation support is blocked. */});
  return ()=>{display.removeEventListener('change',update);window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',complete);};
 },[]);
 async function install(){if(!prompt)return;try{await prompt.prompt();await prompt.userChoice;}finally{setPrompt(null);}}
 return <InstallContext.Provider value={{available:!!prompt,installed,install}}>{children}</InstallContext.Provider>;
}
