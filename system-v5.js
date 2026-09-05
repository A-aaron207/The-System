// ═══════════════════════════════════════════════════
// SYSTEM v5 — EXECUTION ENGINE EXTENSION
// ═══════════════════════════════════════════════════
// Adds task management, execution timer, active recall,
// discipline tracking, exam mode, and performance dashboard
// WITHOUT modifying existing v4 code.
// ═══════════════════════════════════════════════════

const SYSTEM_V5 = {
  // ───────────────────────────────────────────────────
  // 1. TASK ENGINE
  // ───────────────────────────────────────────────────
  tasks: [],
  activeTaskId: null,

  addTask: function(title, subject, timeRequired, type = 'P2', recallDone = false) {
    const task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      subject,
      timeRequired, // in minutes
      type, // P1 (priority 1) or P2 (priority 2)
      status: 'pending', // pending, active, completed
      recallDone,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      focusedSeconds: 0,
      recallScore: null, // 'good', 'partial', 'fail'
    };
    this.tasks.push(task);
    this.saveToStorage();
    this.renderTaskList();
    return task;
  },

  startTask: function(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Stop any active task
    if (this.activeTaskId) {
      const prevTask = this.tasks.find(t => t.id === this.activeTaskId);
      if (prevTask) prevTask.status = 'pending';
      this.stopTimer();
    }
    
    task.status = 'active';
    task.startedAt = task.startedAt || Date.now();
    this.activeTaskId = taskId;
    this.saveToStorage();
    this.startTimer(task.timeRequired);
    this.renderTaskList();
    this.updateTaskUIIndicator();
  },

  completeTask: function(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.status = 'completed';
    task.completedAt = Date.now();
    if (task.id === this.activeTaskId) {
      this.stopTimer();
      this.activeTaskId = null;
      this.timerRunning = false;
      this.focusSessions.push({
        taskId: task.id,
        title: task.title,
        subject: task.subject,
        focusedSeconds: task.focusedSeconds || 0,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
      });
      this.focusSessions = this.focusSessions.slice(-100);
    }
    this.saveToStorage();
    this.renderTaskList();
    this.updateTaskUIIndicator();
    this.showRecallBox(task);
    return task;
  },

  deleteTask: function(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
      this.timerRunning = false;
    }
    this.saveToStorage();
    this.renderTaskList();
  },

  renderTaskList: function() {
    const container = document.getElementById('task-list');
    if (!container) {
      this.createTaskListContainer();
      return;
    }
    
    let html = '<div style="margin-bottom:10px;font-family:\'Orbitron\',monospace;font-size:11px;letter-spacing:2px;color:var(--accent)">⚙️ V5 EXECUTION ENGINE</div>';
    
    // Exam mode filter
    let displayTasks = this.examMode ? this.tasks.filter(t => t.type === 'P1') : this.tasks;
    
    if (displayTasks.length === 0) {
      html += '<div style="text-align:center;padding:20px;font-family:\'Share Tech Mono\',monospace;font-size:10px;color:var(--dim)">NO TASKS YET</div>';
      container.innerHTML = html;
      return;
    }
    
    displayTasks.forEach(task => {
      const isActive = task.id === this.activeTaskId;
      const statusColor = task.status === 'completed' ? 'var(--green)' : isActive ? 'var(--cyan)' : 'var(--dim)';
      const statusIcon = task.status === 'completed' ? '✓' : isActive ? '▶' : '○';
      const typeBadge = task.type === 'P1' ? '<span style="color:var(--red);border-color:var(--red)">P1</span>' : '<span style="color:var(--orange);border-color:var(--orange)">P2</span>';
      
      html += `
        <div style="border:1px solid var(--border);padding:10px;margin-bottom:7px;background:rgba(255,255,255,.02)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="color:${statusColor};font-size:13px">${statusIcon}</span>
            <span style="font-weight:600;color:white;flex:1">${this.esc(task.title)}</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border:1px solid;color:var(--gold);border-color:var(--gold)">${task.type}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-bottom:6px">
            <span style="color:var(--dim)">${this.esc(task.subject)} • ${task.timeRequired}min</span>
            <span style="color:var(--accent)">${task.recallDone ? '🎯 Recall done' : ''}</span>
          </div>
          <div style="display:flex;gap:5px">
            ${task.status === 'pending' ? `<button onclick="SYSTEM_V5.startTask('${task.id}')" style="flex:1;padding:6px;background:var(--accent);color:white;border:none;font-family:'Rajdhani',sans-serif;cursor:pointer;font-size:10px">START</button>` : ''}
            ${task.status === 'active' ? `<button onclick="SYSTEM_V5.toggleTimer()" style="flex:1;padding:6px;background:var(--orange);color:white;border:none;font-family:'Rajdhani',sans-serif;cursor:pointer;font-size:10px">${this.timerRunning ? 'PAUSE' : 'RESUME'}</button><button onclick="SYSTEM_V5.completeTask('${task.id}')" style="flex:1;padding:6px;background:var(--green);color:white;border:none;font-family:'Rajdhani',sans-serif;cursor:pointer;font-size:10px">FINISH</button>` : ''}
            <button onclick="SYSTEM_V5.deleteTask('${task.id}')" style="padding:6px 10px;background:rgba(255,58,92,.1);color:var(--red);border:1px solid var(--red);font-family:'Rajdhani',sans-serif;cursor:pointer;font-size:10px">DELETE</button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  },

  createTaskListContainer: function() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    const container = document.createElement('div');
    container.id = 'task-list';
    container.style.cssText = 'border:1px solid var(--border);padding:12px;background:linear-gradient(135deg,rgba(10,17,40,.97),rgba(7,12,26,.97));margin-bottom:10px';
    
    // Insert at the top of the content area
    content.insertBefore(container, content.firstChild);
    this.renderTaskList();
  },

  // ───────────────────────────────────────────────────
  // 2. EXECUTION TIMER
  // ───────────────────────────────────────────────────
  timerRunning: false,
  timerValue: 0, // in seconds
  timerInterval: null,
  timerStartedAt: null,
  timerLastTickAt: null,
  timerTaskId: null,
  timerStorageKey: 'system_v5_timer',

  startTimer: function(minutes) {
    this.timerValue = minutes * 60;
    this.timerRunning = true;
    this.timerStartedAt = Date.now();
    this.timerLastTickAt = Date.now();
    this.timerTaskId = this.activeTaskId;
    this.persistTimerState();
    
    // Ensure timer display exists
    if (!document.getElementById('timer')) {
      this.createTimerDisplay();
    }
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - this.timerLastTickAt) / 1000));
      if (!elapsed) return;
      this.recordFocusedTime(now);
      this.timerValue = Math.max(0, this.timerValue - elapsed);
      this.timerLastTickAt = now;
      this.persistTimerState();
      this.updateTimerDisplay();
      
      if (this.timerValue <= 0) {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        this.onTimerComplete();
      }
    }, 1000);
    
    this.updateTimerDisplay();
  },

  stopTimer: function() {
    this.recordFocusedTime();
    this.timerRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.clearTimerState();
    this.timerTaskId = null;
    this.saveToStorage();
    this.updateStats();
  },

  pauseTimer: function() {
    if (!this.timerRunning) return;
    this.recordFocusedTime();
    this.timerRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.persistTimerState();
    this.updateTimerDisplay();
  },

  resumeTimer: function() {
    if (this.timerRunning || this.timerValue <= 0 || !this.timerTaskId) return;
    this.timerRunning = true;
    this.timerLastTickAt = Date.now();
    this.persistTimerState();
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - this.timerLastTickAt) / 1000));
      if (!elapsed) return;
      this.recordFocusedTime(now);
      this.timerValue = Math.max(0, this.timerValue - elapsed);
      this.timerLastTickAt = now;
      this.persistTimerState();
      this.updateTimerDisplay();
      if (this.timerValue <= 0) {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.clearTimerState();
        this.onTimerComplete();
      }
    }, 1000);
  },

  toggleTimer: function() {
    if (this.timerRunning) this.pauseTimer();
    else this.resumeTimer();
    this.renderTaskList();
  },

  recordFocusedTime: function(now = Date.now()) {
    if (!this.timerRunning || !this.timerLastTickAt || !this.timerTaskId) return;
    const task = this.tasks.find(t => t.id === this.timerTaskId);
    if (!task) return;
    const elapsed = Math.max(0, Math.floor((now - this.timerLastTickAt) / 1000));
    task.focusedSeconds = (task.focusedSeconds || 0) + elapsed;
    this.timerLastTickAt = now;
  },

  persistTimerState: function() {
    try {
      localStorage.setItem(this.timerStorageKey, JSON.stringify({
        timerRunning: this.timerRunning,
        timerValue: this.timerValue,
        timerStartedAt: this.timerStartedAt,
        timerLastTickAt: this.timerLastTickAt,
        timerTaskId: this.timerTaskId,
        savedAt: Date.now(),
      }));
      this.saveToStorage();
    } catch (e) { console.error('Failed to save timer state:', e); }
  },

  clearTimerState: function() {
    try { localStorage.removeItem(this.timerStorageKey); } catch (e) {}
  },

  restoreTimerState: function() {
    try {
      const stored = localStorage.getItem(this.timerStorageKey);
      if (!stored) {
        const abandoned = this.tasks.find(t => t.id === this.activeTaskId && t.status === 'active');
        if (abandoned) {
          abandoned.status = 'pending';
          abandoned.abandonedAt = Date.now();
          this.activeTaskId = null;
          this.saveToStorage();
          this.showV5Toast('INTERRUPTED SESSION RETURNED TO PENDING', 'orange');
        }
        return;
      }
      const state = JSON.parse(stored);
      const task = this.tasks.find(t => t.id === state.timerTaskId && t.status === 'active');
      if (!task || !state.timerValue) {
        this.clearTimerState();
        return;
      }
      if (Date.now() - (state.savedAt || Date.now()) > 24 * 60 * 60 * 1000) {
        task.status = 'pending';
        task.abandonedAt = Date.now();
        this.activeTaskId = null;
        this.clearTimerState();
        this.saveToStorage();
        this.showV5Toast('ABANDONED SESSION RETURNED TO PENDING', 'orange');
        return;
      }
      this.activeTaskId = task.id;
      this.timerValue = state.timerValue;
      this.timerStartedAt = state.timerStartedAt;
      this.timerLastTickAt = state.timerLastTickAt || Date.now();
      this.timerTaskId = state.timerTaskId;
      this.timerRunning = false;
      this.updateTimerDisplay();
      this.showV5Toast('FOCUS SESSION RECOVERED — PRESS RESUME', 'cyan');
    } catch (e) { this.clearTimerState(); }
  },

  updateTimerDisplay: function() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    
    const mins = Math.floor(this.timerValue / 60);
    const secs = this.timerValue % 60;
    const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerEl.textContent = display;
    
    // Color intensity based on remaining time
    if (this.timerValue <= 60) {
      timerEl.style.color = 'var(--red)';
      timerEl.style.textShadow = '0 0 12px rgba(255,58,92,.8)';
    } else if (this.timerValue <= 300) {
      timerEl.style.color = 'var(--orange)';
      timerEl.style.textShadow = '0 0 12px rgba(255,123,0,.8)';
    } else {
      timerEl.style.color = 'var(--cyan)';
      timerEl.style.textShadow = '0 0 12px rgba(0,212,255,.8)';
    }
  },

  createTimerDisplay: function() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    
    const timerEl = document.createElement('div');
    timerEl.id = 'timer';
    timerEl.style.cssText = 'font-family:\'Share Tech Mono\',monospace;font-size:14px;font-weight:bold;color:var(--cyan);text-shadow:0 0 8px rgba(0,212,255,.6);padding:0 12px;border-left:1px solid var(--border)';
    timerEl.textContent = '00:00';
    topbar.appendChild(timerEl);
  },

  onTimerComplete: function() {
    const task = this.tasks.find(t => t.id === this.activeTaskId);
    if (task) {
      this.showRecallBox(task);
      const audio = new AudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;
      if (audio) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.5);
        osc.start(audio.currentTime);
        osc.stop(audio.currentTime + 0.5);
      }
    }
  },

  // ───────────────────────────────────────────────────
  // 3. ACTIVE RECALL SYSTEM
  // ───────────────────────────────────────────────────
  showRecallBox: function(task) {
    const container = document.getElementById('recall-box');
    if (!container) {
      this.createRecallBox();
      this.showRecallBox(task); // recursive call to use newly created container
      return;
    }
    
    container.innerHTML = `
      <div style="border:2px solid var(--cyan);padding:16px;background:rgba(0,212,255,.08);border-radius:4px">
        <div style="font-family:'Orbitron',monospace;font-size:12px;letter-spacing:2px;color:var(--cyan);margin-bottom:12px">🎯 ACTIVE RECALL</div>
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:white;margin-bottom:6px;font-weight:600">${this.esc(task.title)}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim)">How well did you recall what you learned?</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="SYSTEM_V5.recordRecall('${task.id}','good')" style="flex:1;padding:10px;background:var(--green);color:white;border:none;font-family:'Rajdhani',sans-serif;font-weight:600;cursor:pointer">GOOD ✓</button>
          <button onclick="SYSTEM_V5.recordRecall('${task.id}','partial')" style="flex:1;padding:10px;background:var(--orange);color:white;border:none;font-family:'Rajdhani',sans-serif;font-weight:600;cursor:pointer">PARTIAL ~</button>
          <button onclick="SYSTEM_V5.recordRecall('${task.id}','fail')" style="flex:1;padding:10px;background:var(--red);color:white;border:none;font-family:'Rajdhani',sans-serif;font-weight:600;cursor:pointer">FAIL ✗</button>
        </div>
      </div>
    `;
    
    container.classList.add('show');
  },

  recordRecall: function(taskId, score) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.recallScore = score;
    task.recallDone = true;
    
    // Update stats
    if (score === 'good') {
      this.stats.recallAccuracy = Math.min(100, (this.stats.recallAccuracy || 0) + 5);
    } else if (score === 'partial') {
      this.stats.recallAccuracy = Math.max(0, (this.stats.recallAccuracy || 50) - 2);
    } else {
      this.stats.recallAccuracy = Math.max(0, (this.stats.recallAccuracy || 50) - 10);
    }
    
    this.saveToStorage();
    this.renderTaskList();
    
    const recallBox = document.getElementById('recall-box');
    if (recallBox) recallBox.classList.remove('show');
    
    const msg = score === 'good' ? '✓ Excellent recall!' : score === 'partial' ? '~ Partial recall' : '✗ Review needed';
    this.showV5Toast(msg, score === 'good' ? 'green' : score === 'partial' ? 'orange' : 'red');
  },

  createRecallBox: function() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    const container = document.createElement('div');
    container.id = 'recall-box';
    container.style.cssText = 'margin-bottom:10px;display:none';
    container.classList.add('recall-box-v5');
    
    content.insertBefore(container, content.firstChild);
  },

  // ───────────────────────────────────────────────────
  // 4. DISCIPLINE ENGINE
  // ───────────────────────────────────────────────────
  disciplineScore: 100,

  initDisciplineTracking: function() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.activeTaskId) {
        this.disciplineViolation();
      }
    }, { passive: true });
  },

  disciplineViolation: function() {
    this.disciplineScore = Math.max(0, this.disciplineScore - 10);
    this.stats.disciplineScore = this.disciplineScore;
    
    alert('⚠ SYSTEM BREACH DETECTED\nYou left the window during an active task.\nDiscipline score: -10 (now ' + this.disciplineScore + '%)');
    
    this.saveToStorage();
  },

  // ───────────────────────────────────────────────────
  // 5. EXAM MODE
  // ───────────────────────────────────────────────────
  examMode: false,

  toggleExamMode: function() {
    this.examMode = !this.examMode;
    
    if (this.examMode) {
      document.body.classList.add('exam-mode');
      this.showV5Toast('EXAM MODE: ACTIVE — P1 Tasks Only', 'cyan');
    } else {
      document.body.classList.remove('exam-mode');
      this.showV5Toast('EXAM MODE: INACTIVE', 'dim');
    }
    
    this.saveToStorage();
    this.renderTaskList();
  },

  // ───────────────────────────────────────────────────
  // 6. PERFORMANCE DASHBOARD STATS
  // ───────────────────────────────────────────────────
  stats: {
    deepWorkTime: 0, // in seconds
    tasksCompleted: 0,
    recallAccuracy: 50, // percentage
    disciplineScore: 100, // percentage
  },

  updateStats: function() {
    // Update deepWorkTime (sum of all completed task timeRequired)
    this.stats.deepWorkTime = this.tasks
      .reduce((sum, t) => sum + (t.focusedSeconds || 0), 0);
    
    this.stats.tasksCompleted = this.tasks.filter(t => t.status === 'completed').length;
    
    // Update UI elements if they exist
    this.updateStatDisplay('stat-hours', this.formatSeconds(this.stats.deepWorkTime));
    this.updateStatDisplay('stat-tasks', this.stats.tasksCompleted);
    this.updateStatDisplay('stat-recall', Math.round(this.stats.recallAccuracy) + '%');
    this.updateStatDisplay('stat-discipline', Math.round(this.stats.disciplineScore) + '%');
    
    this.saveToStorage();
  },

  updateStatDisplay: function(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = value;
    }
  },

  formatSeconds: function(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  },

  // ───────────────────────────────────────────────────
  // 7. DAILY LOG SYSTEM
  // ───────────────────────────────────────────────────
  dailyLogs: [],
  focusSessions: [],

  endDayLog: function() {
    const summary = prompt('Enter your daily summary:', '');
    if (summary === null) return; // user cancelled
    
    const log = {
      date: new Date().toISOString().split('T')[0],
      summary: summary,
      tasksCompleted: this.stats.tasksCompleted,
      deepWorkTime: this.stats.deepWorkTime,
      recallAccuracy: this.stats.recallAccuracy,
      disciplineScore: this.stats.disciplineScore,
      timestamp: Date.now(),
    };
    
    this.dailyLogs.push(log);
    this.saveToStorage();
    
    console.log('📋 DAILY LOG SAVED:', log);
    console.table(log);
    
    this.showV5Toast('📋 Daily log saved', 'green');
  },

  // ───────────────────────────────────────────────────
  // STORAGE & HELPER FUNCTIONS
  // ───────────────────────────────────────────────────
  DB_KEY_V5: 'system_v5',

  saveToStorage: function() {
    try {
      const data = {
        tasks: this.tasks,
        activeTaskId: this.activeTaskId,
        examMode: this.examMode,
        stats: this.stats,
        disciplineScore: this.disciplineScore,
        dailyLogs: this.dailyLogs,
        focusSessions: this.focusSessions,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.DB_KEY_V5, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save SYSTEM_V5 data:', e);
    }
  },

  loadFromStorage: function() {
    try {
      const stored = localStorage.getItem(this.DB_KEY_V5);
      if (stored) {
        const data = JSON.parse(stored);
        this.tasks = data.tasks || [];
        this.activeTaskId = data.activeTaskId || null;
        this.examMode = data.examMode || false;
        this.stats = Object.assign({}, this.stats, data.stats || {});
        this.disciplineScore = data.disciplineScore || 100;
        this.dailyLogs = data.dailyLogs || [];
        this.focusSessions = data.focusSessions || [];
      }
    } catch (e) {
      console.error('Failed to load SYSTEM_V5 data:', e);
    }
  },

  showV5Toast: function(msg, type = '') {
    // Use existing v4 toast if available
    if (window.showToast) {
      showToast(msg, type);
    } else {
      console.log('[V5 TOAST]', msg);
    }
  },

  esc: function(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  updateTaskUIIndicator: function() {
    if (!this.activeTaskId) return;
    const task = this.tasks.find(t => t.id === this.activeTaskId);
    if (!task) return;
    // Optional: highlight active task visually
  },

  // ───────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────
  init: function() {
    this.loadFromStorage();
    this.restoreTimerState();
    this.initDisciplineTracking();
    
    // Apply exam mode class if active
    if (this.examMode) {
      document.body.classList.add('exam-mode');
    }
    
    // Create UI containers if needed
    if (!document.getElementById('task-list')) {
      this.createTaskListContainer();
    }
    if (!document.getElementById('recall-box')) {
      this.createRecallBox();
    }
    if (!document.getElementById('timer')) {
      this.createTimerDisplay();
    }
    
    this.renderTaskList();
    this.updateStats();
    
    console.log('✓ SYSTEM v5 Execution Engine initialized');
    console.log('Available commands:', {
      addTask: 'SYSTEM_V5.addTask(title, subject, timeRequired, type)',
      startTask: 'SYSTEM_V5.startTask(taskId)',
      completeTask: 'SYSTEM_V5.completeTask(taskId)',
      deleteTask: 'SYSTEM_V5.deleteTask(taskId)',
      toggleExamMode: 'SYSTEM_V5.toggleExamMode()',
      endDayLog: 'SYSTEM_V5.endDayLog()',
      recordRecall: 'SYSTEM_V5.recordRecall(taskId, score)',
    });
  }
};

// ═══════════════════════════════════════════════════
// AUTO-INITIALIZE ON DOM READY
// ═══════════════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SYSTEM_V5.init());
} else {
  SYSTEM_V5.init();
}

// ═══════════════════════════════════════════════════
// ADD CUSTOM STYLES FOR V5
// ═══════════════════════════════════════════════════
const style = document.createElement('style');
style.textContent = `
/* EXAM MODE INDICATOR */
body.exam-mode::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--red), var(--orange), var(--red));
  z-index: 501;
  animation: examPulse 2s ease-in-out infinite;
}

@keyframes examPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* RECALL BOX STYLING */
.recall-box-v5.show {
  display: block;
  animation: recallSlide 0.4s ease;
}

@keyframes recallSlide {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* TIMER DISPLAY */
#timer {
  font-weight: bold;
  min-width: 50px;
  text-align: center;
}

/* TASK LIST STYLING */
#task-list {
  animation: taskListSlide 0.3s ease;
}

@keyframes taskListSlide {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;
document.head.appendChild(style);
