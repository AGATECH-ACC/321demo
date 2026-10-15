'use client';
import {useEffect,useRef,useState} from 'react';
import {BarChart3,LayoutDashboard,FolderOpen,Clapperboard,Film,CalendarDays,CheckCheck,BookOpen,ShieldCheck,Archive,ChevronDown,ChevronsDownUp,ChevronsUpDown} from 'lucide-react';

export type Section='Production KPIs'|'Client studios'|'Production studios'|'Team access'|'Overview'|'Production'|'Reviews'|'Calendar'|'Workflow guide'|'Archive';
const departments=[
 {id:'clients',name:'Client Services',items:[{section:'Client studios',label:'Client studios',icon:FolderOpen}]},
 {id:'production',name:'Production',items:[{section:'Production studios',label:'Production studios',icon:Clapperboard},{section:'Production',label:'Video tracker',icon:Film},{section:'Calendar',label:'Calendar',icon:CalendarDays},{section:'Production KPIs',label:'Production KPIs',icon:BarChart3}]},
 {id:'review',name:'Review & Quality',items:[{section:'Reviews',label:'Reviews',icon:CheckCheck},{section:'Workflow guide',label:'Workflow guide',icon:BookOpen}]},
 {id:'admin',name:'Administration',items:[{section:'Team access',label:'Team access',icon:ShieldCheck},{section:'Archive',label:'Archive',icon:Archive}]},
] as const;
type GroupId=typeof departments[number]['id'];
type GroupState=Record<GroupId,boolean>;
const expanded:GroupState={clients:true,production:true,review:true,admin:true};

export default function SidebarNav({section,navigate,isManager,reviews,memberId}:{section:Section;navigate:(section:Section)=>void;isManager:boolean;reviews:number;memberId:string}){
 const [open,setOpen]=useState<GroupState>(expanded),[ready,setReady]=useState(false);
 const priorSection=useRef(section),key='three21.sidebar.departments.v1.'+memberId;
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')setOpen(Object.fromEntries(Object.entries(expanded).map(([id,value])=>[id,typeof saved[id]==='boolean'?saved[id]:value])) as GroupState);}catch{/* Use expanded groups if browser storage is unavailable. */}setReady(true);},[key]);
 useEffect(()=>{if(ready)try{localStorage.setItem(key,JSON.stringify(open));}catch{/* Navigation remains usable without storage. */}},[key,open,ready]);
 useEffect(()=>{if(section===priorSection.current)return;priorSection.current=section;const group=departments.find(g=>g.items.some(item=>item.section===section));if(group)setOpen(current=>({...current,[group.id]:true}));},[section]);
 const allClosed=Object.values(open).every(value=>!value);
 return <nav className="department-nav" aria-label="Workspace navigation">
  <button className={'overview-link '+(section==='Overview'?'active':'')} aria-label={isManager?'Overview':'My dashboard'} title={isManager?'Overview':'My dashboard'} aria-current={section==='Overview'?'page':undefined} onClick={()=>navigate('Overview')}><LayoutDashboard size={18}/><span>{isManager?'Overview':'My dashboard'}</span></button>
  <div className="department-toolbar"><span>DEPARTMENTS</span><button className="group-control" aria-label={allClosed?'Expand all departments':'Collapse all departments'} title={allClosed?'Expand all departments':'Collapse all departments'} onClick={()=>setOpen({clients:allClosed,production:allClosed,review:allClosed,admin:allClosed})}>{allClosed?<ChevronsUpDown size={15}/>:<ChevronsDownUp size={15}/>}</button></div>
  {departments.map(group=>{const active=group.items.some(item=>item.section===section),items=group.items.filter(item=>item.section!=='Team access'||isManager);return <div className={'department-group '+(active?'contains-current':'')} key={group.id}>
   <button className="department-toggle" aria-expanded={open[group.id]} aria-controls={'department-'+group.id} onClick={()=>setOpen(current=>({...current,[group.id]:!current[group.id]}))}><span className="department-dot" aria-hidden="true"/><span>{group.name}</span>{!open[group.id]&&active&&<span className="current-group-label">Current</span>}{!open[group.id]&&group.id==='review'&&reviews>0&&<b aria-label={reviews+' awaiting review'}>{reviews}</b>}<ChevronDown className="group-chevron" size={14}/></button>
   <div className={'department-links'+(!open[group.id]?' is-closed':'')} id={'department-'+group.id}>{items.map(item=><button key={item.section} className={section===item.section?'active':''} aria-label={item.label+(item.section==='Reviews'&&reviews>0?' ('+reviews+' awaiting review)':'')} title={item.label} aria-current={section===item.section?'page':undefined} onClick={()=>navigate(item.section)}><item.icon size={17}/><span>{item.label}</span>{item.section==='Reviews'&&reviews>0&&<b>{reviews}</b>}</button>)}</div>
  </div>})}
 </nav>;
}
