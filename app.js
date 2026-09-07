const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

const SKILLS={
 algebra:{name:'Algebra',icon:'⚔',color:'#ff8d62',trait:'Attack',desc:'Expressions, equations, simultaneous equations & substitution'},
 geometry:{name:'Geometry',icon:'🛡',color:'#5ef0a4',trait:'Defence',desc:'Straight lines, gradient, distance, area, perimeter, surface area & volume'},
 trigonometry:{name:'Trigonometry',icon:'🎯',color:'#60e9ff',trait:'Precision',desc:'Trig ratios, Pythagoras, sine rule, cosine rule & triangle area'},
 statistics:{name:'Statistics',icon:'📊',color:'#b18cff',trait:'Tactics',desc:'Averages, probability, quartiles, SD & data displays'}
};
const defaultState={player:{name:'Player One',avatar:'🐲',level:1,xp:0,crystals:250,clanId:null,clanRole:null},clan:{name:'Merlion Scholars',guardian:'🐉',region:'Central',rating:1500,influence:18,memberCount:10},skills:{algebra:8,geometry:7,trigonometry:6,statistics:7},history:[],streak:0,training:{skills:{}}};
let state=JSON.parse(localStorage.getItem('mathclans-v1')||'null')||structuredClone(defaultState);
function ensureTrainingState(){
 state.training=state.training||{skills:{}};state.training.skills=state.training.skills||{};
 Object.keys(SKILLS).forEach(k=>{const t=state.training.skills[k]||{};state.training.skills[k]={confidence:Number.isFinite(t.confidence)?Math.max(30,Math.min(100,t.confidence)):85,wrongStreak:Number.isFinite(t.wrongStreak)?Math.max(0,t.wrongStreak):0,recent:Array.isArray(t.recent)?t.recent.slice(-7):[],remedial:!!t.remedial,questionHistory:Array.isArray(t.questionHistory)?t.questionHistory.slice(-80):[],subskills:(t.subskills&&typeof t.subskills==='object')?t.subskills:{}};});
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
let pendingWarSelection=[];
let activeSkill=null,currentQuestion=null,battle=null,pendingEnemy=null,selectedFormation='balanced';
window.MathClansGame={
  setMembers(list){
    // Preserve a player's current war selection across live Firebase roster/presence refreshes.
    // V1.7.1 used to clear selectedMembers on every realtime update, which could make
    // War Council suddenly show 0 troops / NaN stats and leave its buttons ineffective.
    const selectedKeys=[...selectedMembers].map(i=>{const m=members[i];return m?(m.uid?`uid:${m.uid}`:`fallback:${m.name}|${m.avatar}`):null}).filter(Boolean);
    members.splice(0,members.length,...(list||[]));
    selectedMembers.clear();
    selectedKeys.forEach(key=>{
      const idx=members.findIndex(m=>key.startsWith('uid:')?`uid:${m.uid}`===key:`fallback:${m.name}|${m.avatar}`===key);
      if(idx>=0 && STATUS_META[members[idx].status]?.selectable)selectedMembers.add(idx);
    });
    renderMembers();renderPresence();renderTeamBars();
  },
  setClan(clan){if(!clan)return;state.clan={...state.clan,...clan};if(Number.isFinite(clan.memberCount))state.clan.memberCount=clan.memberCount;save();init();},
  setPlayerClan(clanId,role){state.player.clanId=clanId||null;state.player.clanRole=role||null;save();},
  refresh(){init();},
  toast(msg){toast(msg)},
  markBattleParticipantLeft(uid){if(!battle||battle.ended||!uid)return;battle.forfeitUids=battle.forfeitUids||new Set();battle.forfeitUids.add(uid);effect(`⚠ ${members.find(m=>m.uid===uid)?.name||'Player'} disconnected · 0 points`);updateBattleUi();},
  localMembers:members
};



// ===== V1.7.1 first-login guide / reusable How to Play =====
function showHowToPlay(firstTime=false){
 showModal(`<span class="eyebrow">${firstTime?'WELCOME TO MATHCLANS':'HOW TO PLAY'}</span><h3>${firstTime?'Your first mission':'Battle for Lion City'}</h3><p>Train Maths abilities, join a clan, rally willing members and win Clan Clashes through accurate mental Maths.</p><div class="onboarding-steps"><div class="onboarding-step"><span>📚</span><div><strong>1. Train your four abilities</strong><small>Algebra = Attack, Geometry = Defence, Trigonometry = Precision, Statistics = Tactics. Questions become harder as your ability rises and recent repeats are avoided.</small></div></div><div class="onboarding-step"><span>🧠</span><div><strong>2. Read the working carefully</strong><small>Every MCQ has four worked solutions. Wrong solutions imitate common student errors, so judge the mathematics rather than the length of the working.</small></div></div><div class="onboarding-step"><span>🏰</span><div><strong>3. Join or create a clan</strong><small>Clans hold up to 30 members. Online, War Ready and Deployed statuses are live.</small></div></div><div class="onboarding-step"><span>⚔</span><div><strong>4. Rally for War</strong><small>Leaders/officers may invite 1–10 members. Invitees have up to 20 seconds to Accept or Reject. The rally closes early when everyone responds.</small></div></div><div class="onboarding-step"><span>➕</span><div><strong>5. Win with mental Maths</strong><small>Battle is driven mainly by rapid-sum accuracy and speed. Long-term abilities and formation give smaller RPG bonuses. Leaving after battle begins counts as 0 for that player and still affects the team average.</small></div></div></div><div class="modal-actions"><button class="primary" id="howToPlayClose">${firstTime?'Enter Lion City':'Close'}</button></div>`);
 setTimeout(()=>{const b=$('#howToPlayClose');if(b)b.onclick=closeModal},0);
}
const helpBtn=$('#helpBtn');if(helpBtn)helpBtn.onclick=()=>showHowToPlay(false);
window.MathClansGameHelp={show:showHowToPlay};

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
function openClanEditor(){if(window.MathClansClans?.isLiveClan?.()){window.MathClansClans.openSettings();return}showModal(`<span class="eyebrow">CLAN SETTINGS</span><h3>Edit clan identity</h3><label>Clan name</label><input id="clanNameInput" value="${state.clan.name}"><label>Home region</label><select id="clanRegionInput">${['Central','Tampines','Sengkang','Jurong','Woodlands','Bedok','Punggol','Bishan'].map(x=>`<option ${x===state.clan.region?'selected':''}>${x}</option>`).join('')}</select><div class="modal-actions"><button class="secondary" data-close>Cancel</button><button class="primary" id="saveClan">Save</button></div>`);$('[data-close]').onclick=closeModal;$('#saveClan').onclick=()=>{state.clan.name=$('#clanNameInput').value.trim()||state.clan.name;state.clan.region=$('#clanRegionInput').value;save();closeModal();init();toast('🏰 Clan identity updated.')};}
function showModal(html){$('#modal').innerHTML=html;$('#modalBackdrop').classList.remove('hidden')}function closeModal(){$('#modalBackdrop').classList.add('hidden')}
function toast(msg){const t=document.createElement('div');t.textContent=msg;Object.assign(t.style,{position:'fixed',zIndex:200,left:'50%',top:'82px',transform:'translateX(-50%)',background:'#25170df2',border:'1px solid #d9b35a',padding:'12px 16px',borderRadius:'14px',boxShadow:'0 15px 45px #0009'});document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}

// ----- V1.7 adaptive, non-repetitive reasoning MCQ engine -----
const fmt=n=>Number.isInteger(n)?String(n):Number(n).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1};
const frac=(n,d)=>{const g=gcd(n,d);n/=g;d/=g;return d===1?String(n):`${n}/${d}`};
const signed=n=>n>=0?`+ ${n}`:`− ${Math.abs(n)}`;
const skillTier=skill=>{const lv=Number(state.skills[skill]||1);return lv<=10?1:lv<=25?2:lv<=50?3:lv<=100?4:5};
const difficultyName=t=>['','FOUNDATION','SKILLED','ADVANCED','ELITE','MASTER'][t]||'MASTER';
const difficultyXP=t=>[0,6,8,11,14,18][t]||18;
function chooseTier(skill){const base=skillTier(skill),r=Math.random();if(r<.25)return Math.max(1,base-1);if(r>.85)return Math.min(5,base+1);return base}
function workedLines(html,subskill,index){
 const raw=String(html||'');
 const lines=raw.split('<br>').filter(Boolean);
 if(lines.length>=3)return raw;
 const openers={
  algebra:['Rearrange or simplify the expression shown.','Apply the operation to the terms involved.','Continue using the chosen algebraic rule.'],
  geometry:['Identify the required formula or relationship.','Substitute the given measurements consistently.','Continue from the chosen geometric relationship.'],
  trigonometry:['Identify the sides/angles relative to the question.','Choose the trig relationship used here.','Substitute into the selected relationship.'],
  statistics:['Identify the required statistic or probability.','Use the relevant values from the data.','Continue with the selected calculation.']
 };
 const skillKey=activeSkill||'algebra',lead=(openers[skillKey]||openers.algebra)[index%3];
 if(lines.length===2)return `<span class="step-note">${lead}</span><br>${raw}`;
 return `<span class="step-note">${lead}</span><br>${raw}<br><span class="step-note">Therefore use the result obtained above.</span>`;
}
function adaptiveQ(topic,problem,correct,wrong,explanation,structureKey,valueKey,subskill,tier){
 const all=[{html:workedLines(correct,subskill,0),correct:true,misconception:null},...wrong.slice(0,3).map((x,i)=>({html:workedLines(x,subskill,i+1),correct:false,misconception:['sign / inverse-operation error','formula or substitution error','incomplete / invalid simplification'][i]}))];
 const opts=shuffle(all);
 return{topic,problem,opts,explanation,structureKey,valueKey,subskill,tier,difficultyLabel:difficultyName(tier),dna:valueKey};
}
function rememberQuestion(skill,qv){const t=trainingProfile(skill);t.questionHistory=t.questionHistory||[];t.questionHistory.push({valueKey:qv.valueKey,structureKey:qv.structureKey,subskill:qv.subskill});t.questionHistory=t.questionHistory.slice(-80)}
function recentlySeen(skill,qv){const h=trainingProfile(skill).questionHistory||[];if(h.some(x=>x.valueKey===qv.valueKey))return true;const recent=h.slice(-10);return recent.filter(x=>x.structureKey===qv.structureKey).length>=2}
function subskillRecord(skill,name,correct){const t=trainingProfile(skill);t.subskills=t.subskills||{};const r=t.subskills[name]||{attempts:0,correct:0};r.attempts++;if(correct)r.correct++;t.subskills[name]=r}
function weakestSubskill(skill){const t=trainingProfile(skill),defs=SUBSKILLS[skill]||[];let pick=null,best=2;for(const n of defs){const r=t.subskills?.[n];if(!r||r.attempts<3)continue;const a=r.correct/r.attempts;if(a<best){best=a;pick=n}}return best<.7?pick:null}
function pickSubskill(skill){const defs=SUBSKILLS[skill]||[];const weak=weakestSubskill(skill);if(weak&&Math.random()<.38)return weak;return defs[rnd(0,defs.length-1)]}

