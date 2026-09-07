/* MathClans V1.7.1 real clans + presence + 20-second consensual war rally */
(() => {
'use strict';
const $=q=>document.querySelector(q);
const panel=$('#onlineClanPanel'),status=$('#onlineClanStatus'),hint=$('#onlineClanHint'),actions=$('#onlineClanActions');
if(!panel)return;
let auth,db,rtdb,user=null,clan=null,memberUnsub=null,presenceUnsub=null,readyUnsub=null,inviteUnsub=null,profiles=new Map(),memberRows=[],presence={},ready={},activeInviteId=null;
const regions=['Central','Tampines','Sengkang','Jurong','Woodlands','Bedok','Punggol','Bishan'];
const guardians=['🐉','🐙','🦊','🐼','🦉','🐢','🦁','🦄'];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function gameToast(m){window.MathClansGame?.toast?.(m)}
function onlineMode(){return Boolean(window.MathClansOnline?.configured && window.MathClansOnline?.user?.())}
function liveClan(){return Boolean(user&&clan&&state?.player?.clanId===clan.id)}
function updatePanel(){
 if(!user){status.textContent='Sign in to use real clans';hint.textContent='Your local demo clan remains available until you sign in.';actions.innerHTML='<button class="primary" id="clanSignIn">Sign In</button>';$('#clanSignIn').onclick=()=>window.MathClansOnline?.signIn?.();return}
 if(!clan){status.textContent='No online clan yet';hint.textContent='Create a clan or join an existing clan. Maximum 30 members per clan.';actions.innerHTML='<button class="secondary" id="browseClans">Browse Clans</button><button class="primary" id="createClan">Create Clan</button>';$('#createClan').onclick=openCreate;$('#browseClans').onclick=openBrowse;return}
 status.textContent=`${clan.guardian||'🐉'} ${clan.name} · ${clan.memberCount||memberRows.length}/30 members`;hint.textContent=`${state.player.clanRole==='leader'?'Clan Leader':state.player.clanRole==='officer'?'Officer':'Member'} · ${clan.region} · Rating ${clan.rating||1500}`;
 actions.innerHTML='<button class="secondary" id="warReadyToggle">⚔ War Ready</button><button class="secondary" id="browseClans">Clan Directory</button><button class="primary" id="leaveClan">Leave Clan</button>';
 $('#warReadyToggle').onclick=toggleReady;$('#browseClans').onclick=openBrowse;$('#leaveClan').onclick=leaveClan;
}
function openCreate(){
 showModal(`<span class="eyebrow">CREATE ONLINE CLAN</span><h3>Found a new clan</h3><p>Each clan can have up to <b>30 members</b>. You become the clan leader.</p><label>Clan name</label><input id="newClanName" maxlength="28" placeholder="e.g. Math Dragons"><label>Guardian</label><select id="newClanGuardian">${guardians.map(x=>`<option>${x}</option>`).join('')}</select><label>HQ region</label><select id="newClanRegion">${regions.map(x=>`<option>${x}</option>`).join('')}</select><div class="modal-actions"><button class="secondary" onclick="closeModal()">Cancel</button><button class="primary" id="confirmCreateClan">Create Clan</button></div>`);
 $('#confirmCreateClan').onclick=createClan;
}
async function createClan(){
 if(!user||state.player.clanId)return;const name=$('#newClanName').value.trim();if(name.length<3){gameToast('Clan name must have at least 3 characters.');return}
 const guardian=$('#newClanGuardian').value,region=$('#newClanRegion').value,ref=db.collection('clans').doc();const batch=db.batch();
 batch.set(ref,{name,nameLower:name.toLowerCase(),guardian,region,rating:1500,influence:0,memberCount:1,leaderId:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
 batch.set(ref.collection('members').doc(user.uid),{uid:user.uid,role:'leader',displayName:state.player.name,avatar:state.player.avatar,joinedAt:firebase.firestore.FieldValue.serverTimestamp()});
 batch.set(db.collection('players').doc(user.uid),{clanId:ref.id,clanRole:'leader',updatedAtMs:Date.now()},{merge:true});
 try{await batch.commit();state.player.clanId=ref.id;state.player.clanRole='leader';save();closeModal();await loadClan(ref.id);gameToast('🏰 Online clan created.')}catch(e){console.error(e);gameToast('Could not create clan. Check Firestore rules.')}
}
async function openBrowse(){
 if(!user)return;showModal('<span class="eyebrow">CLAN DIRECTORY</span><h3>Online Clans</h3><div id="cloudClanList">Loading…</div><div class="modal-actions"><button class="secondary" onclick="closeModal()">Close</button></div>');
 try{const snap=await db.collection('clans').orderBy('createdAt','desc').limit(30).get();const list=$('#cloudClanList');if(snap.empty){list.innerHTML='<p>No clans yet. Be the first to create one.</p>';return}list.innerHTML=snap.docs.map(d=>{const x=d.data();return `<div class="cloud-clan-row"><span class="cloud-clan-crest">${x.guardian||'🐉'}</span><div><strong>${esc(x.name)}</strong><small>${esc(x.region)} · ${x.memberCount||0}/30 · Rating ${x.rating||1500}</small></div>${state.player.clanId===d.id?'<b>YOUR CLAN</b>':state.player.clanId?'':'<button class="secondary join-cloud-clan" data-id="'+d.id+'">Join</button>'}</div>`}).join('');document.querySelectorAll('.join-cloud-clan').forEach(b=>b.onclick=()=>joinClan(b.dataset.id));}catch(e){console.error(e);$('#cloudClanList').innerHTML='<p>Could not load clans. Check Firestore indexes/rules.</p>'}
}
async function joinClan(id){if(!user||state.player.clanId)return;const cref=db.collection('clans').doc(id),mref=cref.collection('members').doc(user.uid),pref=db.collection('players').doc(user.uid);
 try{await db.runTransaction(async tx=>{const cs=await tx.get(cref);if(!cs.exists)throw new Error('Clan no longer exists.');const c=cs.data();if((c.memberCount||0)>=30)throw new Error('Clan is full (30/30).');tx.set(mref,{uid:user.uid,role:'member',displayName:state.player.name,avatar:state.player.avatar,joinedAt:firebase.firestore.FieldValue.serverTimestamp()});tx.update(cref,{memberCount:(c.memberCount||0)+1});tx.set(pref,{clanId:id,clanRole:'member',updatedAtMs:Date.now()},{merge:true});});state.player.clanId=id;state.player.clanRole='member';save();closeModal();await loadClan(id);gameToast('🤝 Joined online clan.')}catch(e){console.error(e);gameToast(e.message||'Could not join clan.')}
}
async function leaveClan(){if(!clan||!user)return;if(state.player.clanRole==='leader'&&(clan.memberCount||0)>1){gameToast('Leader must remain while other members are in the clan. Transfer leadership is planned for V1.8.');return}if(!confirm(`Leave ${clan.name}?`))return;const cref=db.collection('clans').doc(clan.id),mref=cref.collection('members').doc(user.uid),pref=db.collection('players').doc(user.uid);
 try{if(state.player.clanRole==='leader'&&(clan.memberCount||0)<=1){const batch=db.batch();batch.delete(mref);batch.delete(cref);batch.set(pref,{clanId:null,clanRole:null,updatedAtMs:Date.now()},{merge:true});await batch.commit()}else{await db.runTransaction(async tx=>{const cs=await tx.get(cref);const c=cs.data()||{};tx.delete(mref);tx.update(cref,{memberCount:Math.max(0,(c.memberCount||1)-1)});tx.set(pref,{clanId:null,clanRole:null,updatedAtMs:Date.now()},{merge:true})})}await rtdb.ref(`warReady/${user.uid}`).remove();state.player.clanId=null;state.player.clanRole=null;save();stopWatchers();clan=null;memberRows=[];updatePanel();gameToast('Left clan.')}catch(e){console.error(e);gameToast('Could not leave clan.')}
}
async function toggleReady(){if(!user||!clan)return;const ref=rtdb.ref(`warReady/${user.uid}`);const snap=await ref.once('value');if(snap.exists()&&snap.val()?.ready){await ref.remove();gameToast('War Ready off.')}else{await ref.set({ready:true,clanId:clan.id,lastChanged:firebase.database.ServerValue.TIMESTAMP});gameToast('⚔ War Ready on.')}}

function rallyId(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
async function startRally(selected,targetIndex,onComplete){
 if(!user||!clan||!selected?.length)return;
 if(!['leader','officer'].includes(state.player.clanRole)){gameToast('Only a leader or officer can call a war rally.');return}
 const id=rallyId(),selectedByUid=Object.fromEntries(selected.filter(x=>x.uid).map(x=>[x.uid,x]));
 // The caller has already volunteered by starting the rally, so auto-accept if selected.
 const responses={};if(selectedByUid[user.uid])responses[user.uid]='accepted';
 const rally={id,clanId:clan.id,callerUid:user.uid,targetIndex,createdAt:firebase.database.ServerValue.TIMESTAMP,expiresAt:Date.now()+20000,status:'open',selected:Object.keys(selectedByUid),responses};
 const updates={};updates[`warRallies/${clan.id}/${id}`]=rally;
 for(const uid of Object.keys(selectedByUid)){if(uid===user.uid)continue;updates[`rallyInvites/${uid}/${id}`]={rallyId:id,clanId:clan.id,clanName:clan.name,callerUid:user.uid,targetIndex,expiresAt:Date.now()+20000};}
 await rtdb.ref().update(updates);
 showRallyOwner(id,selected,selectedByUid,onComplete);
}
function showRallyOwner(id,selected,selectedByUid,onComplete){
 const ref=rtdb.ref(`warRallies/${clan.id}/${id}`),deadline=Date.now()+20000;let done=false,timer=null;
 const finish=async(data)=>{if(done)return;done=true;if(timer)clearInterval(timer);ref.off();const responses=data?.responses||{};const accepted=selected.filter(x=>!x.uid||responses[x.uid]==='accepted').map(x=>x.idx);const cleanup={};for(const uid of Object.keys(selectedByUid)){cleanup[`rallyInvites/${uid}/${id}`]=null}cleanup[`warRallies/${clan.id}/${id}/status`]='closed';await rtdb.ref().update(cleanup).catch(()=>{});closeModal();onComplete?.(accepted)};
 const render=data=>{const responses=data?.responses||{},known=Object.keys(selectedByUid),answered=known.filter(uid=>responses[uid]==='accepted'||responses[uid]==='rejected').length;const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));showModal(`<span class="eyebrow">RALLY FOR WAR</span><h3>Waiting for clan responses</h3><p>Maximum wait: <b>20 seconds</b>. The rally closes immediately when everyone responds.</p><div class="rally-box"><div class="rally-countdown">${remaining}s</div><div class="rally-roster">${selected.map(x=>{const st=x.uid?(responses[x.uid]||'pending'):'accepted';return `<div class="rally-row"><span>${x.avatar||'🐲'}</span><b>${esc(x.name||'Mathling')}</b><span class="rally-state ${st}">${st.toUpperCase()}</span></div>`}).join('')}</div></div><div class="modal-actions"><button class="secondary" id="cancelRallyBtn">Cancel Rally</button></div>`);const b=$('#cancelRallyBtn');if(b)b.onclick=()=>finish({responses:{}});if(answered===known.length&&known.length>0)finish(data);};
 ref.on('value',snap=>{const data=snap.val()||{};render(data)});
 timer=setInterval(async()=>{const snap=await ref.once('value'),data=snap.val()||{};if(Date.now()>=deadline)finish(data);else render(data)},1000);
}
function watchRallyInvites(){
 if(inviteUnsub){inviteUnsub();inviteUnsub=null}if(!user)return;const ref=rtdb.ref(`rallyInvites/${user.uid}`);
 const handler=snap=>{const all=snap.val()||{},entries=Object.entries(all).filter(([,v])=>v&&v.expiresAt>Date.now()).sort((a,b)=>a[1].expiresAt-b[1].expiresAt);if(!entries.length)return;const [id,inv]=entries[0];if(activeInviteId===id)return;activeInviteId=id;showInvite(id,inv)};
 ref.on('value',handler);inviteUnsub=()=>ref.off('value',handler);
}
function showInvite(id,inv){
 const deadline=Number(inv.expiresAt||Date.now()+20000);let timer=null,resolved=false;
 const respond=async(choice)=>{if(resolved)return;resolved=true;if(timer)clearInterval(timer);await rtdb.ref(`warRallies/${inv.clanId}/${id}/responses/${user.uid}`).set(choice);await rtdb.ref(`rallyInvites/${user.uid}/${id}`).remove();activeInviteId=null;closeModal();gameToast(choice==='accepted'?'⚔ Rally accepted. Prepare for war.':'Rally declined.');};
 const draw=()=>{const remain=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(remain<=0){respond('rejected');return}showModal(`<span class="eyebrow">⚔ RALLY FOR WAR</span><h3>${esc(inv.clanName||'Your clan')} is calling you</h3><p>You were selected for a clan battle. Participation is voluntary.</p><div class="rally-box"><div class="rally-countdown">${remain}s</div><p>Accept to rally for war, or reject this invitation.</p></div><div class="modal-actions"><button class="secondary" id="rallyReject">Reject</button><button class="primary" id="rallyAccept">Accept</button></div>`);$('#rallyReject').onclick=()=>respond('rejected');$('#rallyAccept').onclick=()=>respond('accepted')};draw();timer=setInterval(draw,1000);
}

function roleFromSkills(sk){if(!sk)return'algebra';return Object.keys(SKILLS).sort((a,b)=>(sk[b]||0)-(sk[a]||0))[0]||'algebra'}
async function rebuildRoster(){if(!clan)return;const rows=[];for(const m of memberRows){let p=profiles.get(m.uid);if(!p){try{const ps=await db.collection('players').doc(m.uid).get();p=ps.data()||{};profiles.set(m.uid,p)}catch(e){p={}}}const pr=presence[m.uid]||{},wr=ready[m.uid]||{};let status='offline';if(pr.state==='online'||pr.state==='away')status=wr.ready?'ready':pr.activity==='training'?'training':pr.activity==='battle'?'deployed':'online';rows.push({uid:m.uid,name:p.displayName||m.displayName||'Mathling',avatar:p.avatar||m.avatar||'🐲',role:roleFromSkills(p.skills),status,skills:{algebra:p.skills?.algebra||1,geometry:p.skills?.geometry||1,trigonometry:p.skills?.trigonometry||1,statistics:p.skills?.statistics||1}})}window.MathClansGame?.setMembers?.(rows);window.MathClansGame?.setClan?.({...clan,memberCount:rows.length});}
function startRealtime(){if(presenceUnsub)presenceUnsub();if(readyUnsub)readyUnsub();const pref=rtdb.ref('presence'),wref=rtdb.ref('warReady');const ph=s=>{const prev=presence;presence=s.val()||{};for(const uid of Object.keys(prev||{})){if((prev[uid]?.state==='online'||prev[uid]?.state==='away')&&presence[uid]?.state==='offline')window.MathClansGame?.markBattleParticipantLeft?.(uid)}rebuildRoster()},wh=s=>{ready=s.val()||{};rebuildRoster()};pref.on('value',ph);wref.on('value',wh);presenceUnsub=()=>pref.off('value',ph);readyUnsub=()=>wref.off('value',wh)}
function stopWatchers(){if(memberUnsub)memberUnsub();if(presenceUnsub)presenceUnsub();if(readyUnsub)readyUnsub();if(inviteUnsub)inviteUnsub();memberUnsub=presenceUnsub=readyUnsub=inviteUnsub=null;profiles.clear()}
async function loadClan(id){stopWatchers();if(!id){clan=null;updatePanel();return}try{const ref=db.collection('clans').doc(id),snap=await ref.get();if(!snap.exists){state.player.clanId=null;state.player.clanRole=null;save();clan=null;updatePanel();return}clan={id:snap.id,...snap.data()};window.MathClansGame?.setClan?.(clan);updatePanel();memberUnsub=ref.collection('members').onSnapshot(ms=>{memberRows=ms.docs.map(d=>d.data());clan.memberCount=memberRows.length;updatePanel();rebuildRoster()},e=>console.warn('clan members',e));startRealtime();watchRallyInvites()}catch(e){console.error(e);status.textContent='Could not load online clan';hint.textContent='Check Firestore rules and connection.'}}
function openSettings(){if(!clan||state.player.clanRole!=='leader'){gameToast('Only the clan leader can edit clan settings.');return}showModal(`<span class="eyebrow">ONLINE CLAN SETTINGS</span><h3>Edit ${esc(clan.name)}</h3><label>Clan name</label><input id="cloudClanName" maxlength="28" value="${esc(clan.name)}"><label>Region</label><select id="cloudClanRegion">${regions.map(x=>`<option ${x===clan.region?'selected':''}>${x}</option>`).join('')}</select><div class="modal-actions"><button class="secondary" onclick="closeModal()">Cancel</button><button class="primary" id="saveCloudClan">Save</button></div>`);$('#saveCloudClan').onclick=async()=>{const name=$('#cloudClanName').value.trim();if(name.length<3)return;await db.collection('clans').doc(clan.id).update({name,nameLower:name.toLowerCase(),region:$('#cloudClanRegion').value});clan.name=name;clan.region=$('#cloudClanRegion').value;window.MathClansGame?.setClan?.(clan);closeModal();updatePanel()}}
function initFirebase(){if(!window.MathClansOnline?.configured){updatePanel();return}auth=firebase.auth();db=firebase.firestore();rtdb=firebase.database();auth.onAuthStateChanged(async u=>{user=u||null;if(!user){stopWatchers();clan=null;updatePanel();return}const ps=await db.collection('players').doc(user.uid).get();const pd=ps.data()||{};if(pd.clanId){state.player.clanId=pd.clanId;state.player.clanRole=pd.clanRole||'member';save();await loadClan(pd.clanId)}else{clan=null;state.player.clanId=null;state.player.clanRole=null;save();updatePanel()}})}
window.MathClansClans={isOnlineMode:onlineMode,isLiveClan:liveClan,openSettings,openBrowse,startRally};
setTimeout(initFirebase,0);
})();
