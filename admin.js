/* MathClans V2.0 school administration + moderation console */
(()=>{
'use strict';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const $=q=>document.querySelector(q);
let db=null,auth=null,user=null,isAdmin=false;
function toast(m){window.MathClansGame?.toast?.(m)}
function modal(h){if(typeof showModal==='function')showModal(h)}
async function check(){
 if(!window.MathClansOnline?.configured)return false;
 db=window.MathClansOnline.db();auth=window.MathClansOnline.auth();user=window.MathClansOnline.user();if(!db||!user)return false;
 try{const s=await db.collection('admins').doc(user.uid).get();isAdmin=s.exists&&s.data()?.active!==false}catch(e){isAdmin=false}
 return isAdmin;
}
async function counts(){
 const [ps,cs,bs]=await Promise.all([db.collection('players').limit(500).get(),db.collection('clans').limit(500).get(),db.collection('battleHistory').orderBy('endedAtMs','desc').limit(50).get().catch(()=>({size:0,docs:[]}))]);
 return{players:ps.size,clans:cs.size,battles:bs.size,playersSnap:ps,clansSnap:cs,battlesSnap:bs};
}
async function onlineCount(){try{const s=await window.MathClansOnline.rtdb().ref('presence').once('value');const v=s.val()||{};return Object.values(v).filter(x=>x&&(x.state==='online'||x.state==='away')).length}catch(e){return 0}}
async function open(){
 if(!await check()){toast('Administrator access required.');return}
 modal('<span class="eyebrow">V2.0 SCHOOL ADMIN</span><h3>Loading administration dashboard…</h3>');
 const [c,on]=await Promise.all([counts(),onlineCount()]);
 modal(`<span class="eyebrow">V2.0 SCHOOL ADMIN</span><h3>MathClans Administration</h3><p>Use this console for school-wide oversight. Student Google email addresses are shown only to authorised administrators.</p><div class="admin-grid"><div class="admin-stat"><span>Players</span><b>${c.players}</b></div><div class="admin-stat"><span>Clans</span><b>${c.clans}</b></div><div class="admin-stat"><span>Online now</span><b>${on}</b></div><div class="admin-stat"><span>Recent battles</span><b>${c.battles}</b></div></div><div class="modal-actions"><button class="secondary" id="adminPlayers">Players</button><button class="secondary" id="adminClans">Clans</button><button class="secondary" id="adminReports">Reports</button><button class="primary" id="adminClose">Close</button></div>`);
 setTimeout(()=>{$('#adminPlayers').onclick=openPlayers;$('#adminClans').onclick=openClans;$('#adminReports').onclick=openReports;$('#adminClose').onclick=closeModal},0);
}
async function openPlayers(){
 if(!await check())return;
 const [s,priv]=await Promise.all([db.collection('players').orderBy('updatedAtMs','desc').limit(100).get(),db.collection('privateProfiles').limit(500).get()]);
 const emails=new Map(priv.docs.map(d=>[d.id,d.data()?.email||'']));
 const rows=s.docs.map(d=>({id:d.id,...d.data(),email:emails.get(d.id)||''}));
 modal(`<span class="eyebrow">ADMIN · PLAYERS</span><h3>Player accounts</h3><p>Showing up to 100 recently active accounts.</p><div class="admin-table">${rows.map(p=>{const suspended=p.moderation?.status==='suspended';return `<div class="admin-row"><span>${p.avatar||'🐲'}</span><div><strong>${esc(p.displayName||'Mathling')}</strong><small>${esc(p.email||'')} ${p.schoolClass?'· '+esc(p.schoolClass):''}</small></div><div class="admin-meta">Lv ${Number(p.level||1)} · ${Number(p.totalSkill||0)} mastery</div><div class="admin-actions"><button class="secondary admin-toggle" data-id="${p.id}" data-suspended="${suspended?'1':'0'}">${suspended?'Restore':'Suspend'}</button></div></div>`}).join('')}</div><div class="modal-actions"><button class="secondary" id="adminBack">Back</button><button class="primary" id="adminClose">Close</button></div>`);
 setTimeout(()=>{$('.admin-table')?.querySelectorAll('.admin-toggle').forEach(b=>b.onclick=()=>toggleSuspend(b.dataset.id,b.dataset.suspended==='1'));$('#adminBack').onclick=open;$('#adminClose').onclick=closeModal},0);
}
async function toggleSuspend(uid,currently){
 if(!await check())return;let reason='';if(!currently)reason=prompt('Reason for suspension (visible to the student):','Please speak to your teacher.')||'Please speak to your teacher.';
 await db.collection('players').doc(uid).set({moderation:currently?{status:'active',restoredAtMs:Date.now(),restoredBy:user.uid}:{status:'suspended',reason,suspendedAtMs:Date.now(),suspendedBy:user.uid},updatedAtMs:Date.now()},{merge:true});toast(currently?'Account restored.':'Account suspended.');openPlayers();
}
async function openClans(){
 if(!await check())return;const s=await db.collection('clans').orderBy('rating','desc').limit(100).get();const rows=s.docs.map((d,i)=>({id:d.id,rank:i+1,...d.data()}));
 modal(`<span class="eyebrow">ADMIN · CLANS</span><h3>Clan overview</h3><div class="admin-table">${rows.map(c=>`<div class="admin-row"><span>${c.guardian||'🐉'}</span><div><strong>#${c.rank} ${esc(c.name||'Clan')}</strong><small>${esc(c.region||'—')} · ${Number(c.memberCount||0)}/30 members</small></div><div class="admin-meta">Rating ${Number(c.rating||1500)}</div><div class="admin-actions"><button class="secondary admin-report-clan" data-id="${c.id}" data-name="${esc(c.name||'Clan')}">View ID</button></div></div>`).join('')}</div><div class="modal-actions"><button class="secondary" id="adminBack">Back</button><button class="primary" id="adminClose">Close</button></div>`);
 setTimeout(()=>{$('.admin-table')?.querySelectorAll('.admin-report-clan').forEach(b=>b.onclick=()=>alert(`${b.dataset.name}\nClan ID: ${b.dataset.id}`));$('#adminBack').onclick=open;$('#adminClose').onclick=closeModal},0);
}
async function openReports(){
 if(!await check())return;let s;try{s=await db.collection('reports').orderBy('createdAtMs','desc').limit(100).get()}catch(e){s={docs:[]}}const rows=s.docs.map(d=>({id:d.id,...d.data()}));
 modal(`<span class="eyebrow">ADMIN · REPORTS</span><h3>Moderation reports</h3><div class="admin-table">${rows.length?rows.map(r=>`<div class="admin-row"><span>🚩</span><div><strong>${esc(r.targetType||'Report')}: ${esc(r.targetName||r.targetId||'')}</strong><small>${esc(r.reason||'No reason supplied')}</small></div><div class="admin-meta">${r.status||'open'}</div><div class="admin-actions"><button class="secondary resolve-report" data-id="${r.id}">Resolve</button></div></div>`).join(''):'<p>No reports.</p>'}</div><div class="modal-actions"><button class="secondary" id="adminBack">Back</button><button class="primary" id="adminClose">Close</button></div>`);
 setTimeout(()=>{$('.admin-table')?.querySelectorAll('.resolve-report').forEach(b=>b.onclick=async()=>{await db.collection('reports').doc(b.dataset.id).set({status:'resolved',resolvedBy:user.uid,resolvedAtMs:Date.now()},{merge:true});openReports()});$('#adminBack').onclick=open;$('#adminClose').onclick=closeModal},0);
}
async function report(targetType,targetId,targetName){
 if(!window.MathClansOnline?.configured||!window.MathClansOnline.user())return toast('Sign in before submitting a report.');
 db=window.MathClansOnline.db();user=window.MathClansOnline.user();const reason=prompt(`Why are you reporting ${targetName||targetType}?`,'')?.trim();if(!reason)return;
 await db.collection('reports').add({reporterUid:user.uid,targetType,targetId,targetName:targetName||'',reason,status:'open',createdAtMs:Date.now(),createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast('Report submitted to school administrators.');
}
window.MathClansAdmin={open,check,report,isAdmin:()=>isAdmin};
setTimeout(check,1200);
})();
