'use client';
import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,Download,Smartphone,CheckCircle2} from 'lucide-react';
import {useInstall} from '../pwa-provider';
import {useState} from 'react';
export default function InstallPage(){
 const {available,installed,install}=useInstall(),[error,setError]=useState('');
 return <main className="install-page"><Link href="/" className="install-back"><ArrowLeft size={16}/>Back to studio</Link><section className="install-card">
  <img className="install-brand" src="/icons/icon-192.png" width="112" height="112" alt="Three.21 Consultancy app icon"/>
  <span className="eyebrow">YOUR STUDIO. WITH YOU.</span><h1>A home on your phone.</h1><p>Keep your briefs, edits and reviews one tap away. Add Three.21 Studio to your home screen and open it in its own app window.</p>
  {installed?<div className="install-status"><CheckCircle2 size={20}/>You’re using the installed app.</div>:available?<button className="primary" onClick={async()=>{setError('');try{await install();}catch{setError('Use your browser menu to install, or try again.');}}}><Download size={18}/>Install Three.21 Studio</button>:<div className="install-status"><Smartphone size={20}/>Follow the steps for your phone below.</div>}
  {error&&<p role="alert">{error}</p>}
  {!installed&&<div className="install-methods"><article><h2>iPhone & iPad</h2><ol><li>Open this website in <strong>Safari</strong>.</li><li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li><li>Keep <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</li></ol></article><article><h2>Android</h2><ol><li>Open this website in <strong>Chrome</strong>.</li><li>Tap <strong>Install Three.21 Studio</strong> above, when available.</li><li>Or open the <strong>⋮ menu → Add to Home screen → Install</strong>.</li></ol></article></div>}
  <p className="install-note">Use the same admin or editor login. An internet connection is needed to load videos and save changes.</p>
  <details className="install-hosting"><summary>Testing from your phone?</summary><p>Use the studio’s hosted HTTPS address. The localhost address on a phone refers to the phone itself. A GitHub repository stores the source code; the application still needs a running server.</p></details>
  <Link href="/" className="install-open">Open studio<ArrowUpRight size={16}/></Link>
 </section><footer>THREE.21 CONSULTANCY · Built by AGA Ventures</footer></main>;
}
