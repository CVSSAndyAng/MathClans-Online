const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

const SKILLS={
 algebra:{name:'Algebra',icon:'⚔',color:'#ff8d62',trait:'Attack',desc:'Expressions, equations, simultaneous equations & substitution'},
 geometry:{name:'Geometry',icon:'🛡',color:'#5ef0a4',trait:'Defence',desc:'Straight lines, gradient, distance, area, perimeter, surface area & volume'},
 trigonometry:{name:'Trigonometry',icon:'🎯',color:'#60e9ff',trait:'Precision',desc:'Trig ratios, Pythagoras, sine rule, cosine rule & triangle area'},
 statistics:{name:'Statistics',icon:'📊',color:'#b18cff',trait:'Tactics',desc:'Averages, probability, quartiles, SD & data displays'}
};
const defaultState={player:{name:'Player One',avatar:'🐲',level:1,xp:0,crystals:250},clan:{name:'Merlion Scholars',guardian:'🐉',region:'Central',rating:1500,influence:18},skills:{algebra:8,geometry:7,trigonometry:6,statistics:7},history:[],streak:0,training:{skills:{}}};
let state=JSON.parse(localStorage.getItem('mathclans-v1')||'null')||structuredClone(defaultState);
function ensureTrainingState(){
 state.training=state.training||{skills:{}};state.training.skills=state.training.skills||{};
 Object.keys(SKILLS).forEach(k=>{const t=state.training.skills[k]||{};state.training.skills[k]={confidence:Number.isFinite(t.confidence)?Math.max(30,Math.min(100,t.confidence)):85,wrongStreak:Number.isFinite(t.wrongStreak)?Math.max(0,t.wrongStreak):0,recent:Array.isArray(t.recent)?t.recent.slice(-7):[],remedial:!!t.remedial};});
}
ensureTrainingState();
const save=()=>localStorage.setItem('mathclans-v1',JSON.stringify(state));

const rivals=[
 {name:'Pi-Rates',crest:'🐙',region:'Tampines',rating:1548,skills:{algebra:62,geometry:70,trigonometry:48,statistics:74}},
 {name:'Angle Rangers',crest:'🦊',region:'Jurong',rating:1472,skills:{algebra:54,geometry:58,trigonometry:82,statistics:49}},
 {name:'Panda Prime',crest:'🐼',region:'Punggol',rating:1602,skills:{algebra:64,geometry:86,trigonometry:43,statistics:68}},
 {name:'Data Drakes',crest:'🐲',region:'Bedok',rating:1513,skills:{algebra:70,geometry:51,trigonometry:60,statistics:79}}
];
const RIVAL_COORDS=[{x:1110,y:505,region:'Tampines'},{x:355,y:675,region:'Jurong'},{x:930,y:360,region:'Punggol'},{x:1010,y:600,region:'Bedok'}];
const HOME_COORD={x:790,y:674};
let marching=false;
const members=[
 {name:'Ari',avatar:'🐲',role:'algebra',status:'ready',skills:{algebra:78,geometry:42,trigonometry:58,statistics:51}},
 {name:'Mei',avatar:'🐰',role:'trigonometry',status:'ready',skills:{algebra:49,geometry:55,trigonometry:84,statistics:57}},
 {name:'Zane',avatar:'🦊',role:'statistics',status:'training',skills:{algebra:54,geometry:48,trigonometry:64,statistics:81}},
 {name:'Nora',avatar:'🐼',role:'geometry',status:'ready',skills:{algebra:52,geometry:87,trigonometry:43,statistics:61}},
 {name:'Kai',avatar:'🤖',role:'algebra',status:'ready',skills:{algebra:82,geometry:58,trigonometry:61,statistics:44}},
 {name:'Lina',avatar:'🐧',role:'statistics',status:'online',skills:{algebra:51,geometry:66,trigonometry:47,statistics:79}},
 {name:'Theo',avatar:'🦖',role:'geometry',status:'ready',skills:{algebra:63,geometry:77,trigonometry:52,statistics:48}},
 {name:'Sora',avatar:'🐱',role:'trigonometry',status:'online',skills:{algebra:47,geometry:55,trigonometry:80,statistics:65}},
 {name:'Ben',avatar:'🐶',role:'algebra',status:'offline',skills:{algebra:74,geometry:49,trigonometry:51,statistics:56}},
 {name:'Ivy',avatar:'🦄',role:'geometry',status:'ready',skills:{algebra:55,geometry:75,trigonometry:65,statistics:60}}
];
const STATUS_META={ready:{label:'WAR READY',icon:'⚔',online:true,selectable:true},online:{label:'ONLINE',icon:'🟢',online:true,selectable:true},training:{label:'TRAINING',icon:'📚',online:true,selectable:true},deployed:{label:'DEPLOYED',icon:'🔵',online:true,selectable:false},offline:{label:'OFFLINE',icon:'⚪',online:false,selectable:false}};
const FORMATIONS={
 balanced:{name:'Balanced',icon:'⚖',desc:'Steady all-round formation.',mods:{algebra:1,geometry:1,trigonometry:1,statistics:1}},
 assault:{name:'Assault',icon:'⚔',desc:'+6% Algebra effect, -2% Geometry effect.',mods:{algebra:1.06,geometry:.98,trigonometry:1,statistics:1}},
 fortress:{name:'Fortress',icon:'🛡',desc:'+6% Geometry effect, -2% Trigonometry effect.',mods:{algebra:1,geometry:1.06,trigonometry:.98,statistics:1}},
 precision:{name:'Precision',icon:'🎯',desc:'+6% Trigonometry effect, -2% Statistics effect.',mods:{algebra:1,geometry:1,trigonometry:1.06,statistics:.98}},
 tactical:{name:'Tactical',icon:'📊',desc:'+6% Statistics effect, -2% Algebra effect.',mods:{algebra:.98,geometry:1,trigonometry:1,statistics:1.06}}
};
const SUBSKILLS={
 algebra:['Simplifying expressions','Fractions','Solving equations','Simultaneous equations','Substitution'],
 geometry:['Straight-line equation','Gradient','Distance between points','Area & perimeter','Surface area & volume'],
 trigonometry:['Trig ratios','Pythagoras','Sine rule','Cosine rule','Triangle area'],
 statistics:['Mean / median / mode','Probability','Quartiles & IQR','Standard deviation','Data displays']
};
let selectedMembers=new Set();
let activeSkill=null,currentQuestion=null,battle=null,pendingEnemy=null,selectedFormation='balanced';


// ===== V1.5.4 Audio engine =====
// Separate supplied MP3s are used for non-battle and battle music. SFX use WebAudio.
// Audio is deliberately isolated from navigation so browser autoplay errors can never block game controls.
const AUDIO_PREF_KEY='mathclans-audio-on';
const AUDIO_VOLUME_KEY='mathclans-audio-volume';
let audioOn=localStorage.getItem(AUDIO_PREF_KEY)!=='0';
let audioVolume=Math.max(0,Math.min(1,Number(localStorage.getItem(AUDIO_VOLUME_KEY) ?? .35)));
if(!Number.isFinite(audioVolume))audioVolume=.35;
let audioCtx=null,musicMode='ambient',masterGain=null;
const ambientTrack=new Audio('assets/non-battle-music.mp3');
const battleTrack=new Audio('assets/battle-music.mp3');
[ambientTrack,battleTrack].forEach(t=>{t.loop=true;t.preload='auto';t.volume=audioVolume});