function makeAlgebraV(tier,forced){const sub=forced||pickSubskill('algebra');
 if(sub==='Simplifying expressions'){
  if(tier<=2){const a=rnd(2,9),b=rnd(2,9),c=rnd(1,12);return adaptiveQ(sub,`${a}x + ${b}x − ${c}`,`${a}x + ${b}x − ${c}<br>= ${a+b}x − ${c}`,[`${a}x + ${b}x − ${c}<br>= ${a+b-c}x<br>∴ ${a+b-c}x`,`${a}x + ${b}x − ${c}<br>= ${a*b}x − ${c}<br>∴ ${a*b}x − ${c}`,`${a}x + ${b}x − ${c}<br>= ${a+b}x<br>∴ constant ${c} is dropped`],'Only like x-terms combine; the constant remains separate.','ALG-SIMP-LIKE',`ALG-SIMP-${a}-${b}-${c}`,sub,tier)}
  if(tier===3){const a=rnd(2,7),b=rnd(2,6),c=rnd(1,9),d=rnd(1,8);return adaptiveQ(sub,`${a}(${b}x − ${c}) + ${d}x`,`${a*b}x − ${a*c} + ${d}x<br>= ${a*b+d}x − ${a*c}`,[`${a}(${b}x − ${c}) + ${d}x<br>= ${a*b}x − ${c} + ${d}x<br>= ${a*b+d}x − ${c}`,`${a}(${b}x − ${c}) + ${d}x<br>= ${a+b}x − ${a*c} + ${d}x<br>= ${a+b+d}x − ${a*c}`,`${a}(${b}x − ${c}) + ${d}x<br>= ${a*b}x − ${c} + ${d}x<br>= ${a*b+d}x − ${c}`],'Expand every term in the bracket before collecting like terms.','ALG-SIMP-BRACKET',`ALG-BR-${a}-${b}-${c}-${d}`,sub,tier)}
  const d1=[2,3,4,5,6][rnd(0,4)],d2=[3,4,5,6,8][rnd(0,4)],a=rnd(1,7),b=rnd(1,7),L=d1*d2/gcd(d1,d2),n=a*(L/d1)+b*(L/d2);return adaptiveQ(sub,`Simplify: ${a}x/${d1} + ${b}x/${d2}`,`LCM = ${L}<br>= ${a*(L/d1)}x/${L} + ${b*(L/d2)}x/${L}<br>= ${frac(n,L)}x`,[`= ${(a+b)}x/${d1+d2}`,`= ${frac(a+b,L)}x`,`= ${frac(a*b,L)}x`],'Use a common denominator before adding fractional algebraic terms.','ALG-SIMP-FRAC',`ALG-FR-${a}-${d1}-${b}-${d2}`,sub,tier)}
 if(sub==='Fractions'){
  const x=rnd(2,12),d=rnd(2,7),a=rnd(1,6),b=rnd(1,9),rhs=(a*x+b)/d;if(Number.isInteger(rhs))return adaptiveQ('Equations with fractions',`(${a}x + ${b})/${d} = ${rhs}`,`${a}x + ${b} = ${rhs*d}<br>${a}x = ${rhs*d-b}<br>x = ${x}`,[`${a}x + ${b} = ${rhs+d}<br>x = ${fmt((rhs+d-b)/a)}`,`${a}x = ${rhs*d+b}<br>x = ${fmt((rhs*d+b)/a)}`,`x = ${rhs*d-b}`],'Multiply the whole equation by the denominator, then isolate x.','ALG-EQ-FRAC',`ALG-EQF-${a}-${b}-${d}-${x}`,sub,tier);return makeAlgebraV(tier,sub)
 }
 if(sub==='Solving equations'){
  const x=rnd(-8,14),a=rnd(2,8),b=rnd(-12,12);
  if(tier<=2){const rhs=a*x+b;return adaptiveQ(sub,`${a}x ${signed(b)} = ${rhs}`,`${a}x = ${rhs} ${b>=0?'−':'+'} ${Math.abs(b)}<br>${a}x = ${a*x}<br>x = ${x}`,[`${a}x = ${rhs} ${b>=0?'+':'−'} ${Math.abs(b)}`,`x = ${rhs-b}`,`x = ${fmt(rhs/a-b)}`],'Undo addition/subtraction first, then divide by the coefficient.','ALG-EQ-1SIDE',`ALG-E1-${a}-${b}-${x}`,sub,tier)}
  const c=rnd(1,7),d=rnd(-10,10);let aa=a;if(aa===c)aa++;const rhs=(aa-c)*x+b-d;return adaptiveQ(sub,`${aa}x ${signed(b)} = ${c}x ${signed(d+rhs)}`,`${aa-c}x = ${d+rhs-b}<br>x = ${x}`,[`${aa+c}x = ${d+rhs-b}<br>x = ${fmt((d+rhs-b)/(aa+c))}`,`${aa-c}x = ${d+rhs+b}<br>x = ${fmt((d+rhs+b)/(aa-c))}`,`x = ${d+rhs-b}`],'Move x-terms to one side and constants to the other while preserving signs.','ALG-EQ-2SIDES',`ALG-E2-${aa}-${b}-${c}-${d+rhs}-${x}`,sub,tier)}
 if(sub==='Simultaneous equations'){
  const x=rnd(-5,8),y=rnd(-5,8),a=rnd(1,5),b=rnd(1,5),c=rnd(1,5),d=rnd(1,5),r1=a*x+b*y,r2=c*x-d*y;const mult=tier>=4?rnd(2,4):1;return adaptiveQ(sub,`${a}x + ${b}y = ${r1}<br>${c}x − ${d}y = ${r2}`,`Use elimination/substitution on the complete equations.<br>Solving gives x = ${x}, y = ${y}.`,[`Add only the constants and ignore one variable.`,`Set ${a}x + ${b}y = ${c}x − ${d}y and discard ${r1}, ${r2}.`,`Assume y = 0 in both equations, then solve x.`],'Both equations must remain equivalent at every elimination or substitution step.','ALG-SIMUL',`ALG-SYS-${a}-${b}-${r1}-${c}-${d}-${r2}-${mult}`,sub,tier)}
 const a=rnd(-6,8),b=rnd(-5,7),p=rnd(2,5),q=rnd(-7,7);return adaptiveQ('Substitution',`Given a = ${a}, b = ${b}, find ${p}a² ${signed(q)} b.`,`${p}(${a})² ${signed(q)}(${b})<br>= ${p*a*a + q*b}`,[`${p*a}² ${signed(q*b)} = ${p*a*p*a+q*b}`,`${p}(${a}×2) ${signed(q*b)} = ${2*p*a+q*b}`,`${p+a*a+q*b}`],'Substitute the values first, then follow order of operations.','ALG-SUB',`ALG-SUB-${a}-${b}-${p}-${q}`,sub,tier)
}
function makeGeometryV(tier,forced){const sub=forced||pickSubskill('geometry');
 if(sub==='Gradient'){const x1=rnd(-8,5),dx=rnd(2,9),m=tier>=3?([-3,-2,-1,1,2,3][rnd(0,5)]):rnd(1,5),x2=x1+dx,y1=rnd(-8,8),y2=y1+m*dx;return adaptiveQ(sub,`A(${x1}, ${y1}), B(${x2}, ${y2}). Find the gradient.`,`m = (${y2} − ${y1}) / (${x2} − ${x1})<br>= ${y2-y1}/${dx}<br>= ${m}`,[`m = ${dx}/${y2-y1} = ${fmt(1/m)}`,`m = (${y2}+${y1})/(${x2}+${x1})`,`m = (${y2}−${x2})/(${y1}−${x1})`],'Gradient is change in y divided by change in x, with consistent point order.','GEO-GRAD',`GEO-GR-${x1}-${y1}-${x2}-${y2}`,sub,tier)}
 if(sub==='Straight-line equation'){const m=rnd(-5,6)||2,c=rnd(-9,9);if(tier<=2)return adaptiveQ(sub,`Gradient = ${m}, y-intercept = ${c}.`, `y = mx + c<br>y = ${m}x ${signed(c)}`,[`y = ${c}x ${signed(m)}`,`x = ${m}y ${signed(c)}`,`y = ${m+c}x`],'Use y = mx + c.','GEO-LINE-MC',`GEO-LM-${m}-${c}`,sub,tier);const x=rnd(-5,5),y=m*x+c;return adaptiveQ(sub,`Line has gradient ${m} and passes through (${x}, ${y}).`,`y − ${y} = ${m}(x − ${x})<br>y = ${m}x ${signed(c)}`,[`y = ${x}x ${signed(y)}`,`y − ${x} = ${m}(x − ${y})`,`y = ${m}x ${signed(y)}`],'Use point-slope form or substitute the point into y = mx + c.','GEO-LINE-POINT',`GEO-LP-${m}-${x}-${y}`,sub,tier)}
 if(sub==='Distance between points'){const dx=rnd(2,12),dy=rnd(2,12),sq=dx*dx+dy*dy;return adaptiveQ(sub,`Horizontal change = ${dx}, vertical change = ${dy}. Find the distance.`,`d = √(${dx}² + ${dy}²)<br>= √${sq}${Number.isInteger(Math.sqrt(sq))?`<br>= ${Math.sqrt(sq)}`:''}`,[`d = ${dx}+${dy} = ${dx+dy}`,`d = √(${dx}+${dy})`,`d = √(${Math.abs(dx*dx-dy*dy)})`],'Distance between points uses Pythagoras on horizontal and vertical changes.','GEO-DIST',`GEO-D-${dx}-${dy}`,sub,tier)}
 if(sub==='Area & perimeter'){const shape=['rectangle','triangle','trapezium'][Math.min(2,tier-1+rnd(0,1))];if(shape==='rectangle'){const l=rnd(4,18),w=rnd(3,14);return adaptiveQ(sub,`Rectangle: length ${l} cm, width ${w} cm. Find area.`,`A = l×w<br>= ${l}×${w}<br>= ${l*w} cm²`,[`A = 2(${l}+${w}) = ${2*(l+w)} cm²`,`A = ${l}+${w} = ${l+w} cm²`,`A = ${l}²+${w}²`],'Area uses length × width; perimeter uses 2(l+w).','GEO-AREA-RECT',`GEO-AR-${l}-${w}`,sub,tier)}if(shape==='triangle'){const b=rnd(5,20),h=rnd(4,16);return adaptiveQ(sub,`Triangle: base ${b} cm, perpendicular height ${h} cm.`,`A = ½bh<br>= ½(${b})(${h})<br>= ${b*h/2} cm²`,[`A = bh = ${b*h} cm²`,`A = ½(${b}+${h})`,`A = 2(${b}+${h})`],'Use the perpendicular height in A = ½bh.','GEO-AREA-TRI',`GEO-AT-${b}-${h}`,sub,tier)}const a=rnd(4,13),b=rnd(6,18),h=rnd(3,12);return adaptiveQ(sub,`Trapezium: parallel sides ${a} cm and ${b} cm, height ${h} cm.`,`A = ½(${a}+${b})(${h})<br>= ${(a+b)*h/2} cm²`,[`A = (${a}+${b})${h} = ${(a+b)*h}`,`A = ½(${a}×${b})${h}`,`A = ${a}+${b}+${h}`],'Average the two parallel sides, then multiply by perpendicular height.','GEO-AREA-TRAP',`GEO-AZ-${a}-${b}-${h}`,sub,tier)}
 const solid=tier<=2?'cuboid':(Math.random()<.5?'cylinder':'cuboid');if(solid==='cuboid'){const l=rnd(3,12),w=rnd(2,10),h=rnd(2,11);return adaptiveQ(sub,`Cuboid: ${l} cm × ${w} cm × ${h} cm. Find volume.`,`V = lwh<br>= ${l}×${w}×${h}<br>= ${l*w*h} cm³`,[`V = 2(lw+lh+wh) = ${2*(l*w+l*h+w*h)} cm³`,`V = ${l+w+h} cm³`,`V = ${l*w} cm³`],'Volume is the product of the three perpendicular dimensions.','GEO-VOL-CUB',`GEO-VC-${l}-${w}-${h}`,sub,tier)}const r=rnd(2,8),h=rnd(4,15);return adaptiveQ(sub,`Cylinder: radius ${r} cm, height ${h} cm. Find volume in terms of π.`,`V = πr²h<br>= π(${r})²(${h})<br>= ${r*r*h}π cm³`,[`V = 2πrh = ${2*r*h}π`,`V = πrh = ${r*h}π`,`V = πr² = ${r*r}π`],'Cylinder volume is πr²h; do not use circumference or surface-area formulae.','GEO-VOL-CYL',`GEO-CY-${r}-${h}`,sub,tier)
}
function makeTrigV(tier,forced){const sub=forced||pickSubskill('trigonometry');
 if(sub==='Trig ratios'){const triples=[[3,4,5],[5,12,13],[8,15,17],[7,24,25]],T=triples[rnd(0,triples.length-1)],o=T[0],a=T[1],h=T[2],fn=['sin','cos','tan'][rnd(0,2)],correct=fn==='sin'?frac(o,h):fn==='cos'?frac(a,h):frac(o,a);return adaptiveQ(sub,`Right triangle relative to θ: opposite ${o}, adjacent ${a}, hypotenuse ${h}. Find ${fn} θ.`,`${fn} θ = ${fn==='sin'?'opposite/hypotenuse':fn==='cos'?'adjacent/hypotenuse':'opposite/adjacent'}<br>= ${correct}`,[`${frac(a,h)}`,`${frac(o,a)}`,`${frac(h,o)}`],'Match the requested ratio to SOH–CAH–TOA.','TRIG-RATIO',`TRIG-R-${fn}-${o}-${a}-${h}`,sub,tier)}
 if(sub==='Pythagoras'){const a=rnd(3,15),b=rnd(4,18),sq=a*a+b*b;return adaptiveQ(sub,`Right triangle legs are ${a} cm and ${b} cm. Find the hypotenuse.`,`c² = ${a}² + ${b}²<br>c = √${sq}${Number.isInteger(Math.sqrt(sq))?` = ${Math.sqrt(sq)}`:''}`,[`c = ${a+b}`,`c = √${Math.abs(a*a-b*b)}`,`c² = ${a}+${b}`],'The hypotenuse is opposite the right angle and satisfies c²=a²+b².','TRIG-PYTH',`TRIG-P-${a}-${b}`,sub,tier)}
 if(sub==='Sine rule'){const A=rnd(25,70),a=rnd(5,18),B=rnd(25,80);return adaptiveQ(sub,`In triangle ABC, a=${a}, A=${A}°, B=${B}°. Which setup correctly finds b?`,`b/sin ${B}° = ${a}/sin ${A}°<br>b = ${a}·sin ${B}°/sin ${A}°`,[`b/sin ${A}° = ${a}/sin ${B}°`,`b = ${a}·sin ${A}°/sin ${B}°`,`b = ${a}·cos ${B}°/cos ${A}°`],'Pair each side with its opposite angle in the sine rule.','TRIG-SINE',`TRIG-S-${a}-${A}-${B}`,sub,tier)}
 if(sub==='Cosine rule'){const a=rnd(5,14),b=rnd(5,14),C=rnd(35,120);return adaptiveQ(sub,`Two sides are ${a} cm and ${b} cm with included angle ${C}°. Find opposite side c.`,`c² = ${a}² + ${b}² − 2(${a})(${b})cos ${C}°`,[`c² = ${a}² + ${b}² + 2(${a})(${b})cos ${C}°`,`c = ${a}+${b}−2cos ${C}°`,`c² = ${a}² − ${b}² − 2(${a})(${b})cos ${C}°`],'For two sides and the included angle, use c²=a²+b²−2ab cos C.','TRIG-COS',`TRIG-C-${a}-${b}-${C}`,sub,tier)}
 const a=rnd(5,16),b=rnd(6,18),C=rnd(25,135);return adaptiveQ('Triangle area',`Two sides are ${a} cm and ${b} cm with included angle ${C}°.`,`A = ½ab sin C<br>= ½(${a})(${b})sin ${C}°`,[`A = ab sin C`,`A = ½ab cos C`,`A = ½(a+b)sin C`],'For a non-right triangle with two sides and included angle, use ½ab sin C.','TRIG-AREA',`TRIG-A-${a}-${b}-${C}`,sub,tier)
}
function median(arr){arr=[...arr].sort((a,b)=>a-b);const n=arr.length;return n%2?arr[(n-1)/2]:(arr[n/2-1]+arr[n/2])/2}
function quartiles(arr){arr=[...arr].sort((a,b)=>a-b);const mid=Math.floor(arr.length/2),lo=arr.slice(0,mid),hi=arr.slice(arr.length%2?mid+1:mid);return[median(lo),median(arr),median(hi)]}
function makeStatsV(tier,forced){const sub=forced||pickSubskill('statistics');
 if(sub==='Mean / median / mode'){const vals=Array.from({length:tier>=3?7:5},()=>rnd(2,18));if(Math.random()<.5){const sum=vals.reduce((a,b)=>a+b,0);return adaptiveQ(sub,`Data: ${vals.join(', ')}. Find the mean.`,`Mean = (${vals.join(' + ')})/${vals.length}<br>= ${fmt(sum/vals.length)}`,[`Mean = ${fmt(sum/(vals.length-1))}`,`Mean = ${median(vals)}`,`Mean = ${Math.max(...vals)-Math.min(...vals)}`],'Mean is total of all values divided by number of values.','STAT-MEAN',`STAT-M-${vals.join('-')}`,sub,tier)}const med=median(vals);return adaptiveQ(sub,`Data: ${vals.join(', ')}. Find the median.`,`Order the data first.<br>Middle value = ${med}`,[`Median = ${fmt(vals.reduce((a,b)=>a+b,0)/vals.length)}`,`Median = ${Math.max(...vals)-Math.min(...vals)}`,`Median = ${vals[0]}`],'Median is the middle value after ordering the data.','STAT-MED',`STAT-D-${vals.join('-')}`,sub,tier)}
 if(sub==='Probability'){const red=rnd(2,12),blue=rnd(2,12),green=tier>=3?rnd(1,8):0,total=red+blue+green;return adaptiveQ(sub,`Bag: ${red} red, ${blue} blue${green?`, ${green} green`:''}. Find P(red).`,`P(red) = ${red}/${total}<br>= ${frac(red,total)}`,[`P(red) = ${red}/${blue}`,`P(red) = ${total}/${red}`,`P(red) = ${blue}/${total}`],'Probability = favourable outcomes ÷ total equally likely outcomes.','STAT-PROB',`STAT-P-${red}-${blue}-${green}`,sub,tier)}
 if(sub==='Quartiles & IQR'){let vals=Array.from({length:9},()=>rnd(1,30)).sort((a,b)=>a-b);const [q1,med,q3]=quartiles(vals),iqr=q3-q1;return adaptiveQ(sub,`Ordered data: ${vals.join(', ')}. Find the IQR.`,`Q1 = ${q1}, Q3 = ${q3}<br>IQR = ${q3} − ${q1} = ${iqr}`,[`IQR = ${Math.max(...vals)-Math.min(...vals)}`,`IQR = Q1+Q3 = ${q1+q3}`,`IQR = ${med}`],'IQR is upper quartile minus lower quartile.','STAT-IQR',`STAT-I-${vals.join('-')}`,sub,tier)}
 if(sub==='Standard deviation'){const vals=Array.from({length:5},()=>rnd(1,12)),mu=vals.reduce((a,b)=>a+b,0)/vals.length,variance=vals.reduce((a,b)=>a+(b-mu)**2,0)/vals.length,sd=Math.sqrt(variance);return adaptiveQ(sub,`Population data: ${vals.join(', ')}. Which setup is correct for σ?`,`μ = ${fmt(mu)}<br>σ = √[Σ(x−μ)²/${vals.length}]<br>≈ ${fmt(sd)}`,[`σ = Σ|x−μ|/${vals.length}`,`σ = √[Σ(x−μ)/${vals.length}]`,`σ = Σx/${vals.length}`],'Population standard deviation uses squared deviations from the mean, averaged, then square-rooted.','STAT-SD',`STAT-SD-${vals.join('-')}`,sub,tier)}
 const cats=['A','B','C','D'],freq=cats.map(()=>rnd(2,15)),total=freq.reduce((a,b)=>a+b,0),idx=rnd(0,3),angle=360*freq[idx]/total;const table=`<table class="mini-data"><tr>${cats.map(c=>`<th>${c}</th>`).join('')}</tr><tr>${freq.map(f=>`<td>${f}</td>`).join('')}</tr></table>`;return adaptiveQ('Data displays',`${table}For a pie chart, find the sector angle for ${cats[idx]}.`,`Angle = ${freq[idx]}/${total} × 360°<br>= ${fmt(angle)}°`,[`Angle = ${freq[idx]}×360°`,`Angle = ${total}/${freq[idx]}×360°`,`Angle = ${freq[idx]}/${total}×100°`],'Pie-chart sector angle is category frequency divided by total frequency, multiplied by 360°.','STAT-PIE',`STAT-PIE-${freq.join('-')}-${idx}`,sub,tier)
}
function makeAdaptiveQuestion(skill,tier,forced){return({algebra:makeAlgebraV,geometry:makeGeometryV,trigonometry:makeTrigV,statistics:makeStatsV}[skill])(tier,forced)}
function makeRemedial(skill){const weak=weakestSubskill(skill);return makeAdaptiveQuestion(skill,1,weak||SUBSKILLS[skill][0])}
function generateQuestion(skill){const t=trainingProfile(skill);for(let attempt=0;attempt<50;attempt++){const qv=t.remedial&&Math.random()<.7?makeRemedial(skill):makeAdaptiveQuestion(skill,chooseTier(skill));if(!recentlySeen(skill,qv))return qv}return makeAdaptiveQuestion(skill,chooseTier(skill))}
function newQuestion(skill){currentQuestion=generateQuestion(skill);$('#trainingEmpty').classList.add('hidden');$('#questionPanel').classList.remove('hidden');$('#qSkill').textContent=`${SKILLS[skill].icon} ${SKILLS[skill].name.toUpperCase()}`;$('#qTitle').textContent=currentQuestion.topic;const t=trainingProfile(skill);$('#qDifficulty').textContent=t.remedial?'REMEDIAL':currentQuestion.difficultyLabel;$('#qProblem').innerHTML=currentQuestion.problem;$('#workedOptions').innerHTML=currentQuestion.opts.map((o,i)=>`<div class="worked-option" data-i="${i}"><span class="option-letter">${'ABCD'[i]}</span><div class="math-lines">${o.html}</div></div>`).join('');$('#feedback').classList.add('hidden');$('#nextQuestionBtn').classList.add('hidden');$$('.worked-option').forEach(el=>el.onclick=()=>answerQuestion(+el.dataset.i));}
function answerQuestion(i){const chosen=currentQuestion.opts[i],correctIndex=currentQuestion.opts.findIndex(o=>o.correct);$$('.worked-option').forEach((el,j)=>{el.classList.add('disabled');if(j===correctIndex)el.classList.add('correct');else if(j===i&&!chosen.correct)el.classList.add('wrong');el.onclick=null});const result=recordTrainingResult(activeSkill,chosen.correct);subskillRecord(activeSkill,currentQuestion.subskill,chosen.correct);rememberQuestion(activeSkill,currentQuestion);if(chosen.correct){state.streak++;const xp=difficultyXP(currentQuestion.tier),crystals=Math.max(2,currentQuestion.tier);state.player.xp+=xp;state.player.level=1+Math.floor(state.player.xp/100);state.skills[activeSkill]+=1;state.player.crystals+=crystals;$('#feedback').innerHTML=`<strong>✅ Correct reasoning</strong><br>${currentQuestion.explanation}<br><br>${SKILLS[activeSkill].icon} ${currentQuestion.subskill} · ${currentQuestion.difficultyLabel} · Mastery +1 · XP +${xp} · Confidence +${result.delta} → ${result.confidence}% · 💎 +${crystals}`;}else{state.streak=0;const deduction=result.delta<0?` · Confidence ${result.delta} → ${result.confidence}%`:' · No confidence deduction on the first mistake';$('#feedback').innerHTML=`<strong>❌ Study the highlighted correct working</strong><br>${currentQuestion.explanation}<br><br>${SKILLS[activeSkill].icon} ${currentQuestion.subskill}${deduction}${result.remedial?'<br><strong>📘 Remedial training:</strong> upcoming questions will target weaker subskills at a simpler level.':''}`;}state.history.push(currentQuestion.valueKey);state.history=state.history.slice(-100);$('#trainStreak').textContent=state.streak;$('#feedback').classList.remove('hidden');$('#nextQuestionBtn').classList.remove('hidden');save();init();renderSkills();if(window.MathClansOnline?.sync)window.MathClansOnline.sync(false);}

