// SYSTEM CLOUD — optional Firebase account registry and competition layer

const SYSTEM_CLOUD = {
  enabled: false,
  user: null,
  unsubscribeProfile: null,
  lastBackupAt: 0,

  init() {
    const config = window.SYSTEM_FIREBASE_CONFIG;
    if (!config || !window.firebase) {
      this.setStatus('LOCAL MODE · CLOUD REGISTRY NOT CONFIGURED');
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      if (config.measurementId && typeof firebase.analytics === 'function' && location.protocol !== 'file:') {
        this.analytics = firebase.analytics();
      }
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.enabled = true;
      this.auth.getRedirectResult().catch(error => this.reportAuthError(error));
      this.auth.onAuthStateChanged(user => {
        this.user = user;
        this.render();
        if (user) this.syncProfile(user, true);
      });
      setInterval(() => { if (this.user) this.syncProfile(); }, 300000);
      this.patchQuestCompletion();
      this.setStatus('CLOUD READY · SIGN IN TO SYNC');
    } catch (error) {
      console.error('[SYSTEM CLOUD] Initialization failed:', error);
      this.setStatus('CLOUD ERROR · LOCAL MODE ACTIVE');
    }
  },

  async register(email, password, displayName) {
    if (!this.enabled) return this.unavailable();
    if (!email || password.length < 6 || !displayName) throw new Error('Enter a name, valid email, and password of at least 6 characters.');
    const result = await this.auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: displayName.trim() });
    await this.syncProfile(result.user);
    this.show('ACCOUNT CREATED · CLOUD SYNC ACTIVE', 'green');
  },

  async signIn(email, password) {
    if (!this.enabled) return this.unavailable();
    await this.auth.signInWithEmailAndPassword(email, password);
    this.show('SIGNED IN · PROFILE SYNCED', 'green');
  },

  async signInWithGoogle() {
    if (!this.enabled) return this.unavailable();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (location.protocol === 'file:') {
      throw new Error('GOOGLE AUTH NEEDS A WEB OR NATIVE APP ORIGIN. Add a Firebase Web App or configure native Google Sign-In in the APK wrapper.');
    }
    try {
      await this.auth.signInWithPopup(provider);
    } catch (error) {
      if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/operation-not-supported-in-this-environment'].includes(error.code)) {
        await this.auth.signInWithRedirect(provider);
        return;
      }
      throw this.authError(error);
    }
    this.show('GOOGLE SIGN-IN COMPLETE · PROFILE SYNCED', 'green');
  },

  authError(error) {
    const messages = {
      'auth/unauthorized-domain': 'Add this app domain in Firebase Authentication > Settings > Authorized domains.',
      'auth/operation-not-supported-in-this-environment': 'This APK WebView cannot use web Google OAuth. Use a native Google Sign-In bridge or serve the app from HTTPS.',
      'auth/invalid-api-key': 'The Firebase Web API key is invalid. Register a Firebase Web App and replace firebase-config.js.',
      'auth/app-not-authorized': 'This app is not authorized for the Firebase project. Register the Web App origin and package correctly.',
      'auth/invalid-oauth-client-id': 'Google OAuth client is missing. Enable Google sign-in and register a Firebase Web App.',
      'auth/popup-blocked': 'The APK blocked the OAuth popup. Use HTTPS hosting or a native Google Sign-In bridge.',
      'auth/network-request-failed': 'Firebase could not reach the network. Check APK internet permission and connectivity.',
    };
    const message = messages[error?.code] || error?.message || 'Google authentication failed.';
    const result = new Error(message);
    result.code = error?.code;
    return result;
  },

  reportAuthError(error) {
    if (error) this.show(this.authError(error).message, 'red');
  },

  async signOut() {
    if (!this.enabled || !this.auth) return;
    await this.auth.signOut();
    this.show('SIGNED OUT · LOCAL MODE ACTIVE', 'orange');
  },

  async syncProfile(user = this.user, includeBackup = false) {
    if (!this.enabled || !user || typeof S === 'undefined') return;
    const profile = {
      uid: user.uid,
      displayName: user.displayName || S.name || 'PLAYER',
      level: Number(S.level || 1),
      lifetimeXp: Number(S.lifetimeXp || 0),
      streak: Number(S.streak || 0),
      systemIndex: typeof V7 !== 'undefined' ? Number(V7.performance()?.index || 0) : 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await this.db.collection('players').doc(user.uid).set(profile, { merge: true });
    if (includeBackup) await this.syncCompressedBackup(user);
    this.render();
  },

  collectData() {
    const data = {
      state: typeof S !== 'undefined' ? S : null,
      tasks: typeof SYSTEM_V5 !== 'undefined' ? SYSTEM_V5.tasks : [],
      v5Stats: typeof SYSTEM_V5 !== 'undefined' ? SYSTEM_V5.stats : null,
      dailyLogs: typeof SYSTEM_V5 !== 'undefined' ? SYSTEM_V5.dailyLogs : [],
      learning: typeof V8 !== 'undefined' ? V8.records : [],
      ai: {},
    };
    ['system_v9_parameters', 'system_v9_memory', 'system_v9_ai_history'].forEach(key => {
      try { data.ai[key] = JSON.parse(localStorage.getItem(key) || 'null'); } catch { data.ai[key] = null; }
    });
    return data;
  },

  async compressData(data) {
    const json = JSON.stringify(data);
    if (!window.CompressionStream) return { encoding: 'json', payload: json };
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = '';
    for (let index = 0; index < buffer.length; index += 8192) binary += String.fromCharCode(...buffer.subarray(index, index + 8192));
    return { encoding: 'gzip-base64', payload: btoa(binary) };
  },

  async syncCompressedBackup(user = this.user) {
    if (!this.enabled || !user || Date.now() - this.lastBackupAt < 30000) return;
    const compressed = await this.compressData(this.collectData());
    if (compressed.payload.length > 900000) {
      this.show('CLOUD BACKUP TOO LARGE · LOCAL DATA KEPT', 'orange');
      return;
    }
    await this.db.collection('backups').doc(user.uid).set({
      uid: user.uid,
      encoding: compressed.encoding,
      payload: compressed.payload,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    this.lastBackupAt = Date.now();
    const status = document.getElementById('cloudSyncStatus');
    if (status) status.textContent = `COMPRESSED BACKUP SYNCED · ${Math.round(compressed.payload.length / 1024)} KB`;
  },

  patchQuestCompletion() {
    if (typeof window.completeQ !== 'function' || window.completeQ._cloudPatched) return;
    const original = window.completeQ;
    const wrapped = function(id) {
      original(id);
      setTimeout(() => SYSTEM_CLOUD.syncProfile(SYSTEM_CLOUD.user, true), 250);
    };
    wrapped._cloudPatched = true;
    window.completeQ = wrapped;
  },

  async loadLeaderboard() {
    const list = document.getElementById('cloudLeaderboard');
    if (!list) return;
    if (!this.enabled) {
      list.innerHTML = '<div class="cloud-empty">CLOUD REGISTRY NOT CONFIGURED. LOCAL MODE ACTIVE.</div>';
      return;
    }
    try {
      const snapshot = await this.db.collection('players').orderBy('systemIndex', 'desc').limit(25).get();
      if (snapshot.empty) {
        list.innerHTML = '<div class="cloud-empty">NO REGISTERED PLAYERS YET.</div>';
        return;
      }
      list.innerHTML = snapshot.docs.map((doc, index) => {
        const player = doc.data();
        return `<div class="leader-row"><span class="leader-rank">#${index + 1}</span><span class="leader-name">${this.escape(player.displayName || 'PLAYER')}</span><span class="leader-score">${player.systemIndex || 0}</span></div>`;
      }).join('');
    } catch (error) {
      console.error('[SYSTEM CLOUD] Leaderboard failed:', error);
      list.innerHTML = '<div class="cloud-empty">LEADERBOARD UNAVAILABLE.</div>';
    }
  },

  render() {
    const signedIn = this.user;
    const accountStatus = document.getElementById('cloudAccountStatus');
    if (accountStatus) accountStatus.textContent = signedIn ? `SIGNED IN · ${signedIn.displayName || signedIn.email}` : (this.enabled ? 'NOT SIGNED IN' : 'LOCAL MODE');
    document.getElementById('cloudAuthForm')?.classList.toggle('hidden', !!signedIn || !this.enabled);
    document.getElementById('cloudSignOut')?.classList.toggle('hidden', !signedIn);
    document.getElementById('cloudRegister')?.classList.toggle('hidden', !!signedIn || !this.enabled);
    this.loadLeaderboard();
  },

  setStatus(text) {
    const status = document.getElementById('cloudAccountStatus');
    if (status) status.textContent = text;
  },

  unavailable() {
    this.show('CLOUD REGISTRY NOT CONFIGURED · LOCAL MODE ACTIVE', 'orange');
  },

  show(message, type) {
    if (typeof showToast === 'function') showToast(message, type);
  },

  escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
  },
};

function cloudRegister() {
  const name = document.getElementById('cloudName')?.value.trim();
  const email = document.getElementById('cloudEmail')?.value.trim();
  const password = document.getElementById('cloudPassword')?.value || '';
  SYSTEM_CLOUD.register(email, password, name).catch(error => SYSTEM_CLOUD.show(error.message || 'REGISTRATION FAILED', 'red'));
}

function cloudSignIn() {
  const email = document.getElementById('cloudEmail')?.value.trim();
  const password = document.getElementById('cloudPassword')?.value || '';
  SYSTEM_CLOUD.signIn(email, password).catch(error => SYSTEM_CLOUD.show(error.message || 'SIGN IN FAILED', 'red'));
}

function cloudGoogleSignIn() {
  SYSTEM_CLOUD.signInWithGoogle().catch(error => SYSTEM_CLOUD.show(error.message || 'GOOGLE SIGN-IN FAILED', 'red'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SYSTEM_CLOUD.init());
else SYSTEM_CLOUD.init();

window.SYSTEM_CLOUD = SYSTEM_CLOUD;