function ensureAudioContext(){
  try{
    if(!audioOn)return false;
    if(!audioCtx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return false;
      audioCtx=new AC();
      masterGain=audioCtx.createGain();
      masterGain.gain.value=audioVolume;
      masterGain.connect(audioCtx.destination);
    }
    if(audioCtx.state==='suspended'){
      const r=audioCtx.resume();
      if(r&&typeof r.catch==='function')r.catch(()=>{});
    }
    return true;
  }catch(err){
    console.warn('WebAudio unavailable:',err);
    return false;
  }
}
function playAmbient(){
  try{
    if(!audioOn||musicMode!=='ambient')return;
    ambientTrack.volume=audioVolume;
    const p=ambientTrack.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
  }catch(err){console.warn('Ambient music unavailable:',err)}
}
function pauseAmbient(){try{ambientTrack.pause()}catch(err){}}
function safeAudioStart(){
  try{
    if(!audioOn)return;
    ensureAudioContext();
    if(musicMode==='ambient')playAmbient();
    else playBattleMusic();
  }catch(err){console.warn('Audio start skipped:',err)}
}
function tone(freq=440,dur=.12,type='sine',vol=.06,when=0){
  try{
    if(!ensureAudioContext()||!audioCtx||!masterGain)return;
    const t=audioCtx.currentTime+when,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.001,vol),t+.015);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+dur+.03);
  }catch(err){console.warn('Tone skipped:',err)}
}
function noiseHit(vol=.05,dur=.08){
  try{
    if(!ensureAudioContext()||!audioCtx||!masterGain)return;
    const sr=audioCtx.sampleRate,b=audioCtx.createBuffer(1,Math.max(1,Math.floor(sr*dur)),sr),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
    const src=audioCtx.createBufferSource(),g=audioCtx.createGain();src.buffer=b;g.gain.value=vol;src.connect(g);g.connect(masterGain);src.start();
  }catch(err){console.warn('Noise effect skipped:',err)}
}
function playSfx(name){
  if(!audioOn)return;
  try{
    if(name==='march'){tone(110,.18,'triangle',.05);tone(82,.18,'triangle',.045,.2)}
    if(name==='correct'){tone(520,.08,'square',.05);tone(720,.11,'triangle',.045,.07);noiseHit(.025,.05)}
    if(name==='wrong'){tone(170,.18,'sawtooth',.04);tone(120,.22,'triangle',.035,.08)}
    if(name==='critical'){tone(720,.08,'square',.055);tone(960,.12,'triangle',.06,.07);tone(1220,.16,'sine',.05,.14)}
    if(name==='shield'){tone(250,.16,'sine',.04);tone(180,.25,'triangle',.035,.04)}
    if(name==='victory'){[523,659,784,1047].forEach((f,i)=>tone(f,.32,'triangle',.055,i*.13))}
    if(name==='defeat'){[330,294,247,196].forEach((f,i)=>tone(f,.35,'sine',.045,i*.16))}
  }catch(err){console.warn('SFX skipped:',err)}
}
function pauseBattle(){try{battleTrack.pause()}catch(err){}}
function playBattleMusic(){
  try{
    if(!audioOn||musicMode!=='battle')return;
    battleTrack.volume=audioVolume;
    const p=battleTrack.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
  }catch(err){console.warn('Battle music unavailable:',err)}
}
function setMusicMode(mode){
  musicMode=mode;
  if(mode==='battle'){
    pauseAmbient();
    if(audioOn)playBattleMusic();
  }else{
    pauseBattle();
    if(audioOn)playAmbient();
  }
}
function applyAudioVolume(){
  try{
    ambientTrack.volume=audioOn?audioVolume:0;
    battleTrack.volume=audioOn?audioVolume:0;
    if(masterGain&&audioCtx){
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setTargetAtTime(audioOn?audioVolume:0,audioCtx.currentTime,.02);
    }
  }catch(err){console.warn('Volume update skipped:',err)}
  const slider=$('#volumeSlider'),value=$('#volumeValue');
  if(slider)slider.value=Math.round(audioVolume*100);
  if(value)value.textContent=Math.round(audioVolume*100)+'%';
}
function updateAudioButton(){
  const b=$('#audioToggle');
  if(b){
    b.textContent=audioOn?'Sound ON':'Sound OFF';
    b.classList.toggle('off',!audioOn);
    b.setAttribute('aria-pressed',audioOn?'true':'false');
    b.title=audioOn?'Sound is on — click to switch off':'Sound is off — click to switch on';
  }
  applyAudioVolume();
}
function toggleAudio(){
  try{
    audioOn=!audioOn;
    localStorage.setItem(AUDIO_PREF_KEY,audioOn?'1':'0');
    if(audioOn){
      ensureAudioContext();
      applyAudioVolume();
      if(document.body.dataset.screen==='battle'&&battle)setMusicMode('battle');
      else setMusicMode('ambient');
    }else{
      pauseAmbient();
      pauseBattle();
      applyAudioVolume();
    }
  }catch(err){console.warn('Audio toggle skipped:',err)}
  updateAudioButton();
}
function setAudioVolume(value){
  audioVolume=Math.max(0,Math.min(1,Number(value)/100));
  localStorage.setItem(AUDIO_VOLUME_KEY,String(audioVolume));
  applyAudioVolume();
}

