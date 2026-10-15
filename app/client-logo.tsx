'use client';
import {useState} from 'react';
export default function ClientLogo({name,logo='',large=false}:{name:string;logo?:string;large?:boolean}){
 const [failed,setFailed]=useState('');
 const initials=name.replace(/^DEMO\s*·\s*/i,'').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
 return <span className={'client-logo'+(large?' large':'')}>
  {logo&&failed!==logo?<img src={logo} alt={name+' logo'} onError={()=>setFailed(logo)}/>:<span aria-label={name+' initials'}>{initials}</span>}
 </span>;
}
