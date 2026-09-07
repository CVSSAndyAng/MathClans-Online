/* MathClans V1.7 Online Foundation
   - Google/Firebase Authentication
   - persistent player profile in Firestore
   - Realtime Database presence
   - automatic periodic progress sync
   - safe Local Demo fallback when Firebase is not configured
*/
(() => {
  'use strict';

  const $o = (q) => document.querySelector(q);
  const cfg = window.MATHCLANS_FIREBASE_CONFIG || {};
  const configured = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId && cfg.databaseURL);
  const allowedDomain = String(window.MATHCLANS_ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase();

  const ui = {
    btn: $o('#accountBtn'),
    dot: $o('#accountDot'),
    text: $o('#accountText')
  };

  let app = null;
  let auth = null;
  let db = null;
  let rtdb = null;
  let user = null;
  let profileUnsub = null;
  let syncTimer = null;
  let syncBusy = false;
  let lastCloudStamp = 0;

  function accountLabel(text, mode) {
    if (ui.text) ui.text.textContent = text;
    if (ui.dot) ui.dot.className = `account-dot ${mode || 'demo'}`;
  }

  function modal(html) {
    if (typeof showModal === 'function') showModal(html);
  }

  function currentProgressPayload() {
    return {
      displayName: state?.player?.name || user?.displayName || 'Mathling',
      avatar: state?.player?.avatar || '🐲',
      level: Number(state?.player?.level || 1),
      xp: Number(state?.player?.xp || 0),
      crystals: Number(state?.player?.crystals || 0),
      skills: structuredClone(state?.skills || {}),
      training: structuredClone(state?.training || {}),
      clanId: state?.player?.clanId || null,
      clanRole: state?.player?.clanRole || null,
      updatedAtMs: Date.now(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function applyCloudPlayer(data) {
    if (!data || !window.state) return;
    if (data.displayName) state.player.name = data.displayName;
    if (data.avatar) state.player.avatar = data.avatar;
    if (Number.isFinite(data.level)) state.player.level = data.level;
    if (Number.isFinite(data.xp)) state.player.xp = data.xp;
    if (Number.isFinite(data.crystals)) state.player.crystals = data.crystals;
    if (data.skills && typeof data.skills === 'object') state.skills = {...state.skills, ...data.skills};
    if (data.training && typeof data.training === 'object') state.training = {...state.training, ...data.training};
    state.player.clanId = data.clanId || null;
    state.player.clanRole = data.clanRole || null;
    localStorage.setItem('mathclans-v1', JSON.stringify(state));
    if (typeof init === 'function') init();
  }

  async function ensurePlayerDoc() {
    const ref = db.collection('players').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      const p = currentProgressPayload();
      p.uid = user.uid;
      p.email = user.email || '';
      p.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      p.role = 'student';
      await ref.set(p, {merge: true});
      lastCloudStamp = p.updatedAtMs;
    } else {
      const data = snap.data() || {};
      lastCloudStamp = Number(data.updatedAtMs || 0);
      // On first sign-in, an existing cloud profile wins so the same account follows the user across devices.
      applyCloudPlayer(data);
    }
  }

  async function syncProgress(force = false) {
    if (!user || !db || syncBusy) return;
    syncBusy = true;
    try {
      const payload = currentProgressPayload();
      if (force || payload.updatedAtMs > lastCloudStamp) {
        await db.collection('players').doc(user.uid).set(payload, {merge: true});
        lastCloudStamp = payload.updatedAtMs;
      }
    } catch (err) {
      console.warn('MathClans progress sync failed:', err);
    } finally {
      syncBusy = false;
    }
  }

  function startProfileWatch() {
    if (profileUnsub) profileUnsub();
    profileUnsub = db.collection('players').doc(user.uid).onSnapshot(snap => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      const stamp = Number(data.updatedAtMs || 0);
      if (stamp > lastCloudStamp + 1000) {
        lastCloudStamp = stamp;
        applyCloudPlayer(data);
      }
    }, err => console.warn('Profile listener:', err));
  }

  function startPresence() {
    const connected = rtdb.ref('.info/connected');
    const presenceRef = rtdb.ref(`presence/${user.uid}`);
    connected.on('value', snap => {
      if (snap.val() !== true) return;
      presenceRef.onDisconnect().set({
        state: 'offline',
        lastChanged: firebase.database.ServerValue.TIMESTAMP
      });
      presenceRef.set({
        state: 'online',
        activity: 'online',
        displayName: state?.player?.name || user.displayName || 'Mathling',
        clanId: state?.player?.clanId || null,
      clanRole: state?.player?.clanRole || null,
        lastChanged: firebase.database.ServerValue.TIMESTAMP
      });
    });
    // Lightweight heartbeat. Presence itself also uses onDisconnect.
    setInterval(() => {
      if (!user) return;
      presenceRef.update({
        state: document.hidden ? 'away' : 'online',
        displayName: state?.player?.name || user.displayName || 'Mathling',
        clanId: state?.player?.clanId || null,
        activity: document.body?.dataset?.screen==='battle'?'battle':document.body?.dataset?.screen==='train'?'training':'online',
        lastChanged: firebase.database.ServerValue.TIMESTAMP
      }).catch(()=>{});
    }, 30000);
  }

  async function signInGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({prompt: 'select_account'});
      const result = await auth.signInWithPopup(provider);
      const u = result.user;
      if (typeof closeModal === 'function') closeModal();
      if (allowedDomain && u?.email) {
        const domain = u.email.split('@').pop().toLowerCase();
        if (domain !== allowedDomain) {
          await auth.signOut();
          modal(`<span class="eyebrow">SIGN-IN BLOCKED</span><h3>School account required</h3><p>Please sign in using an <b>@${allowedDomain}</b> account.</p><div class="modal-actions"><button class="primary" onclick="closeModal()">Close</button></div>`);
        }
      }
    } catch (err) {
      console.error(err);
      modal(`<span class="eyebrow">SIGN-IN ERROR</span><h3>Could not sign in</h3><p>${String(err.message || err)}</p><div class="modal-actions"><button class="primary" onclick="closeModal()">Close</button></div>`);
    }
  }

  async function signOut() {
    try { await syncProgress(true); } catch(e) {}
    await auth.signOut();
    if (typeof closeModal === 'function') closeModal();
  }

  function openAccountPanel() {
    if (!configured) {
      modal(`<span class="eyebrow">V1.6 ONLINE FOUNDATION</span><h3>Firebase setup required</h3><p>The game is currently running in <b>Local Demo</b> mode. Gameplay still works, but accounts, online presence and cloud progress are disabled.</p><p>Open <b>README.md</b> in this package and complete the Firebase setup, then paste the Web App configuration into <b>firebase-config.js</b>.</p><div class="modal-actions"><button class="primary" onclick="closeModal()">Continue Local Demo</button></div>`);
      return;
    }
    if (!user) {
      modal(`<span class="eyebrow">PLAYER ACCOUNT</span><h3>Sign in to MathClans</h3><p>Use your school Google account. Your email is used for authentication and is not shown as your public player name.</p><div class="online-account-actions"><button class="primary" id="googleSignInBtn">Sign in with Google</button></div><p class="online-small">V1.6 stores your player profile and Math progress in Firebase and tracks whether you are online.</p><div class="modal-actions"><button class="secondary" id="accountCloseBtn">Close</button></div>`);
      setTimeout(() => { const b=$o('#googleSignInBtn'); if(b) b.onclick=signInGoogle; const c=$o('#accountCloseBtn'); if(c) c.onclick=()=>{ if (typeof closeModal === 'function') closeModal(); }; }, 0);
      return;
    }
    modal(`<span class="eyebrow">ONLINE PLAYER</span><h3>${state?.player?.name || user.displayName || 'Mathling'}</h3><div class="online-profile-card"><div class="online-avatar">${state?.player?.avatar || '🐲'}</div><div><b>${user.email || ''}</b><span>Cloud progress: connected</span><span>Presence: online</span></div></div><div class="modal-actions"><button class="secondary" id="accountCloseBtn">Close</button><button class="secondary" id="syncNowBtn">Sync Now</button><button class="primary" id="signOutBtn">Sign Out</button></div>`);
    setTimeout(() => {
      const c=$o('#accountCloseBtn'); if(c) c.onclick=()=>{ if (typeof closeModal === 'function') closeModal(); };
      const s=$o('#syncNowBtn'); if(s) s.onclick=async()=>{await syncProgress(true); s.textContent='Synced ✓';};
      const b=$o('#signOutBtn'); if(b) b.onclick=signOut;
    },0);
  }

  async function onAuth(userNow) {
    user = userNow || null;
    if (!user) {
      accountLabel(configured ? 'Sign In' : 'Local Demo', configured ? 'offline' : 'demo');
      if (profileUnsub) { profileUnsub(); profileUnsub=null; }
      if (syncTimer) { clearInterval(syncTimer); syncTimer=null; }
      return;
    }
    accountLabel(state?.player?.name || user.displayName || 'Online', 'online');
    await ensurePlayerDoc();
    accountLabel(state?.player?.name || user.displayName || 'Online', 'online');
    startProfileWatch();
    startPresence();
    syncTimer = setInterval(() => syncProgress(false), 15000);
  }

  if (ui.btn) ui.btn.addEventListener('click', openAccountPanel);

  if (!configured) {
    accountLabel('Local Demo', 'demo');
    window.MathClansOnline = {configured:false, sync:()=>Promise.resolve(), user:()=>null};
    return;
  }

  try {
    app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
    rtdb = firebase.database();
    auth.useDeviceLanguage();
    auth.onAuthStateChanged(onAuth);
    window.addEventListener('pagehide', () => { if (user) syncProgress(true); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncProgress(false); });
    window.MathClansOnline = {configured:true, sync:syncProgress, user:()=>user, signIn:signInGoogle, signOut, db:()=>db, rtdb:()=>rtdb, auth:()=>auth};
    accountLabel('Sign In', 'offline');
  } catch (err) {
    console.error('Firebase init failed:', err);
    accountLabel('Setup Error', 'error');
  }
})();