function init(){
 if(!document.body.dataset.screen) document.body.dataset.screen='map';
 $('#playerName').textContent=state.player.name;$('#playerLevel').textContent=state.player.level;$('#playerXp').textContent=state.player.xp;$('#crystals').textContent=state.player.crystals;$('#miniAvatar').textContent=state.player.avatar;
 $('#mapClanName').textContent=$('#clanTitle').textContent=$('#clanNameCard').textContent=state.clan.name;$('#clanRating').textContent=state.clan.rating;$('#clanInfluence').textContent=state.clan.influence+'%';$('#memberCount').textContent=members.length;
 renderRivals();renderSkills();renderSkillHud();renderMembers();renderTeamBars();renderPresence();renderHero();renderRanking();wire();
}
function wire(){
 // Navigation runs FIRST. Audio starts afterwards and is fully isolated.
 $$('.bottom-nav button').forEach(b=>b.onclick=()=>{if(!marching)goScreen(b.dataset.screen);safeAudioStart()});
 const at=$('#audioToggle');if(at){at.onclick=e=>{e.preventDefault();e.stopPropagation();toggleAudio()};updateAudioButton()}
 const vs=$('#volumeSlider');if(vs){vs.value=Math.round(audioVolume*100);vs.oninput=e=>setAudioVolume(e.target.value)}
 // No document-wide pointer listener: it could interfere with normal game controls.
 $$('[data-go]').forEach(b=>b.onclick=()=>{goScreen(b.dataset.go);safeAudioStart()});
 $$('.rival-hq').forEach(n=>n.onclick=()=>{openRival(+n.dataset.rival);safeAudioStart()});
 $('#nextQuestionBtn').onclick=()=>{newQuestion(activeSkill);safeAudioStart()};
 $('#findBattleBtn').onclick=()=>{openBattlePicker();safeAudioStart()};
 // Use the form's native submit event for keyboard Enter/Return.
 // This avoids iPad Safari's keydown-before-value-commit behaviour that could require a second press.
 $('#mentalForm').onsubmit=e=>{e.preventDefault();submitMental();safeAudioStart()};
 $('#editClanBtn').onclick=()=>{openClanEditor();safeAudioStart()};
}
function goScreen(name){document.body.dataset.screen=name;if(name==='hero')renderHero();if(name==='clan')renderPresence();setMusicMode(name==='battle'&&battle?'battle':'ambient');$$('.screen').forEach(s=>s.classList.remove('active'));$('#screen-'+name).classList.add('active');$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));window.scrollTo({top:0,left:0,behavior:'instant'});if(name==='battle'&&!battle) openBattlePicker()}
function renderRivals(){
 $('#rivalList').innerHTML=rivals.map((r,i)=>`<div class="rival-item" data-i="${i}"><div class="rival-crest">${r.crest}</div><div><strong>${r.name}</strong><small>${r.region} · ${Math.abs(r.rating-state.clan.rating)} rating gap</small></div><div class="rating-pill">${r.rating}</div></div>`).join('');
 $('#rivalList').querySelectorAll('.rival-item').forEach(el=>el.onclick=()=>openRival(+el.dataset.i));
}
function masteryTitle(level){if(level<10)return 'Apprentice';if(level<25)return 'Solver';if(level<50)return 'Adept';if(level<100)return 'Master';if(level<250)return 'Sage';if(level<500)return 'Grand Sage';if(level<1000)return 'Legend';return 'Mythic '+Math.floor(level/1000)}
function masteryProgress(level){const tier=level<25?10:level<100?25:level<500?50:100;return Math.round((level%tier)/tier*100)}
function softCap(level,max=15,k=95){return max*(1-Math.exp(-level/k))}
function trainingProfile(k){ensureTrainingState();return state.training.skills[k]}
function confidenceLabel(c){return c>=85?'STRONG':c>=70?'STABLE':c>=55?'SHAKY':'REMEDIAL'}
function effectiveLevel(k){const c=trainingProfile(k).confidence;return state.skills[k]*(.70+.30*c/100)}
function effectiveBattleEffect(k){return softCap(effectiveLevel(k))}
function recordTrainingResult(skill,correct){
 const t=trainingProfile(skill);t.recent.push(correct?1:0);t.recent=t.recent.slice(-7);
 let delta=0;
 if(correct){t.wrongStreak=0;delta=t.confidence<70?2:1;t.confidence=Math.min(100,t.confidence+delta)}
 else{t.wrongStreak++;const recentWrong=t.recent.filter(x=>!x).length;delta=t.wrongStreak===1?0:t.wrongStreak===2?-1:t.wrongStreak===3?-2:-3;if(recentWrong>=5&&delta<0)delta-=1;t.confidence=Math.max(30,t.confidence+delta)}
 const recentWrong=t.recent.filter(x=>!x).length;t.remedial=t.confidence<60||recentWrong>=5;if(t.confidence>=70&&recentWrong<=2)t.remedial=false;
 return{delta,confidence:t.confidence,wrongStreak:t.wrongStreak,remedial:t.remedial,recentWrong};
}
function renderSkills(){
 $('#skillGrid').innerHTML=Object.entries(SKILLS).map(([k,s])=>{const t=trainingProfile(k),eff=effectiveBattleEffect(k);return `<div class="skill-card ${activeSkill===k?'selected':''}" data-skill="${k}" style="--skill-color:${s.color}"><div class="skill-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.desc}</p><div class="skill-level"><span>${s.trait} · ${masteryTitle(state.skills[k])}</span><b>Lv ${state.skills[k]}</b></div><div class="skill-progress"><i style="width:${masteryProgress(state.skills[k])}%"></i></div><div class="confidence-row"><span>Confidence ${confidenceLabel(t.confidence)}</span><b>${t.confidence}%</b></div><div class="confidence-meter"><i style="width:${t.confidence}%"></i></div><small class="softcap-note">Effective battle effect ${eff.toFixed(1)}% / 15% soft ceiling${t.remedial?' · Remedial training active':''}</small></div>`}).join('');
 $$('.skill-card').forEach(c=>c.onclick=()=>{activeSkill=c.dataset.skill;renderSkills();newQuestion(activeSkill)});
}
function renderSkillHud(){
 const hud=$('#skillHud');if(!hud)return;
 hud.innerHTML=Object.entries(SKILLS).map(([k,s])=>`<div class="skill-hud-item" style="--skill-color:${s.color}"><div class="skill-hud-icon">${s.icon}</div><div class="skill-hud-copy"><strong>${s.name}</strong><small>${s.trait}</small></div><div class="skill-hud-level">Lv ${state.skills[k]}</div><div class="skill-hud-meter"><i style="width:${masteryProgress(state.skills[k])}%"></i></div></div>`).join('');
}
function renderMembers(){
 $('#memberList').innerHTML=members.map((m,i)=>{const meta=STATUS_META[m.status]||STATUS_META.offline;return `<div class="member ${selectedMembers.has(i)?'selected':''} ${!meta.online?'offline':''} ${!meta.selectable?'locked':''}" data-i="${i}"><div class="member-avatar">${m.avatar}</div><div><strong>${m.name}</strong><small>${SKILLS[m.role].icon} ${SKILLS[m.role].name} specialist</small></div><span class="role-tag status-${m.status}">${meta.icon} ${meta.label}</span></div>`}).join('');
 $$('.member').forEach(el=>el.onclick=()=>{const i=+el.dataset.i,meta=STATUS_META[members[i].status]||STATUS_META.offline;if(!meta.selectable){toast(`${members[i].name} is ${meta.label.toLowerCase()} and cannot deploy.`);return}if(selectedMembers.has(i))selectedMembers.delete(i);else if(selectedMembers.size<10)selectedMembers.add(i);renderMembers();renderTeamBars();renderPresence();});
 const n=selectedMembers.size;$('#selectedCount').textContent=n;$('#armyLabel').textContent=n?`${n} troop${n>1?'s':''} ready`:'Choose 1–10 players';const deploy=$('#findBattleBtn');if(deploy){deploy.disabled=false;deploy.classList.toggle('needs-selection',n<1);deploy.setAttribute('aria-disabled',n<1?'true':'false');deploy.textContent=n?`War Council (${n})`:'Choose Target & March';}
}
function renderPresence(){
 const total=members.length,online=members.filter(m=>STATUS_META[m.status]?.online).length,ready=members.filter(m=>m.status==='ready'||m.status==='online').length,deployed=members.filter(m=>m.status==='deployed').length;
 const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};set('#presenceMembers',total);set('#presenceOnline',online);set('#presenceReady',ready);set('#presenceDeployed',deployed);
}
function renderHero(){
 const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};set('#heroAvatar',state.player.avatar);set('#heroName',state.player.name);set('#heroClanLine',`${state.clan.guardian} ${state.clan.name}`);set('#heroLevel',state.player.level);set('#heroXpText',`${state.player.xp} XP`);
 const xpBar=$('#heroXpBar');if(xpBar)xpBar.style.width=Math.min(100,(state.player.xp%100))+'%';
 const strongest=Object.keys(SKILLS).sort((a,b)=>state.skills[b]-state.skills[a])[0];set('#heroTitleBadge',`${SKILLS[strongest].icon} ${masteryTitle(state.skills[strongest])} ${SKILLS[strongest].name}`);
 const list=$('#heroMasteryList');if(list)list.innerHTML=Object.entries(SKILLS).map(([k,s])=>{const lvl=state.skills[k],subs=SUBSKILLS[k],t=trainingProfile(k),eff=effectiveBattleEffect(k);return `<div class="hero-mastery" style="--skill-color:${s.color}"><div class="hero-mastery-head"><span class="hero-mastery-icon">${s.icon}</span><div><strong>${s.name}</strong><small>${masteryTitle(lvl)} · confidence ${t.confidence}% · effective battle effect ${eff.toFixed(1)}%</small></div><b>Lv ${lvl}</b></div><div class="hero-mastery-meter"><i style="width:${masteryProgress(lvl)}%"></i></div><div class="hero-confidence-line"><span>Recent mastery confidence</span><b>${confidenceLabel(t.confidence)} ${t.confidence}%</b></div><div class="confidence-meter"><i style="width:${t.confidence}%"></i></div><div class="subskill-chips">${subs.map((x,i)=>`<span>${x} <b>Lv ${Math.max(1,lvl-(i*2)%7)}</b></span>`).join('')}</div></div>`}).join('');
 const achievements=$('#achievementList');if(achievements){const total=Object.values(state.skills).reduce((a,b)=>a+b,0);const rows=[['⚔','X-Blade',state.skills.algebra>=25],['🛡','Hex Shield',state.skills.geometry>=25],['🎯','Angle Bow',state.skills.trigonometry>=25],['🔮','Probability Orb',state.skills.statistics>=25],['👑','Scholar Crown',total>=200],['✨','Lion City Aura',state.clan.rating>=1600]];achievements.innerHTML=rows.map(([ic,n,ok])=>`<div class="achievement ${ok?'unlocked':'locked'}"><span>${ok?ic:'🔒'}</span><div><strong>${n}</strong><small>${ok?'Unlocked':'Keep training to unlock'}</small></div></div>`).join('')}
}
function renderTeamBars(){
 const src=selectedMembers.size?[...selectedMembers].map(i=>members[i]):members.filter(m=>STATUS_META[m.status]?.online).slice(0,5);
 const avg=k=>src.length?Math.round(src.reduce((a,m)=>a+m.skills[k],0)/src.length):0;
 $('#teamBars').innerHTML=Object.entries(SKILLS).map(([k,s])=>`<div class="team-bar"><span>${s.icon}</span><div class="track"><i style="width:${avg(k)}%;background:${s.color}"></i></div><b>${avg(k)}</b></div>`).join('');
}
function renderRanking(){
 const rows=[...rivals.map(r=>({...r})),{name:state.clan.name,crest:state.clan.guardian,region:state.clan.region,rating:state.clan.rating,you:true},
 {name:'Hex Heroes',crest:'🐢',region:'Sengkang',rating:1440},{name:'Sigma Squad',crest:'🦉',region:'Bishan',rating:1398}].sort((a,b)=>b.rating-a.rating);
 $('#rankingList').innerHTML=rows.map((r,i)=>`<div class="rank-row ${r.you?'you':''}"><b>#${i+1}</b><strong>${r.crest} ${r.name}${r.you?'<small>Your clan</small>':''}</strong><span>${r.region}</span><b>${r.rating}</b></div>`).join('');
}
function openRival(i){const r=rivals[i];showModal(`<span class="eyebrow">RIVAL HQ</span><h3>${r.crest} ${r.name}</h3><p>${r.region} · Rating ${r.rating}</p><div class="team-bars">${Object.entries(SKILLS).map(([k,s])=>`<div class="team-bar"><span>${s.icon}</span><div class="track"><i style="width:${r.skills[k]}%;background:${s.color}"></i></div><b>${r.skills[k]}</b></div>`).join('')}</div><div class="modal-actions"><button class="secondary" data-close>Close</button><button class="primary" id="attackRival">Prepare Attack</button></div>`); $('[data-close]').onclick=closeModal;$('#attackRival').onclick=()=>{closeModal();goScreen('clan');toast('⚔ Rally 1–10 available members, then deploy.')};}
function openClanEditor(){showModal(`<span class="eyebrow">CLAN SETTINGS</span><h3>Edit clan identity</h3><label>Clan name</label><input id="clanNameInput" value="${state.clan.name}"><label>Home region</label><select id="clanRegionInput">${['Central','Tampines','Sengkang','Jurong','Woodlands','Bedok','Punggol','Bishan'].map(x=>`<option ${x===state.clan.region?'selected':''}>${x}</option>`).join('')}</select><div class="modal-actions"><button class="secondary" data-close>Cancel</button><button class="primary" id="saveClan">Save</button></div>`);$('[data-close]').onclick=closeModal;$('#saveClan').onclick=()=>{state.clan.name=$('#clanNameInput').value.trim()||state.clan.name;state.clan.region=$('#clanRegionInput').value;save();closeModal();init();toast('🏰 Clan identity updated.')};}
function showModal(html){$('#modal').innerHTML=html;$('#modalBackdrop').classList.remove('hidden')}function closeModal(){$('#modalBackdrop').classList.add('hidden')}
function toast(msg){const t=document.createElement('div');t.textContent=msg;Object.assign(t.style,{position:'fixed',zIndex:200,left:'50%',top:'82px',transform:'translateX(-50%)',background:'#25170df2',border:'1px solid #d9b35a',padding:'12px 16px',borderRadius:'14px',boxShadow:'0 15px 45px #0009'});document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}

