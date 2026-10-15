'use client';
import {useState} from 'react';
import {LogOut} from 'lucide-react';
export default function SignOut(){const [busy,setBusy]=useState(false);return <button disabled={busy} title="Sign out" aria-label="Sign out" onClick={async()=>{setBusy(true);try{const r=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok)window.location.assign('/sign-in');else alert('Sign-out failed. Please retry.');}catch{alert('Could not connect. Please retry.');}finally{setBusy(false);}}}><LogOut size={17}/></button>;}
