// ═══════════════════════════════════════════════════════════════════
// SYSTEM V6 — Complete UX Enhancement Engine
// Implements: Onboarding · Command Palette · FAB · Confetti · XP Float
// Achievement Celebration · Haptic · Adaptive Theme · Focus Mode ·
// Mission Control · Undo · Gestures · Microinteractions · Skeleton
// ═══════════════════════════════════════════════════════════════════

const V6 = {
  version: '6.0.0',

  // ─────────────────────────────────────────────────────────────────
  // HAPTIC FEEDBACK
  // ─────────────────────────────────────────────────────────────────
  haptic: {
    light()   { try { navigator.vibrate?.(10); } catch{} },
    medium()  { try { navigator.vibrate?.(25); } catch{} },
    heavy()   { try { navigator.vibrate?.([50,30,50]); } catch{} },
    success() { try { navigator.vibrate?.([30,20,60]); } catch{} },
    error()   { try { navigator.vibrate?.([100,50,100,50,200]); } catch{} },
    levelup() { try { navigator.vibrate?.([100,50,100,50,200,50,300]); } catch{} },
  },

  // ─────────────────────────────────────────────────────────────────
  // CONFETTI ENGINE (Canvas-based)
  // ─────────────────────────────────────────────────────────────────
  confetti: {
    particles: [],
    canvas: null,
    ctx: null,
    running: false,
    _stopTimer: null,

    init() {
      this.canvas = document.getElementById('confettiCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width  = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    launch(count = 160) {
      if (!this.canvas) this.init();
      if (!this.ctx) return;
      this.canvas.style.display = 'block';
      const colors = ['#4d6fff','#7b4fff','#ffd700','#00ff88','#ff3a5c','#00d4ff','#ff7b00','#e8f0ff'];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: -20 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 7,
          vy: Math.random() * 4 + 2,
          size: Math.random() * 9 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
          shape: ['rect','circle','tri'][Math.floor(Math.random()*3)],
          gravity: 0.14,
          alpha: 1,
          fadeY: this.canvas.height * 0.65,
        });
      }
      clearTimeout(this._stopTimer);
      if (!this.running) { this.running = true; this._animate(); }
      this._stopTimer = setTimeout(() => this.stop(), 5000);
    },

    _animate() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.particles = this.particles.filter(p => p.alpha > 0.02);
      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.rotation += p.rotSpeed;
        if (p.y > p.fadeY) p.alpha = Math.max(0, p.alpha - 0.025);
        this.ctx.save();
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation * Math.PI / 180);
        if (p.shape === 'rect') {
          this.ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
        } else if (p.shape === 'circle') {
          this.ctx.beginPath(); this.ctx.arc(0,0,p.size/2,0,Math.PI*2); this.ctx.fill();
        } else {
          this.ctx.beginPath(); this.ctx.moveTo(0,-p.size/2); this.ctx.lineTo(p.size/2,p.size/2); this.ctx.lineTo(-p.size/2,p.size/2); this.ctx.closePath(); this.ctx.fill();
        }
        this.ctx.restore();
      });
      if (this.particles.length > 0) requestAnimationFrame(() => this._animate());
      else this.stop();
    },

    stop() {
      this.running = false;
      if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.canvas) this.canvas.style.display = 'none';
      this.particles = [];
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // XP FLOAT ANIMATION
  // ─────────────────────────────────────────────────────────────────
  floatXP(amount, x, y) {
    const layer = document.getElementById('xpFloatLayer');
    if (!layer || !amount) return;
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = `+${amount} XP`;
    el.style.left = (x ?? window.innerWidth / 2) + 'px';
    el.style.top  = (y ?? window.innerHeight * 0.7) + 'px';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  },

  // ─────────────────────────────────────────────────────────────────
  // ACHIEVEMENT FULL-SCREEN CELEBRATION
  // ─────────────────────────────────────────────────────────────────
  celebrate(name, icon, desc, type = 'achievement') {
    this.confetti.launch(200);
    this.haptic.levelup();
    const overlay = document.getElementById('achCelebration');
    if (!overlay) return;
    document.getElementById('achCelIcon').textContent = icon || '🏆';
    document.getElementById('achCelName').textContent = name || 'ACHIEVEMENT UNLOCKED';
    document.getElementById('achCelDesc').textContent = desc || '';
    document.getElementById('achCelType').textContent = type === 'levelup' ? 'LEVEL UP' : 'ACHIEVEMENT';
    overlay.classList.add('show');
    clearTimeout(this._celebTimer);
    this._celebTimer = setTimeout(() => overlay.classList.remove('show'), 4500);
  },

  // ─────────────────────────────────────────────────────────────────
  // COMMAND PALETTE  (Ctrl+K / ⌘K)
  // ─────────────────────────────────────────────────────────────────
  palette: {
    isOpen: false,
    commands: [],
    filtered: [],
    sel: 0,

    build() {
      this.commands = [
        { icon:'🏠', label:'Dashboard',           hint:'Go to Status',         action:() => goPage('status',   document.getElementById('nb-status')) },
        { icon:'⚔️', label:'Quests',              hint:'Go to Quests',         action:() => goPage('quests',   document.getElementById('nb-quests')) },
        { icon:'🏆', label:'Achievements',         hint:'Go to Titles',         action:() => goPage('achieve',  document.getElementById('nb-achieve')) },
        { icon:'📊', label:'Analytics',            hint:'Go to Stats',          action:() => goPage('analytics',document.getElementById('nb-analytics')) },
        { icon:'⚙️', label:'Settings',             hint:'Go to Setup',          action:() => goPage('settings', document.getElementById('nb-settings')) },
        { icon:'📋', label:'System Log',           hint:'Go to Log',            action:() => goPage('log',      document.getElementById('nb-log')) },
        { icon:'🎯', label:'Start Focus Session',  hint:'Pomodoro timer',       action:() => V6.focusMode.open() },
        { icon:'🚀', label:'Mission Control',      hint:'Command center',       action:() => V6.missionControl.open() },
        { icon:'➕', label:'Add New Quest',         hint:'Quick add',            action:() => { goPage('quests', document.getElementById('nb-quests')); setTimeout(()=>document.getElementById('qname')?.focus(),250); }},
        { icon:'📤', label:'Export Backup',         hint:'Download JSON',        action:() => exportBackup() },
        { icon:'🌙', label:'Theme: Default Dark',   hint:'Apply theme',          action:() => applyTheme('') },
        { icon:'⬛', label:'Theme: AMOLED Black',   hint:'Apply theme',          action:() => applyTheme('theme-amoled') },
        { icon:'🔴', label:'Theme: Cyberpunk',      hint:'Apply theme',          action:() => applyTheme('theme-cyberpunk') },
        { icon:'🟢', label:'Theme: Matrix Green',   hint:'Apply theme',          action:() => applyTheme('theme-green') },
        { icon:'🔵', label:'Theme: Ice Blue',       hint:'Apply theme',          action:() => applyTheme('theme-blue') },
        { icon:'🌗', label:'Auto Theme (Time)',      hint:'Adaptive theme',       action:() => V6.adaptiveTheme.toggle() },
        { icon:'🔔', label:'Enable Notifications',  hint:'Request permission',   action:() => reqNotifPerm() },
        { icon:'🗑️', label:'Reset All Data',        hint:'Wipe progress',        action:() => confirmReset() },
      ];
      // Inject quests as searchable commands
      if (typeof S !== 'undefined' && S.quests) {
        S.quests.filter(q=>!q.done).slice(0,8).forEach(q => {
          this.commands.push({ icon:'⚔️', label:`Complete: ${q.name}`, hint:q.diff+' · '+q.cat, action:()=> completeQ(q.id) });
        });
      }
      this.filtered = [...this.commands];
    },

    show() {
      this.build();
      this.isOpen = true;
      this.sel = 0;
      const ov = document.getElementById('cmdPaletteOverlay');
      const inp = document.getElementById('cmdInput');
      if (!ov || !inp) return;
      ov.classList.add('show');
      inp.value = '';
      this.render();
      setTimeout(() => inp.focus(), 60);
      V6.haptic.light();
    },

    hide() {
      this.isOpen = false;
      document.getElementById('cmdPaletteOverlay')?.classList.remove('show');
    },

    filter(q) {
      const query = q.toLowerCase().trim();
      this.filtered = query
        ? this.commands.filter(c => c.label.toLowerCase().includes(query) || c.hint.toLowerCase().includes(query))
        : [...this.commands];
      this.sel = 0;
      this.render();
    },

    render() {
      const list = document.getElementById('cmdList');
      if (!list) return;
      if (!this.filtered.length) { list.innerHTML = '<div class="cmd-empty">No results</div>'; return; }
      list.innerHTML = this.filtered.slice(0,12).map((c,i) => `
        <div class="cmd-item${i===this.sel?' selected':''}" onclick="V6.palette.execute(${i})" onmouseover="V6.palette.sel=${i};V6.palette.render()">
          <span class="cmd-ic">${c.icon}</span>
          <span class="cmd-info"><span class="cmd-lbl">${c.label}</span><span class="cmd-hint">${c.hint}</span></span>
          ${i===this.sel?'<span class="cmd-enter">↵</span>':''}
        </div>`).join('');
    },

    execute(idx) {
      const cmd = this.filtered[idx ?? this.sel];
      if (!cmd) return;
      this.hide();
      V6.haptic.medium();
      setTimeout(() => cmd.action(), 80);
    },

    handleKey(e) {
      if (!this.isOpen) return;
      if (e.key==='ArrowDown') { e.preventDefault(); this.sel=Math.min(this.sel+1,Math.min(this.filtered.length,12)-1); this.render(); }
      if (e.key==='ArrowUp')   { e.preventDefault(); this.sel=Math.max(this.sel-1,0); this.render(); }
      if (e.key==='Enter')     { e.preventDefault(); this.execute(); }
      if (e.key==='Escape')    { e.preventDefault(); this.hide(); }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // FLOATING ACTION BUTTON
  // ─────────────────────────────────────────────────────────────────
  fab: {
    expanded: false,

    toggle() {
      this.expanded = !this.expanded;
      document.getElementById('fab')?.classList.toggle('expanded', this.expanded);
      document.getElementById('fabMenu')?.classList.toggle('show', this.expanded);
      V6.haptic.light();
    },

    close() {
      this.expanded = false;
      document.getElementById('fab')?.classList.remove('expanded');
      document.getElementById('fabMenu')?.classList.remove('show');
    },

    action(type) {
      this.close();
      V6.haptic.medium();
      const map = {
        quest:   () => { goPage('quests',document.getElementById('nb-quests')); setTimeout(()=>document.getElementById('qname')?.focus(),280); },
        focus:   () => V6.focusMode.open(),
        mission: () => V6.missionControl.open(),
        search:  () => V6.palette.show(),
        note:    () => showToast('📝 Notes — coming soon in V6.1','gold'),
      };
      map[type]?.();
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // FOCUS MODE — Distraction-free Pomodoro
  // ─────────────────────────────────────────────────────────────────
  focusMode: {
    secs: 0, running: false, _iv: null, _total: 0,

    open(subject = '', mins = 25) {
      this.secs  = mins * 60;
      this._total = mins * 60;
      this.running = false;
      clearInterval(this._iv);
      const ov = document.getElementById('focusModeOverlay');
      if (!ov) return;
      const subEl = document.getElementById('focusSubject');
      if (subEl) subEl.value = subject;
      this._updateDisplay();
      this._setBtn('▶ START', () => this.start());
      ov.classList.add('show');
      V6.haptic.medium();
    },

    close() {
      this.pause();
      document.getElementById('focusModeOverlay')?.classList.remove('show');
    },

    start() {
      if (this.running) return;
      this.running = true;
      const durEl = document.getElementById('focusDuration');
      if (durEl && !this.running) { this.secs = parseInt(durEl.value||25)*60; this._total = this.secs; }
      this._iv = setInterval(() => {
        this.secs--;
        this._updateDisplay();
        if (this.secs <= 0) this.complete();
      }, 1000);
      this._setBtn('⏸ PAUSE', () => this.pause());
    },

    pause() {
      this.running = false;
      clearInterval(this._iv);
      this._setBtn('▶ RESUME', () => this.start());
    },

    reset() {
      this.pause();
      const dur = parseInt(document.getElementById('focusDuration')?.value||25);
      this.secs = dur * 60; this._total = this.secs;
      this._updateDisplay();
      this._setBtn('▶ START', () => this.start());
    },

    complete() {
      clearInterval(this._iv); this.running = false;
      V6.haptic.success(); V6.confetti.launch(100);
      showToast('🎯 FOCUS SESSION COMPLETE — +50 XP','green');
      this.close();
      if (typeof S !== 'undefined') {
        S.xp = (S.xp||0) + 50; S.todayXp = (S.todayXp||0) + 50;
        S.lifetimeXp = (S.lifetimeXp||0) + 50;
        addLog('<span class="lgrn">Focus session complete — +50 XP</span>');
        save(S); render(); V6.floatXP(50);
      }
    },

    _setBtn(label, fn) {
      const btn = document.getElementById('focusStartBtn');
      if (btn) { btn.textContent = label; btn.onclick = fn; }
    },

    _updateDisplay() {
      const m = Math.floor(this.secs/60), s = this.secs%60;
      const disp = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      const el = document.getElementById('focusTimer');
      if (el) {
        el.textContent = disp;
        el.style.color = this.secs<=60?'var(--red)': this.secs<=300?'var(--orange)':'var(--cyan)';
      }
      // SVG ring
      const ring = document.getElementById('focusRing');
      if (ring) {
        const circ = 2*Math.PI*90;
        const pct  = this._total > 0 ? this.secs/this._total : 1;
        ring.style.strokeDasharray  = circ;
        ring.style.strokeDashoffset = circ * (1-pct);
        ring.style.stroke = this.secs<=60?'#ff3a5c': this.secs<=300?'#ff7b00':'#4d6fff';
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // MISSION CONTROL — Command Center Overlay
  // ─────────────────────────────────────────────────────────────────
  missionControl: {
    open() {
      this.update();
      document.getElementById('missionControlOverlay')?.classList.add('show');
      V6.haptic.medium();
    },
    close() { document.getElementById('missionControlOverlay')?.classList.remove('show'); },
    update() {
      if (typeof S === 'undefined') return;
      const mission = S.quests?.find(q => !q.done && !q.isPenaltyQuest) || null;
      _set('mcMission', mission ? mission.name : 'All missions complete 🎉');
      _set('mcXp',      S.todayXp || 0);
      _set('mcStreak',  (S.streak||0) + ' 🔥');
      _set('mcLevel',   'LVL ' + (S.level||1));
      const score = (typeof computeScore==='function') ? computeScore() : 0;
      const sc = document.getElementById('mcScore');
      if (sc) {
        sc.textContent = score >= 0 ? score+'%' : '—';
        sc.style.color = score>=90?'var(--green)':score>=70?'var(--gold)':score>=50?'var(--orange)':'var(--red)';
      }
      const total = S.quests?.filter(q=>!q.isPenaltyQuest).length||0;
      const done  = S.quests?.filter(q=>!q.isPenaltyQuest&&q.done).length||0;
      const pct   = total>0 ? Math.round((done/total)*100) : 0;
      const bar = document.getElementById('mcBar');
      if (bar) bar.style.width = pct+'%';
      _set('mcProgress', `${done} / ${total} QUESTS · ${pct}%`);
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // UNDO SYSTEM
  // ─────────────────────────────────────────────────────────────────
  undo: {
    _stack: [], _t: null,

    push(label, fn) {
      this._stack.push({ label, fn });
      this._show(label);
    },

    pop() {
      const a = this._stack.pop();
      if (!a) return;
      a.fn();
      this._hide();
      showToast('ACTION UNDONE', 'green');
      V6.haptic.medium();
    },

    _show(label) {
      _set('undoLabel', label || 'Action');
      document.getElementById('undoBar')?.classList.add('show');
      clearTimeout(this._t);
      this._t = setTimeout(() => { this._hide(); this._stack=[]; }, 5000);
    },

    _hide() { document.getElementById('undoBar')?.classList.remove('show'); },
  },

  // ─────────────────────────────────────────────────────────────────
  // ADAPTIVE THEME (time-of-day)
  // ─────────────────────────────────────────────────────────────────
  adaptiveTheme: {
    enabled: false, _iv: null,

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('sys_adaptive_theme', this.enabled?'1':'0');
      if (this.enabled) { this.apply(); this._iv = setInterval(()=>this.apply(), 60000); showToast('🌗 ADAPTIVE THEME ON','green'); }
      else              { clearInterval(this._iv); showToast('ADAPTIVE THEME OFF'); }
    },

    apply() {
      if (!this.enabled || (typeof S!=='undefined' && S.customTheme)) return;
      const h = new Date().getHours();
      let t = '';
      if      (h>=22||h<5)  t = 'theme-amoled';
      else if (h<8)         t = 'theme-blue';
      else if (h<17)        t = '';
      else if (h<20)        t = 'theme-purple';
      if (typeof applyTheme==='function') applyTheme(t);
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // GESTURE NAVIGATION (swipe left/right between tabs)
  // ─────────────────────────────────────────────────────────────────
  gestures: {
    sx:0, sy:0, st:0,
    pages:['status','quests','achieve','analytics','settings','log'],

    init() {
      const el = document.getElementById('mainContent');
      if (!el) return;
      el.addEventListener('touchstart', e=>{
        this.sx=e.touches[0].clientX; this.sy=e.touches[0].clientY; this.st=Date.now();
      }, {passive:true});
      el.addEventListener('touchend', e=>{
        const dx=e.changedTouches[0].clientX-this.sx, dy=e.changedTouches[0].clientY-this.sy;
        const dt=Date.now()-this.st;
        if (Math.abs(dx)<55||dt>420||Math.abs(dy)>Math.abs(dx)*0.8) return;
        const active=document.querySelector('.page.active');
        if (!active) return;
        const idx=this.pages.indexOf(active.id.replace('pg-',''));
        if (idx===-1) return;
        if (dx<-55&&idx<this.pages.length-1) {
          const n=this.pages[idx+1]; const btn=document.getElementById('nb-'+n);
          if (btn) { goPage(n,btn); V6.haptic.light(); }
        } else if (dx>55&&idx>0) {
          const p=this.pages[idx-1]; const btn=document.getElementById('nb-'+p);
          if (btn) { goPage(p,btn); V6.haptic.light(); }
        }
      }, {passive:true});
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // ONBOARDING WIZARD (First Launch)
  // ─────────────────────────────────────────────────────────────────
  onboarding: {
    step:1, total:5, data:{},

    isDone() { return localStorage.getItem('sys_v6_onboarded')==='1'; },
    markDone(){ localStorage.setItem('sys_v6_onboarded','1'); },

    start() {
      document.getElementById('onboardingOverlay')?.classList.add('show');
      this.go(1);
    },

    go(n) {
      this.step=n;
      document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
      document.getElementById(`ob-step-${n}`)?.classList.add('active');
      _set('obStepLabel',`Step ${n} of ${this.total}`);
      document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('active',i<n));
      // Update progress bar
      const pb = document.getElementById('obProgressBar');
      if (pb) pb.style.width = ((n-1)/this.total*100)+'%';
    },

    next() {
      // collect step data
      if (this.step===1) this.data.name = document.getElementById('ob-name')?.value?.trim();
      if (this.step===2) { this.data.wakeTime=document.getElementById('ob-wake')?.value; this.data.dailyGoal=document.getElementById('ob-goal')?.value; }
      if (this.step===3) { this.data.sleepTime=document.getElementById('ob-sleep')?.value; this.data.studyHours=document.getElementById('ob-study')?.value; }
      V6.haptic.light();
      if (this.step < this.total) this.go(this.step+1);
      else this.complete();
    },

    back() {
      if (this.step>1) this.go(this.step-1);
    },

    skip() { this.complete(); },

    complete() {
      if (typeof S!=='undefined') {
        if (this.data.name) S.name=this.data.name;
        S.profile = this.data;
        save(S); render();
      }
      this.markDone();
      document.getElementById('onboardingOverlay')?.classList.remove('show');
      V6.haptic.success();
      V6.confetti.launch(120);
      showToast('🚀 YOUR SYSTEM IS ONLINE','green');
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // SKELETON LOADING
  // ─────────────────────────────────────────────────────────────────
  skeleton: {
    show(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div class="skel-wrap">
          ${[...Array(3)].map(()=>`
            <div class="skel-card">
              <div class="skel-line w80"></div>
              <div class="skel-line w60"></div>
              <div class="skel-line w40"></div>
            </div>`).join('')}
        </div>`;
    },
    hide(containerId) {
      const el = document.getElementById(containerId);
      if (el) el.querySelector('.skel-wrap')?.remove();
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // MICROINTERACTIONS
  // ─────────────────────────────────────────────────────────────────
  _setupMicrointeractions() {
    document.addEventListener('click', e => {
      // Close FAB on outside click
      if (!e.target.closest('#fab') && !e.target.closest('#fabMenu')) V6.fab.close();
      // Close command palette on backdrop click
      if (e.target.id === 'cmdPaletteOverlay') V6.palette.hide();
      // Close mission control on backdrop click
      if (e.target.id === 'missionControlOverlay') V6.missionControl.close();
      // Close focus mode on backdrop click
      if (e.target.id === 'focusModeOverlay') {} // don't close on backdrop (user is focusing)
      // Close achievement on click
      if (e.target.closest('#achCelebration')) document.getElementById('achCelebration')?.classList.remove('show');

      // Checkbox pop
      const qcheck = e.target.closest('.qcheck');
      if (qcheck && !qcheck.closest('.qi.done')) {
        qcheck.style.transform='scale(1.4)';
        qcheck.style.background='rgba(0,255,136,.25)';
        setTimeout(()=>{ qcheck.style.transform=''; qcheck.style.background=''; }, 220);
      }
    });

    // Streak card hover animation
    document.querySelectorAll?.('.streak-card')?.forEach?.(c=>{
      c.addEventListener('mouseenter',()=>c.style.transform='scale(1.04)',{passive:true});
      c.addEventListener('mouseleave',()=>c.style.transform='',{passive:true});
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────────
  _setupKeyboard() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag);

      // Command palette  Ctrl/⌘+K
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') {
        e.preventDefault();
        V6.palette.isOpen ? V6.palette.hide() : V6.palette.show();
        return;
      }

      // Mission control  Space (when not typing)
      if (e.key===' ' && !typing) {
        const mc = document.getElementById('missionControlOverlay');
        if (mc) {
          e.preventDefault();
          mc.classList.contains('show') ? V6.missionControl.close() : V6.missionControl.open();
        }
        return;
      }

      // Palette navigation
      V6.palette.handleKey(e);
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // SMART NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────
  smartNotif(title, body) {
    if (typeof S!=='undefined' && S.name && S.name!=='PLAYER') {
      body = `${S.name}, ${body}`;
    }
    if (typeof sendNotif==='function') sendNotif(title, body, false, 'smart');
  },

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────
  init() {
    this.confetti.init();
    this.gestures.init();
    this._setupKeyboard();
    this._setupMicrointeractions();

    // Restore adaptive theme
    if (localStorage.getItem('sys_adaptive_theme')==='1') {
      this.adaptiveTheme.enabled = true;
      this.adaptiveTheme.apply();
      this.adaptiveTheme._iv = setInterval(()=>this.adaptiveTheme.apply(), 60000);
    }

    // First launch onboarding
    if (!this.onboarding.isDone()) {
      setTimeout(() => this.onboarding.start(), 1700);
    }

    // Periodic mission control update
    setInterval(() => {
      if (document.getElementById('missionControlOverlay')?.classList.contains('show')) {
        this.missionControl.update();
      }
    }, 10000);

    console.log(`⚡ SYSTEM V6 (${this.version}) initialized`);
  },
};

// ═════════════════════════════════════════════════════════════════════
// HELPER
// ═════════════════════════════════════════════════════════════════════
function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ═════════════════════════════════════════════════════════════════════
// PATCH EXISTING V4 FUNCTIONS
// ═════════════════════════════════════════════════════════════════════
(function patchV4() {

  // Patch completeQ → XP float + haptic
  const _cq = window.completeQ;
  if (typeof _cq === 'function') {
    window.completeQ = function(id) {
      const q = (typeof S!=='undefined') ? S.quests?.find(q=>q.id===id) : null;
      if (!q || q.done) return;
      const beforeXP = typeof S!=='undefined' ? S.xp : 0;
      _cq(id);
      const gained = typeof S!=='undefined' ? Math.max(0,S.xp-beforeXP) : (XP_DIFF?.[q.diff]||0);
      V6.floatXP(gained || (XP_DIFF?.[q.diff]||10));
      V6.haptic.success();
      V6.missionControl.update();
    };
  }

  // Patch delQ → undo support
  const _dq = window.delQ;
  if (typeof _dq === 'function') {
    window.delQ = function(id) {
      if (typeof S==='undefined') return _dq(id);
      const q = S.quests?.find(q=>q.id===id);
      if (!q) return _dq(id);
      const snap = JSON.stringify(S);
      _dq(id);
      V6.haptic.medium();
      V6.undo.push(`"${q.name.slice(0,24)}…" deleted`, () => {
        try { window.S = Object.assign(S, JSON.parse(snap)); save(S); render(); } catch {}
      });
    };
  }

  // Patch triggerLU → confetti
  const _lu = window.triggerLU;
  if (typeof _lu === 'function') {
    window.triggerLU = function(unlocks) {
      _lu(unlocks);
      V6.confetti.launch(280);
      V6.haptic.levelup();
    };
  }

  // Patch checkAchieves → full-screen celebration
  const _ca = window.checkAchieves;
  if (typeof _ca === 'function') {
    window.checkAchieves = function() {
      const before = [...(S?.achievements||[])];
      _ca();
      const newIds = (S?.achievements||[]).filter(id=>!before.includes(id));
      if (newIds.length && typeof ACHIEVES!=='undefined') {
        const ach = ACHIEVES.find(a=>a.id===newIds[0]);
        if (ach) setTimeout(()=>V6.celebrate(ach.name, ach.icon, ach.desc), 400);
      }
    };
  }

})();

// ═════════════════════════════════════════════════════════════════════
// BOOT
// ═════════════════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => V6.init());
} else {
  V6.init();
}

window.V6 = V6;