// ----- Reasoning MCQ generation -----
const fmt=n=>Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
function makeAlgebra(){
 const type=rnd(0,3);
 if(type===0){const a=rnd(2,6),b=rnd(2,8),c=rnd(2,7),d=rnd(1,8);const correct=`${a}(${b}x ${d%2?'+':'−'} ${c}) + ${d}x<br>= ${a*b}x ${d%2?'+':'−'} ${a*c} + ${d}x<br>= ${a*b+d}x ${d%2?'+':'−'} ${a*c}`;return q('Simplifying expressions',`${a}(${b}x ${d%2?'+':'−'} ${c}) + ${d}x`,correct,[`${a*b}x ${d%2?'+':'−'} ${c} + ${d}x<br>= ${a*b+d}x ${d%2?'+':'−'} ${c}`,`${a+b}x ${d%2?'+':'−'} ${a*c+d}x<br>= ${a+b+a*c+d}x`,`${a*b}x ${d%2?'+':'−'} ${a*c+d}<br>= ${a*b}x ${d%2?'+':'−'} ${a*c+d}`],'Distribute the coefficient to every term inside the bracket, then collect only like terms.','ALG-SIM-'+type)}
 if(type===1){const x=rnd(2,12),a=rnd(2,7),b=rnd(1,12),rhs=a*x+b;const correct=`${a}x + ${b} = ${rhs}<br>${a}x = ${rhs} − ${b}<br>${a}x = ${a*x}<br>x = ${x}`;return q('Solving equations',`${a}x + ${b} = ${rhs}`,correct,[`${a}x = ${rhs} + ${b}<br>x = ${fmt((rhs+b)/a)}`,`x + ${b} = ${rhs} − ${a}<br>x = ${rhs-a-b}`,`${a}x = ${rhs} − ${b}<br>x = ${a*x}`],'Use inverse operations on both sides. After isolating the x-term, divide by its coefficient.','ALG-EQ-'+type)}
 if(type===2){const x=rnd(1,7),y=rnd(1,7),a=rnd(1,4),b=rnd(1,4),c=rnd(1,4),d=rnd(1,4),r1=a*x+b*y,r2=c*x-d*y;const correct=`${a}x + ${b}y = ${r1}<br>${c}x − ${d}y = ${r2}<br>Eliminate one variable consistently, then solve the remaining equation.`;return q('Simultaneous equations',`${a}x + ${b}y = ${r1}<br>${c}x − ${d}y = ${r2}`,correct,[`Add the two right sides but subtract the x-terms only.`,`Set ${a}x + ${b}y = ${c}x − ${d}y and ignore the constants.`,`Solve each equation separately as though the other variable were zero.`],'A valid elimination or substitution method must preserve both complete equations.','ALG-SIMUL-'+type)}
 const a=rnd(2,6),b=rnd(-5,5),v=rnd(2,8);return q('Substitution',`Given a = ${v}, find 2a² ${b>=0?'+':'−'} ${Math.abs(b)}.`,`2(${v})² ${b>=0?'+':'−'} ${Math.abs(b)}<br>= 2(${v*v}) ${b>=0?'+':'−'} ${Math.abs(b)}<br>= ${2*v*v+b}`,[`(2×${v})² ${b>=0?'+':'−'} ${Math.abs(b)}<br>= ${(2*v)**2+b}`,`2(${v}×2) ${b>=0?'+':'−'} ${Math.abs(b)}<br>= ${4*v+b}`,`2 + ${v}² ${b>=0?'+':'−'} ${Math.abs(b)}<br>= ${2+v*v+b}`],'Substitute the given value before applying the index and operation order.','ALG-SUB-'+type)};