// ----- Clan clash -----
function openBattlePicker(){
 if(window.MathClansClans?.isOnlineMode?.()&&!window.MathClansClans?.isLiveClan?.()){toast('Join or create an online clan before deploying.');return}
 const selectedEntries=[...selectedMembers].map(idx=>({idx,member:members[idx]})).filter(x=>x.member);
 if(selectedEntries.length<1){goScreen('clan');toast('Select 1 available member to march.');return}
 // Freeze the chosen roster for the whole War Council flow. Realtime Firebase roster refreshes
 // may reorder/replace the members array while the modal is open, but they must not erase the army.
 pendingWarSelection=selectedEntries.map(({idx,member})=>({idx,uid:member.uid||null,member:{...member,skills:{...(member.skills||{})}}}));
 const n=pendingWarSelection.length;
 showModal(`<span class="eyebrow">WAR COUNCIL · STEP 1</span><h3>Choose a target</h3><p>Your army has <b>${n}</b> troop${n>1?'s':''}. Select the rival headquarters you want to attack.</p>${rivals.map((r,i)=>`<div class="rival-item battle-pick" data-i="${i}"><div class="rival-crest">${r.crest}</div><div><strong>${r.name}</strong><small>${r.region} · Rating ${r.rating}</small></div><div class="rating-pill">SELECT</div></div>`).join('')}<div class="modal-actions"><button class="secondary" data-close>Cancel</button></div>`);
 $('[data-close]').onclick=()=>{pendingWarSelection=[];closeModal()};$$('.battle-pick').forEach(el=>el.onclick=()=>{pendingEnemy=+el.dataset.i;openWarCouncil(pendingEnemy)});
}
function openWarCouncil(i){
 const enemy=rivals[i];
 const selectedEntries=(pendingWarSelection||[]).map(x=>({idx:x.idx,uid:x.uid,member:x.member})).filter(x=>x.member);
 const team=selectedEntries.map(x=>x.member);
 if(!enemy||team.length<1){closeModal();goScreen('clan');toast('Your selected roster changed. Select 1 available member again.');return}
 const avg=k=>Math.round(team.reduce((a,m)=>a+(Number(m?.skills?.[k])||0),0)/team.length);
 showModal(`<span class="eyebrow">WAR COUNCIL · STEP 2</span><h3>${state.clan.guardian} ${state.clan.name} → ${enemy.crest} ${enemy.name}</h3><p>Choose a formation before your ${team.length}-troop army marches to ${enemy.region}. Formation bonuses are deliberately small so live Maths performance remains decisive.</p><div class="war-team-preview">${team.map(m=>`<div><span>${m.avatar}</span><small>${m.name}</small></div>`).join('')}</div><div class="war-stat-grid">${Object.entries(SKILLS).map(([k,s])=>`<div><span>${s.icon} ${s.name}</span><b>${avg(k)}</b></div>`).join('')}</div><div class="formation-picker">${Object.entries(FORMATIONS).map(([k,f])=>`<button type="button" class="formation-card ${selectedFormation===k?'selected':''}" data-formation="${k}"><span>${f.icon}</span><strong>${f.name}</strong><small>${f.desc}</small></button>`).join('')}</div><div class="modal-actions"><button type="button" class="secondary" id="warBack">Back</button><button type="button" class="primary" id="confirmMarch">Deploy ${team.length} Troop${team.length>1?'s':''}</button></div>`);
 $('#warBack').onclick=()=>{closeModal();if(pendingWarSelection.length){const n=pendingWarSelection.length;showModal(`<span class="eyebrow">WAR COUNCIL · STEP 1</span><h3>Choose a target</h3><p>Your army has <b>${n}</b> troop${n>1?'s':''}. Select the rival headquarters you want to attack.</p>${rivals.map((r,j)=>`<div class="rival-item battle-pick" data-i="${j}"><div class="rival-crest">${r.crest}</div><div><strong>${r.name}</strong><small>${r.region} · Rating ${r.rating}</small></div><div class="rating-pill">SELECT</div></div>`).join('')}<div class="modal-actions"><button class="secondary" data-close>Cancel</button></div>`);$('[data-close]').onclick=()=>{pendingWarSelection=[];closeModal()};$$('.battle-pick').forEach(el=>el.onclick=()=>{pendingEnemy=+el.dataset.i;openWarCouncil(pendingEnemy)});}else goScreen('clan')};
 $$('.formation-card').forEach(b=>b.onclick=()=>{selectedFormation=b.dataset.formation;openWarCouncil(i)});
 $('#confirmMarch').onclick=()=>{
   const rallySelection=selectedEntries.map(({idx,member})=>({idx,...member}));
   if(window.MathClansClans?.startRally && window.MathClansClans?.isLiveClan?.()){
     window.MathClansClans.startRally(rallySelection,i,(acceptedIdx)=>{
       if(!acceptedIdx.length){closeModal();goScreen('clan');toast('No members accepted the rally.');return}
       // Remap accepted members by UID in case a realtime roster refresh changed array indexes.
       const acceptedEntries=selectedEntries.filter(x=>acceptedIdx.includes(x.idx));
       const remapped=acceptedEntries.map(x=>x.member.uid?members.findIndex(m=>m.uid===x.member.uid):x.idx).filter(idx=>idx>=0);
       pendingWarSelection=[];
       if(!remapped.length){closeModal();goScreen('clan');toast('The accepted roster changed. Please rally again.');return}
       selectedMembers=new Set(remapped);closeModal();marchToRival(i);
     });
   }else{pendingWarSelection=[];closeModal();marchToRival(i)}
 };
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
 const team=selectedIdx.map(i=>members[i]);const n=team.length;const avg=k=>Math.round(team.reduce((a,m)=>a+m.skills[k],0)/n);battle={enemy,team,selectedIdx,formation:selectedFormation,maxHp:10000,ourHp:10000,enemyHp:10000,seconds:90,asked:0,correct:0,combo:0,started:Date.now(),question:null,lastQAt:Date.now(),teamPowerSamples:[],forfeitUids:new Set(),skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,avg(k)]))};
 setMusicMode('battle');$('#battleOurClan').textContent=state.clan.name;$('#battleEnemyClan').textContent=enemy.name;$('#ourFormation').innerHTML=team.map(m=>`<span class="unit">${m.avatar}</span>`).join('');$('#enemyFormation').innerHTML=team.map((_,i)=>`<span class="unit">${['🐙','🐺','🦇','🐗','🦂','🦅','🐯','🦈','🐍','🦁'][i]}</span>`).join('');$('#battleTeamSize').textContent=`${n}v${n}`;const bf=$('#battleFormation');if(bf)bf.textContent=`${FORMATIONS[selectedFormation].icon} ${FORMATIONS[selectedFormation].name}`;$('#battleSkillRunes').innerHTML=Object.entries(SKILLS).map(([k,s])=>`<div class="rune">${s.icon} ${s.name}<b>${battle.skills[k]}</b></div>`).join('');goScreen('battle');nextMental();updateBattleUi();$('#mentalAnswer').value='';$('#mentalAnswer').focus();battle.timer=setInterval(tickBattle,1000);
}
function mentalQ(){let a=rnd(8,90),b=rnd(2,35),op=['+','−','×'][rnd(0,2)],ans;if(op==='+')ans=a+b;else if(op==='−'){if(b>a)[a,b]=[b,a];ans=a-b}else{a=rnd(2,15);b=rnd(2,12);ans=a*b}return{text:`${a} ${op} ${b}`,ans}}
function nextMental(){if(!battle)return;battle.question=mentalQ();battle.lastQAt=Date.now();$('#mentalQuestion').textContent=battle.question.text;const a=$('#mentalAnswer');a.value='';setTimeout(()=>{try{a.focus({preventScroll:true})}catch(e){a.focus()}},30)}
function teammateWaveScore(member){
 if(battle?.forfeitUids?.has(member.uid))return 0;
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
