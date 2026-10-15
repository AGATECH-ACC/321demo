import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoData} from '../app/demo-data.ts';
import {gates,STATUSES} from '../app/model.ts';
test('demo records cover the workflow with valid hierarchy and clearly fictional content',()=>{
 const {studios,jobs}=demoData('2026-10-11');
 assert.equal(studios.filter(s=>s.kind==='client').length,3);assert.equal(studios.filter(s=>s.kind==='production').length,4);assert.equal(jobs.length,10);
 assert.equal(new Set([...studios,...jobs].map(x=>x.id)).size,17);
 assert.deepEqual([...new Set(jobs.map(j=>j.status))].sort(),[...STATUSES].sort());
 for(const j of jobs){const p=studios.find(s=>s.id===j.productionId);assert.equal(p.parentId,j.clientId);assert.equal(p.shootDate,j.shootDate);assert.match(j.title,/^DEMO/);assert.match(j.notes,/FICTIONAL/);assert.equal(j.assigneeId,'');assert.deepEqual(gates(j,j.internalApproval,j.clientApproval),[]);assert.match(j.sourceLink,/^https:\/\/example.com\//);if(j.internalApproval)assert.match(j.internalApproval.by,/DEMO/);if(j.clientApproval)assert.match(j.clientApproval.by,/DEMO/);}
 for(const s of studios){assert.match(s.name,/^DEMO/);for(const l of s.links)assert.match(l.url,/^https:\/\/example.com\//);}
 assert.deepEqual(demoData('2026-10-11'),{studios,jobs});
 assert.deepEqual(demoData('2026-10-12').jobs.map(j=>j.id),jobs.map(j=>j.id));
});