function makeGeometry(){
 const type=rnd(0,4);
 if(type===0){const x1=rnd(-5,4),x2=x1+rnd(2,7),m=rnd(-4,5)||2,y1=rnd(-6,6),y2=y1+m*(x2-x1);return q('Gradient',`A(${x1}, ${y1}) and B(${x2}, ${y2}). Find the gradient.`,`m = (${y2} − ${y1}) / (${x2} − ${x1})<br>= ${y2-y1} / ${x2-x1}<br>= ${m}`,[`m = (${x2} − ${x1}) / (${y2} − ${y1})<br>= ${fmt(1/m)}`,`m = (${y2} + ${y1}) / (${x2} + ${x1})`,`m = (${y2} − ${x2}) / (${y1} − ${x1})`],'Gradient is change in y divided by change in x, using the same point order in numerator and denominator.','GEO-GRAD-'+type)}
 if(type===1){const m=rnd(-4,5)||3,c=rnd(-6,7);return q('Equation of a straight line',`Gradient = ${m}, y-intercept = ${c}. Find the equation.`,`y = mx + c<br>y = ${m}x ${c>=0?'+':'−'} ${Math.abs(c)}`,[`y = ${c}x ${m>=0?'+':'−'} ${Math.abs(m)}`,`x = ${m}y ${c>=0?'+':'−'} ${Math.abs(c)}`,`y = ${m+c}x`],'Use y = mx + c, where m is the gradient and c is the y-intercept.','GEO-LINE-'+type)}
 if(type===2){const dx=rnd(3,9),dy=rnd(3,9),sq=dx*dx+dy*dy;return q('Distance between 2 points',`The horizontal change is ${dx} and vertical change is ${dy}. Find the distance.`,`d = √(${dx}² + ${dy}²)<br>= √${sq}`,[`d = ${dx} + ${dy} = ${dx+dy}`,`d = √(${dx} + ${dy})`,`d = ${dx}² + ${dy}² = ${sq}`],'The distance formula comes from Pythagoras; square both coordinate differences before adding and square-rooting.','GEO-DIST-'+type)}
 if(type===3){const l=rnd(6,15),w=rnd(3,9);return q('Area & perimeter',`A rectangle has length ${l} cm and width ${w} cm. Find its area.`,`Area = length × width<br>= ${l} × ${w}<br>= ${l*w} cm²`,[`Area = 2(${l}+${w}) = ${2*(l+w)} cm²`,`Area = ${l}+${w} = ${l+w} cm²`,`Area = (${l}×${w})÷2 = ${l*w/2} cm²`],'Area of a rectangle is length × width. Perimeter uses 2(l+w).','GEO-AREA-'+type)}
 const r=rnd(2,7),h=rnd(5,14);return q('Surface area & volume',`Cylinder radius = ${r} cm, height = ${h} cm. Find its volume in terms of π.`,`V = πr²h<br>= π(${r})²(${h})<br>= ${r*r*h}π cm³`,[`V = 2πrh = ${2*r*h}π cm³`,`V = πrh = ${r*h}π cm³`,`V = πr² + h = ${r*r+h}π cm³`],'Cylinder volume is base area πr² multiplied by height.','GEO-VOL-'+type)};
function makeTrig(){
 const type=rnd(0,4);
 if(type===0){const triples=[[3,4,5],[5,12,13],[8,15,17]],t=triples[rnd(0,2)],o=t[0],a=t[1],h=t[2];return q('Trig ratios',`For angle θ: opposite = ${o}, adjacent = ${a}, hypotenuse = ${h}. Find sin θ.`,`sin θ = opposite / hypotenuse<br>= ${o}/${h}`,[`sin θ = adjacent / hypotenuse<br>= ${a}/${h}`,`sin θ = opposite / adjacent<br>= ${o}/${a}`,`sin θ = hypotenuse / opposite<br>= ${h}/${o}`],'Sine uses opposite over hypotenuse (SOH).','TRIG-RATIO-'+type)}
 if(type===1){const a=rnd(5,12),b=rnd(5,12),c2=a*a+b*b;return q('Pythagoras theorem',`A right triangle has shorter sides ${a} cm and ${b} cm. Find the hypotenuse.`,`c² = ${a}² + ${b}²<br>c = √${c2}`,[`c = ${a}+${b} = ${a+b}`,`c² = ${a}² − ${b}²`,`c = √(${a}+${b})`],'For a right triangle, the hypotenuse satisfies c² = a² + b².','TRIG-PYTH-'+type)}
 if(type===2){return q('Sine rule',`In triangle ABC, a/sin A = b/sin B. Which setup correctly finds b?`,`b / sin B = a / sin A<br>b = a sin B / sin A`,[`b = a sin A / sin B`,`b = a cos B / cos A`,`b = a + sin B − sin A`],'Match each side with its opposite angle when using the sine rule.','TRIG-SINE-'+type)}
 if(type===3){return q('Cosine rule',`Sides a and b and included angle C are known. Which method finds side c?`,`c² = a² + b² − 2ab cos C<br>c = √(a² + b² − 2ab cos C)`,[`c² = a² + b² + 2ab cos C`,`c = a + b − 2ab cos C`,`c² = a² − b² − 2ab sin C`],'For the side opposite the included angle C, use the cosine rule with −2ab cos C.','TRIG-COS-'+type)}
 const a=rnd(5,12),b=rnd(6,14),ang=[30,45,60][rnd(0,2)];return q('Area of non-right triangle',`Two sides are ${a} cm and ${b} cm with included angle ${ang}°. Which setup gives the area?`,`Area = ½ab sin C<br>= ½(${a})(${b}) sin ${ang}°`,[`Area = ab cos C`,`Area = ½ab cos C`,`Area = a² + b² − 2ab cos C`],'For two sides and their included angle, area = ½ab sin C.','TRIG-AREA-'+type)};
function makeStats(){
 const type=rnd(0,5);
 if(type===0){const vals=shuffle([4,6,7,7,11]);const sum=vals.reduce((a,b)=>a+b,0);return q('Mean, median & mode',`Find the mean of: ${vals.join(', ')}`,`Mean = sum of values / number of values<br>= ${sum}/5<br>= ${fmt(sum/5)}`,[`Mean = (${Math.min(...vals)}+${Math.max(...vals)})/2`,`Mean = 7 because 7 occurs most often`,`Mean = ${Math.max(...vals)-Math.min(...vals)} because that is the range`],'The mean is the total of all observations divided by the number of observations.','STAT-MEAN-'+type)}
 if(type===1){const fav=rnd(2,8),total=fav+rnd(3,9);return q('Probability',`${fav} of ${total} equally likely outcomes are favourable. Find the probability.`,`P = favourable / total<br>= ${fav}/${total}`,[`P = ${total}/${fav}`,`P = ${fav}/${total-fav}`,`P = ${fav}+${total}`],'Probability = number of favourable outcomes divided by total equally likely outcomes.','STAT-PROB-'+type)}
 if(type===2){const data=[2,5,7,9,12,15,18];return q('Quartiles & IQR',`For 2, 5, 7, 9, 12, 15, 18, which working finds the IQR correctly?`,`Q₁ = 5, Q₃ = 15<br>IQR = Q₃ − Q₁<br>= 10`,[`IQR = 18 − 2 = 16`,`IQR = 15 + 5 = 20`,`IQR = 9 − 5 = 4`],'Interquartile range measures the middle 50%: Q3 − Q1.','STAT-IQR-'+type)}
 if(type===3){return q('Standard deviation',`Which statement correctly describes standard deviation?`,`It measures how spread out values are around the mean. A larger standard deviation means greater spread.`,[`It is always equal to the range.`,`It gives the most frequent value in a dataset.`,`A larger standard deviation means the data are more tightly clustered.`],'Standard deviation is a measure of spread around the mean.','STAT-SD-'+type)}
 if(type===4){const f=rnd(12,30),w=rnd(3,8);return q('Histogram',`A class has frequency ${f} and class width ${w}. Which setup gives frequency density?`,`Frequency density = frequency / class width<br>= ${f}/${w}`,[`Frequency density = ${f}×${w}`,`Frequency density = ${f}+${w}`,`Frequency density = class width / frequency<br>= ${w}/${f}`],'For a histogram with unequal class widths, frequency density = frequency ÷ class width.','STAT-HIST-'+type)}
 return q('Cumulative frequency',`Which working correctly finds the interquartile range from a cumulative frequency graph?`,`Read Q₁ at 25% and Q₃ at 75% of total frequency, then calculate Q₃ − Q₁.`,[`Read the maximum and minimum values, then add them.`,`Read only the median at 50% and double it.`,`Subtract total frequency from the upper quartile.`],'Quartiles occur at 25%, 50% and 75% of cumulative frequency; IQR = Q3 − Q1.','STAT-CF-'+type)};
function q(topic,problem,correct,wrong,explanation,dna){const opts=shuffle([{html:correct,correct:true},...wrong.map(x=>({html:x,correct:false}))]);return{topic,problem,opts,explanation,dna:dna+'-'+rnd(1,9999)}}
function makeRemedial(skill){
 if(skill==='algebra'){const x=rnd(2,9),a=rnd(2,5),b=rnd(1,8),rhs=a*x+b;return q('Remedial · Solving equations',`${a}x + ${b} = ${rhs}`,`${a}x = ${rhs} − ${b}<br>${a}x = ${a*x}<br>x = ${x}`,[`${a}x = ${rhs} + ${b}<br>x = ${fmt((rhs+b)/a)}`,`x = ${rhs} − ${b}<br>x = ${a*x}`,`${a}x = ${rhs} − ${b}<br>x = ${rhs}`],'Use inverse operations first, then divide by the coefficient of x.','REM-ALG')}
 if(skill==='geometry'){const x1=rnd(0,4),y1=rnd(0,4),m=rnd(1,4),dx=rnd(2,5),x2=x1+dx,y2=y1+m*dx;return q('Remedial · Gradient',`Find the gradient through (${x1}, ${y1}) and (${x2}, ${y2}).`,`m = (${y2} − ${y1}) / (${x2} − ${x1})<br>= ${y2-y1}/${x2-x1}<br>= ${m}`,[`m = (${x2} − ${x1}) / (${y2} − ${y1})`,`m = (${y2} + ${y1}) / (${x2} + ${x1})`,`m = ${y2-y1}+${x2-x1}`],'Gradient is change in y divided by change in x.','REM-GEO')}
 if(skill==='trigonometry'){const triples=[[3,4,5],[5,12,13],[8,15,17]],t=triples[rnd(0,2)];return q('Remedial · Trig ratios',`For angle θ: opposite = ${t[0]}, adjacent = ${t[1]}, hypotenuse = ${t[2]}. Find sin θ.`,`sin θ = opposite / hypotenuse<br>= ${t[0]}/${t[2]}`,[`sin θ = ${t[1]}/${t[2]}`,`sin θ = ${t[0]}/${t[1]}`,`sin θ = ${t[2]}/${t[0]}`],'Remember SOH: sine = opposite ÷ hypotenuse.','REM-TRIG')}
 const vals=[3,5,7,9,11],sum=vals.reduce((a,b)=>a+b,0);return q('Remedial · Mean',`Find the mean of ${vals.join(', ')}.`,`Mean = ${sum}/5<br>= ${sum/5}`,[`Mean = 7 because it is the middle value`,`Mean = 11 − 3 = 8`,`Mean = ${sum}/4`],'Mean = total of the values ÷ number of values.','REM-STAT')
}
function generateQuestion(skill){let maker={algebra:makeAlgebra,geometry:makeGeometry,trigonometry:makeTrig,statistics:makeStats}[skill],attempt=0,qv;const t=trainingProfile(skill);if(t.remedial&&Math.random()<.7)maker=()=>makeRemedial(skill);do{qv=maker();attempt++}while(state.history.includes(qv.dna)&&attempt<12);return qv}
function newQuestion(skill){currentQuestion=generateQuestion(skill);$('#trainingEmpty').classList.add('hidden');$('#questionPanel').classList.remove('hidden');$('#qSkill').textContent=`${SKILLS[skill].icon} ${SKILLS[skill].name.toUpperCase()}`;$('#qTitle').textContent=currentQuestion.topic;const t=trainingProfile(skill);$('#qDifficulty').textContent=t.remedial?'REMEDIAL':['COMMON','SKILLED','ADVANCED'][rnd(0,2)];$('#qProblem').innerHTML=currentQuestion.problem;$('#workedOptions').innerHTML=currentQuestion.opts.map((o,i)=>`<div class="worked-option" data-i="${i}"><span class="option-letter">${'ABCD'[i]}</span><div class="math-lines">${o.html}</div></div>`).join('');$('#feedback').classList.add('hidden');$('#nextQuestionBtn').classList.add('hidden');$$('.worked-option').forEach(el=>el.onclick=()=>answerQuestion(+el.dataset.i));}
function answerQuestion(i){const chosen=currentQuestion.opts[i],correctIndex=currentQuestion.opts.findIndex(o=>o.correct);$$('.worked-option').forEach((el,j)=>{el.classList.add('disabled');if(j===correctIndex)el.classList.add('correct');else if(j===i&&!chosen.correct)el.classList.add('wrong');el.onclick=null});const result=recordTrainingResult(activeSkill,chosen.correct);if(chosen.correct){state.streak++;state.player.xp+=8;state.player.level=1+Math.floor(state.player.xp/100);state.skills[activeSkill]=state.skills[activeSkill]+1;state.player.crystals+=2;$('#feedback').innerHTML=`<strong>✅ Correct reasoning</strong><br>${currentQuestion.explanation}<br><br>${SKILLS[activeSkill].icon} ${SKILLS[activeSkill].name} Mastery +1 · Confidence +${result.delta} → ${result.confidence}% · 💎 +2${result.remedial?'<br><small>Remedial support remains active until your recent accuracy recovers.</small>':''}`;}else{state.streak=0;const deduction=result.delta<0?` · Confidence ${result.delta} → ${result.confidence}%`:' · No confidence deduction on the first mistake';$('#feedback').innerHTML=`<strong>❌ Study the highlighted correct working</strong><br>${currentQuestion.explanation}<br><br>${SKILLS[activeSkill].icon} ${SKILLS[activeSkill].name}${deduction}${result.remedial?'<br><strong>📘 Remedial training activated:</strong> the next questions will more often reinforce the core method.':''}`;}state.history.push(currentQuestion.dna);state.history=state.history.slice(-100);$('#trainStreak').textContent=state.streak;$('#feedback').classList.remove('hidden');$('#nextQuestionBtn').classList.remove('hidden');save();init();activeSkill=activeSkill;renderSkills();}

// ----- Clan clash -----
function openBattlePicker(){
 if(selectedMembers.size<1){goScreen('clan');toast('Select 1 available member to march.');return}
 showModal(`<span class="eyebrow">WAR COUNCIL · STEP 1</span><h3>Choose a target</h3><p>Your army has <b>${selectedMembers.size}</b> troop${selectedMembers.size>1?'s':''}. Select the rival headquarters you want to attack.</p>${rivals.map((r,i)=>`<div class="rival-item battle-pick" data-i="${i}"><div class="rival-crest">${r.crest}</div><div><strong>${r.name}</strong><small>${r.region} · Rating ${r.rating}</small></div><div class="rating-pill">SELECT</div></div>`).join('')}<div class="modal-actions"><button class="secondary" data-close>Cancel</button></div>`);
 $('[data-close]').onclick=closeModal;$$('.battle-pick').forEach(el=>el.onclick=()=>{pendingEnemy=+el.dataset.i;openWarCouncil(pendingEnemy)});
}
function openWarCouncil(i){
 const enemy=rivals[i],team=[...selectedMembers].map(x=>members[x]),avg=k=>Math.round(team.reduce((a,m)=>a+m.skills[k],0)/team.length);
 showModal(`<span class="eyebrow">WAR COUNCIL · STEP 2</span><h3>${state.clan.guardian} ${state.clan.name} → ${enemy.crest} ${enemy.name}</h3><p>Choose a formation before your ${team.length}-troop army marches to ${enemy.region}. Formation bonuses are deliberately small so live Maths performance remains decisive.</p><div class="war-team-preview">${team.map(m=>`<div><span>${m.avatar}</span><small>${m.name}</small></div>`).join('')}</div><div class="war-stat-grid">${Object.entries(SKILLS).map(([k,s])=>`<div><span>${s.icon} ${s.name}</span><b>${avg(k)}</b></div>`).join('')}</div><div class="formation-picker">${Object.entries(FORMATIONS).map(([k,f])=>`<button type="button" class="formation-card ${selectedFormation===k?'selected':''}" data-formation="${k}"><span>${f.icon}</span><strong>${f.name}</strong><small>${f.desc}</small></button>`).join('')}</div><div class="modal-actions"><button class="secondary" id="warBack">Back</button><button class="primary" id="confirmMarch">Deploy ${team.length} Troop${team.length>1?'s':''}</button></div>`);
 $('#warBack').onclick=openBattlePicker;$$('.formation-card').forEach(b=>b.onclick=()=>{selectedFormation=b.dataset.formation;openWarCouncil(i)});$('#confirmMarch').onclick=()=>{closeModal();marchToRival(i)};
}
function marchToRival(i){
 if(marching)return;
 marching=true;setMusicMode('ambient');playSfx('march');
 const enemy=rivals[i],coord=RIVAL_COORDS[i],path=$('#routePath'),army=$('#marchingArmy'),hud=$('#marchHud');
 goScreen('map');
 const midX=(HOME_COORD.x+coord.x)/2,curveY=Math.min(HOME_COORD.y,coord.y)-90;
 path.setAttribute('d',`M${HOME_COORD.x} ${HOME_COORD.y} Q${midX} ${curveY} ${coord.x} ${coord.y}`);
 army.innerHTML=[...selectedMembers].map((_,idx)=>`<g class="troop-token" transform="translate(${(idx%5)*14-28} ${Math.floor(idx/5)*16})"><circle class="troop-dot" r="10"/><text y="6">${members[[...selectedMembers][idx]].avatar}</text></g>`).join('');
 army.classList.remove('hidden');hud.classList.remove('hidden');$('#marchTarget').textContent=`${enemy.name} · ${enemy.region}`;$('#marchTroops').textContent=selectedMembers.size;
 const total=path.getTotalLength(),duration=6000,start=performance.now();let lastSec=6;
 function frame(now){const t=Math.min(1,(now-start)/duration),ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,pt=path.getPointAtLength(total*ease),pt2=path.getPointAtLength(Math.min(total,total*ease+3)),ang=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;army.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${ang})`);const sec=Math.max(0,Math.ceil((duration-(now-start))/1000));if(sec!==lastSec){lastSec=sec;$('#marchEta').textContent=sec}if(t<1)requestAnimationFrame(frame);else{setTimeout(()=>{army.classList.add('hidden');hud.classList.add('hidden');marching=false;startBattle(enemy)},500)}}
 requestAnimationFrame(frame);
}
function startBattle(enemy){
 const selectedIdx=[...selectedMembers];selectedIdx.forEach(i=>members[i].status='deployed');renderMembers();renderPresence();
 const team=selectedIdx.map(i=>members[i]);const n=team.length;const avg=k=>Math.round(team.reduce((a,m)=>a+m.skills[k],0)/n);battle={enemy,team,selectedIdx,formation:selectedFormation,maxHp:10000,ourHp:10000,enemyHp:10000,seconds:90,asked:0,correct:0,combo:0,started:Date.now(),question:null,lastQAt:Date.now(),teamPowerSamples:[],skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,avg(k)]))};
 setMusicMode('battle');$('#battleOurClan').textContent=state.clan.name;$('#battleEnemyClan').textContent=enemy.name;$('#ourFormation').innerHTML=team.map(m=>`<span class="unit">${m.avatar}</span>`).join('');$('#enemyFormation').innerHTML=team.map((_,i)=>`<span class="unit">${['🐙','🐺','🦇','🐗','🦂','🦅','🐯','🦈','🐍','🦁'][i]}</span>`).join('');$('#battleTeamSize').textContent=`${n}v${n}`;const bf=$('#battleFormation');if(bf)bf.textContent=`${FORMATIONS[selectedFormation].icon} ${FORMATIONS[selectedFormation].name}`;$('#battleSkillRunes').innerHTML=Object.entries(SKILLS).map(([k,s])=>`<div class="rune">${s.icon} ${s.name}<b>${battle.skills[k]}</b></div>`).join('');goScreen('battle');nextMental();updateBattleUi();$('#mentalAnswer').value='';$('#mentalAnswer').focus();battle.timer=setInterval(tickBattle,1000);
}
function mentalQ(){let a=rnd(8,90),b=rnd(2,35),op=['+','−','×'][rnd(0,2)],ans;if(op==='+')ans=a+b;else if(op==='−'){if(b>a)[a,b]=[b,a];ans=a-b}else{a=rnd(2,15);b=rnd(2,12);ans=a*b}return{text:`${a} ${op} ${b}`,ans}}
function nextMental(){if(!battle)return;battle.question=mentalQ();battle.lastQAt=Date.now();$('#mentalQuestion').textContent=battle.question.text;const a=$('#mentalAnswer');a.value='';setTimeout(()=>{try{a.focus({preventScroll:true})}catch(e){a.focus()}},30)}
function teammateWaveScore(member){
 const mastery=(member.skills.algebra+member.skills.geometry+member.skills.trigonometry+member.skills.statistics)/4;
 const correctChance=Math.min(.97,.68+mastery/420);const correct=Math.random()<correctChance;if(!correct)return 0;
 const simulatedTime=Math.max(1.4,5.5-mastery/32+(Math.random()-.5)*1.8);
 return Math.round(100+Math.max(0,40-(simulatedTime-1.5)*10));
}
function submitMental(){
 if(!battle||battle.ended)return;const val=Number($('#mentalAnswer').value);if(!Number.isFinite(val))return;
 const elapsed=(Date.now()-battle.lastQAt)/1000;battle.asked++;
 const playerCorrect=val===battle.question.ans;let playerScore=0;
 if(playerCorrect){battle.correct++;battle.combo++;playerScore=Math.round(100+Math.max(0,40-(elapsed-1.5)*10));playSfx('correct')}else{battle.combo=0;playSfx('wrong')}
 const mateScores=battle.team.slice(1).map(teammateWaveScore);const teamScores=[playerScore,...mateScores];const teamAvg=teamScores.reduce((a,b)=>a+b,0)/teamScores.length;
 battle.teamPowerSamples.push(teamAvg);if(battle.teamPowerSamples.length>30)battle.teamPowerSamples.shift();
 const troopBonus=1+Math.min(.05,(battle.team.length-1)*.005);
 const fm=FORMATIONS[battle.formation]?.mods||FORMATIONS.balanced.mods;
 const alg=1+softCap(battle.skills.algebra*fm.algebra, .10,95); // formation gently modifies mastery effect
 const trig=playerCorrect&&elapsed<3?1+softCap(battle.skills.trigonometry*fm.trigonometry,.06,110):1;
 let tactical=1;if(Math.random()<Math.min(.05,softCap(battle.skills.statistics*fm.statistics,.05,120))){tactical=1.35;effect('📊 CRITICAL OUTLIER!');playSfx('critical')}
 const enemyBlock=1-softCap(battle.enemy.skills.geometry,.10,100);
 if(playerCorrect||teamAvg>70){const power=(teamAvg/140)*760*troopBonus*alg*trig*tactical;const dmg=Math.max(1,Math.round(power*enemyBlock));battle.enemyHp=Math.max(0,battle.enemyHp-dmg);if(tactical===1)effect(`⚔ TEAM STRIKE ${dmg}`)}
 else{const enemyWave=95+Math.random()*25;const ourBlock=1-softCap(battle.skills.geometry*fm.geometry,.10,100);const enemyDmg=Math.round((enemyWave/140)*620*ourBlock);battle.ourHp=Math.max(0,battle.ourHp-enemyDmg);effect(`🛡 ENEMY COUNTER ${enemyDmg}`);playSfx('shield')}
 updateBattleUi();if(battle.enemyHp<=0||battle.ourHp<=0)return endBattle();nextMental();$('#mentalAnswer').focus()
}
function tickBattle(){if(!battle||battle.ended)return;battle.seconds--;$('#battleTimer').textContent=battle.seconds;if(battle.seconds<=0)endBattle();else if(Math.random()<.22){const dmg=Math.round(180*(1-battle.skills.geometry/1500));battle.ourHp=Math.max(0,battle.ourHp-dmg);updateBattleUi();if(battle.ourHp<=0)endBattle()}}
function updateBattleUi(){if(!battle)return;$('#ourHpBar').style.width=(battle.ourHp/battle.maxHp*100)+'%';$('#enemyHpBar').style.width=(battle.enemyHp/battle.maxHp*100)+'%';$('#ourHpText').textContent=`${battle.ourHp} HP`;$('#enemyHpText').textContent=`${battle.enemyHp} HP`;$('#battleAccuracy').textContent=(battle.asked?Math.round(battle.correct/battle.asked*100):100)+'%';$('#battleCombo').textContent=battle.combo;const a=battle.teamPowerSamples?.length?Math.round(battle.teamPowerSamples.reduce((x,y)=>x+y,0)/battle.teamPowerSamples.length):0;$('#battleTeamAvg').textContent=a}
function effect(t){$('#battleEffects').innerHTML=`<div class="effect-text">${t}</div>`}
function endBattle(){if(!battle||battle.ended)return;battle.ended=true;clearInterval(battle.timer);(battle.selectedIdx||[]).forEach(i=>members[i].status='ready');selectedMembers.clear();renderMembers();renderPresence();const win=battle.enemyHp<battle.ourHp;const delta=win?rnd(18,28):-rnd(12,20);state.clan.rating=Math.max(1000,state.clan.rating+delta);if(win){state.player.crystals+=80;state.clan.influence=Math.min(100,state.clan.influence+2)}save();renderRanking();$('#clanRating').textContent=state.clan.rating;effect(win?'🏆 VICTORY!':'💥 DEFEAT');playSfx(win?'victory':'defeat');setMusicMode('ambient');showModal(`<span class="eyebrow">CLAN CLASH RESULT</span><h3>${win?'🏆 Victory':'🛡 Defeat'}</h3><p>${state.clan.name} vs ${battle.enemy.name} · ${FORMATIONS[battle.formation]?.icon||'⚖'} ${FORMATIONS[battle.formation]?.name||'Balanced'} Formation</p><div class="clan-stats"><div><span>Accuracy</span><b>${battle.asked?Math.round(battle.correct/battle.asked*100):0}%</b></div><div><span>Rating</span><b>${delta>0?'+':''}${delta}</b></div><div><span>Crystals</span><b>${win?'+80':'0'}</b></div></div><p>Your Algebra, Geometry, Trigonometry and Statistics mastery did <b>not</b> decrease. Only clan rating changes after a loss.</p><div class="modal-actions"><button class="primary" id="returnMap">Return to Map</button></div>`);$('#returnMap').onclick=()=>{closeModal();battle=null;goScreen('map');init()}}

init();
