// SYSTEM v9 — LOCAL NEURAL INTERFACE
// Natural-language commands over the structured v7 and v8 engines.

const V9 = {
  version: '9.1.0',
  history: [],
  storageKey: 'system_v9_ai_history',
  parameterKey: 'system_v9_parameters',
  memoryKey: 'system_v9_memory',
  memory: [],
  parameters: {
    energy: 'normal',
    availableMinutes: null,
    preferredMode: 'focus',
    priorityBias: 'balanced',
  },

  init() {
    this.load();
    this.renderHistory();
    this.renderStatus();
    this.addPaletteCommand();
    console.log(`⚡ SYSTEM V9 (${this.version}) initialized · semantic model ${typeof SYSTEM_AI_MODEL !== 'undefined' ? SYSTEM_AI_MODEL.version : 'fallback'}`);
  },

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      this.history = Array.isArray(data) ? data.slice(-30) : [];
    } catch {
      this.history = [];
    }
    try {
      const stored = JSON.parse(localStorage.getItem(this.parameterKey) || '{}');
      this.parameters = Object.assign({}, this.parameters, stored);
    } catch {}
    try {
      const stored = JSON.parse(localStorage.getItem(this.memoryKey) || '[]');
      this.memory = Array.isArray(stored) ? stored.slice(-50) : [];
    } catch { this.memory = []; }
  },

  save() {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.history.slice(-30))); } catch {}
  },

  saveParameters() {
    try { localStorage.setItem(this.parameterKey, JSON.stringify(this.parameters)); } catch {}
  },

  saveMemory() {
    try { localStorage.setItem(this.memoryKey, JSON.stringify(this.memory.slice(-50))); } catch {}
  },

  commandCatalog() {
    return [
      ['Planning', 'What should I do next? · Make a plan for my day · Organize my schedule'],
      ['Performance', 'Show my performance · What is my SYSTEM INDEX? · Show my weekly progress'],
      ['Learning', 'What reviews are due? · Recall queue · What do I need to remember?'],
      ['Execution', 'Start focus · Begin a Pomodoro · Start a deep work session'],
      ['Missions', 'Deploy a mission · Generate an adaptive mission · Show mission'],
      ['Tasks', 'Add quest called Revise algebra · What is overdue? · Give me today\'s summary'],
      ['Parameters', 'I have 25 minutes · I am tired · Set focus mode · What are my parameters?'],
      ['Memory', 'Remember that my exam is next month · What do you remember?'],
      ['Feedback', 'That helped · Not useful · Challenge me · Shorter'],
      ['System', 'Why did you choose this? · Help · Commands'],
    ];
  },

  commandList() {
    return `AVAILABLE COMMANDS: ${this.commandCatalog().map(([group, examples]) => `${group}: ${examples}`).join(' | ')}`;
  },

  context() {
    const state = typeof S === 'undefined' ? {} : S;
    const now = Date.now();
    const quests = state.quests || [];
    const active = quests.filter(q => !q.done && !q.isPenaltyQuest);
    const overdue = active.filter(q => q.deadline && q.deadline < now);
    const hour = new Date().getHours();
    const phase = hour >= 5 && hour < 11 ? 'BOOT' : hour >= 11 && hour < 18 ? 'EXECUTION' : hour >= 18 && hour < 22 ? 'EVALUATION' : 'RECOVERY';
    return {
      phase,
      hour,
      activeCount: active.length,
      overdueCount: overdue.length,
      dueReviews: typeof V8 !== 'undefined' ? V8.dueRecords().length : 0,
      todayDone: state.todayDone || 0,
      streak: state.streak || 0,
      energy: this.parameters.energy,
      availableMinutes: this.parameters.availableMinutes,
      preferredMode: this.parameters.preferredMode,
    };
  },

  inferIntent(query) {
    const intents = [
      ['plan', /plan|schedule|roadmap|organize/],
      ['explain', /why|reason|explain|because/],
      ['trend', /week|trend|improving|progress|history/],
      ['review', /review|recall|remember|study/],
      ['performance', /performance|stats|index|score/],
      ['execution', /focus|pomodoro|deep work|start/],
      ['mission', /mission|deploy|recommend|priority/],
      ['parameters', /parameter|setting|context|energy|minutes/],
    ];
    const matches = intents.map(([intent, pattern]) => ({ intent, score: (query.match(pattern) || []).length })).filter(item => item.score);
    return matches.sort((a, b) => b.score - a.score)[0] || { intent: 'unknown', score: 0 };
  },

  plan(context, recommendation, due, state) {
    const budget = context.availableMinutes || 60;
    const steps = [];
    let used = 0;
    if (due.length && used + Math.min(10, budget) <= budget) {
      const minutes = Math.min(10, budget);
      steps.push(`Recall ${due[0].topic} (${minutes} min)`);
      used += minutes;
    }
    const overdue = state ? (state.quests || []).filter(q => !q.done && q.deadline && q.deadline < Date.now()) : [];
    if (overdue.length && used + Math.min(15, budget - used) <= budget) {
      const minutes = Math.min(15, budget - used);
      steps.push(`Resolve ${overdue[0].name} (${minutes} min)`);
      used += minutes;
    }
    if (recommendation && used + recommendation.difficulty.minutes <= budget) {
      steps.push(`${recommendation.mission} (${recommendation.difficulty.minutes} min)`);
      used += recommendation.difficulty.minutes;
    }
    if (!steps.length) steps.push('Start a 25-minute focus session to establish a baseline.');
    const total = steps.reduce((sum, step) => sum + Number(step.match(/\((\d+) min\)/)?.[1] || 0), 0);
    return { steps: steps.slice(0, 3), total };
  },

  remember(note) {
    const value = String(note || '').trim();
    if (!value) return 'I need something specific to remember.';
    this.memory.push({ text: value, createdAt: Date.now() });
    this.saveMemory();
    return `MEMORY STORED: ${value}`;
  },

  memorySummary() {
    if (!this.memory.length) return 'NO PERSONAL MEMORY STORED.';
    return `MEMORY: ${this.memory.slice(-5).map(item => item.text).join(' | ')}`;
  },

  weekSummary(state) {
    const days = Object.entries(state?.weekStats || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    if (!days.length) return 'NOT ENOUGH HISTORY. Complete more daily cycles to establish a trend.';
    const scores = days.map(([, day]) => day.total ? Math.round((day.done / day.total) * 100) : 0);
    const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const first = scores[0];
    const last = scores[scores.length - 1];
    const direction = last > first ? 'IMPROVING' : last < first ? 'DECLINING' : 'STABLE';
    return `7-DAY TREND: ${direction}. Average execution ${average}%. Change from first to latest recorded day: ${last - first >= 0 ? '+' : ''}${last - first} points.`;
  },

  addPaletteCommand() {
    if (typeof V6 === 'undefined' || !V6.palette?.build || V6.palette._v9Patched) return;
    const originalBuild = V6.palette.build.bind(V6.palette);
    V6.palette.build = () => {
      originalBuild();
      V6.palette.commands.unshift({ icon: '◈', label: 'Ask SYSTEM AI', hint: 'Natural-language command', action: () => V9.open() });
      V6.palette.filtered = [...V6.palette.commands];
    };
    V6.palette._v9Patched = true;
  },

  open() {
    document.getElementById('v9Overlay')?.classList.add('show');
    document.getElementById('v9Input')?.focus();
    this.renderHistory();
  },

  close() {
    document.getElementById('v9Overlay')?.classList.remove('show');
  },

  submitFromInput() {
    const input = document.getElementById('v9Input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.ask(text);
  },

  ask(input) {
    const text = String(input || '').trim();
    if (!text) return null;
    const response = this.respond(text);
    const semantic = typeof SYSTEM_AI_MODEL !== 'undefined' ? SYSTEM_AI_MODEL.classify(text) : this.inferIntent(text.toLowerCase());
    this.history.push({ input: text, response: response.text, intent: semantic.intent, confidence: response.confidence || semantic.confidence || 0.8, timestamp: Date.now() });
    this.save();
    this.renderHistory();
    this.renderStatus();
    if (response.action) response.action();
    return response;
  },

  respond(input) {
    const query = input.toLowerCase().replace(/[?!.,]/g, '').trim();
    const performance = typeof V7 !== 'undefined' ? V7.performance() : null;
    const recommendation = typeof V7 !== 'undefined' ? V7.recommendation() : null;
    const due = typeof V8 !== 'undefined' ? V8.dueRecords() : [];
    const state = typeof S !== 'undefined' ? S : null;
    const context = this.context();
    const intent = this.inferIntent(query);
    const semantic = typeof SYSTEM_AI_MODEL !== 'undefined' ? SYSTEM_AI_MODEL.classify(input) : intent;
    const semanticIntent = semantic.intent;

    if (semantic.entities?.minutes && !/what|how|plan|recommend/.test(query)) {
      this.parameters.availableMinutes = semantic.entities.minutes;
      this.saveParameters();
    }
    if (semantic.entities?.energy && !/what|how|plan|recommend/.test(query)) {
      this.parameters.energy = semantic.entities.energy;
      this.saveParameters();
    }

    if (/^(hi|hello|hey|system)$/.test(query)) {
      return { text: `SYSTEM ONLINE. ${context.phase} PHASE. Energy: ${context.energy}. State your objective.`, action: null };
    }
    if (/^(commands|list commands|show commands|available commands|command list)$/.test(query)) {
      return { text: this.commandList(), action: null, confidence: 0.99 };
    }
    const rememberMatch = query.match(/^(?:remember|note|save this)\s*:?[ ]*(.+)/);
    if (rememberMatch) {
      return { text: this.remember(rememberMatch[1]), action: null, confidence: 0.99 };
    }
    if (/what do you remember|show memory|my notes|my goals/.test(query)) {
      return { text: this.memorySummary(), action: null, confidence: 0.99 };
    }
    if (/that helped|good recommendation|useful/.test(query)) {
      this.parameters.priorityBias = 'follow-through';
      this.saveParameters();
      return { text: 'FEEDBACK LOGGED: recommendation was useful. Future plans will preserve this priority style.', action: null, confidence: 0.98 };
    }
    if (/not useful|wrong recommendation|that did not help|bad recommendation/.test(query)) {
      this.parameters.priorityBias = 'reconsider';
      this.saveParameters();
      return { text: 'FEEDBACK LOGGED: recommendation missed. Future plans will reconsider the current priority.', action: null, confidence: 0.98 };
    }
    const minutesMatch = query.match(/(?:i have|for|available|got)\s+(\d+)\s*(?:minutes?|mins?)/);
    if (minutesMatch) {
      this.parameters.availableMinutes = Math.max(1, Math.min(720, Number(minutesMatch[1])));
      this.saveParameters();
      return { text: `TIME PARAMETER SET: ${this.parameters.availableMinutes} MINUTES. Recalculating mission fit.`, action: () => this.renderStatus() };
    }
    const energyMatch = query.match(/(?:energy|feeling|feel)\s+(low|normal|high|tired|focused)/);
    if (energyMatch) {
      this.parameters.energy = energyMatch[1] === 'tired' ? 'low' : energyMatch[1] === 'focused' ? 'high' : energyMatch[1];
      this.saveParameters();
      return { text: `ENERGY PARAMETER SET: ${this.parameters.energy.toUpperCase()}. Recommendations will adjust difficulty.`, action: () => this.renderStatus() };
    }
    if (/low energy|i am tired|i'm tired/.test(query)) {
      this.parameters.energy = 'low';
      this.saveParameters();
      return { text: 'ENERGY PARAMETER SET: LOW. The System will favor short, high-certainty actions.', action: () => this.renderStatus() };
    }
    if (/high energy|i am focused|i'm focused/.test(query)) {
      this.parameters.energy = 'high';
      this.saveParameters();
      return { text: 'ENERGY PARAMETER SET: HIGH. The System will allow challenge work.', action: () => this.renderStatus() };
    }
    if (/parameters|settings|what do you know about me|context/.test(query) || semanticIntent === 'parameters') {
      return { text: `PARAMETERS: energy ${context.energy}; time ${context.availableMinutes ? `${context.availableMinutes} min` : 'unset'}; mode ${context.preferredMode}; phase ${context.phase}; ${context.activeCount} active quests; ${context.dueReviews} reviews due.`, action: null };
    }
    if (/plan my day|make a plan|build a plan|schedule my day|what is my plan/.test(query) || (semanticIntent === 'plan' && /day|schedule|organize|roadmap/.test(query))) {
      const dailyPlan = this.plan(context, recommendation, due, state);
      return { text: `PLAN (${dailyPlan.total || 'flexible'} MIN): ${dailyPlan.steps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`, action: null, confidence: 0.98 };
    }
    if ((/why|explain|reason/.test(query) || semanticIntent === 'explain') && recommendation) {
      return { text: `REASONING TRACE: ${recommendation.model.category} scored ${recommendation.model.score}%. Evidence: ${recommendation.reason}. The System selected ${recommendation.difficulty.rank}-rank difficulty to match current performance.`, action: null, confidence: 0.96 };
    }
    if (/what should i do|what next|recommend|priority|^(?:show )?mission$/.test(query)) {
      if (!recommendation) return { text: 'SYSTEM DATA INSUFFICIENT. Complete one mission to establish a baseline.', action: null };
      const fitsTime = !context.availableMinutes || recommendation.difficulty.minutes <= context.availableMinutes;
      const fit = fitsTime ? 'TIME FIT: YES' : `TIME FIT: NO, YOU SET ${context.availableMinutes} MINUTES`;
      const energyNote = context.energy === 'low' ? 'LOW ENERGY: choose the shortest version.' : context.energy === 'high' ? 'HIGH ENERGY: challenge permitted.' : 'ENERGY: standard load.';
      const feedback = this.parameters.priorityBias === 'reconsider' ? 'FEEDBACK FLAG: verify this choice before starting.' : '';
      return { text: `${recommendation.priority} PRIORITY: ${recommendation.mission}. Reason: ${recommendation.reason}. Difficulty: ${recommendation.difficulty.rank}-RANK, ${recommendation.difficulty.minutes} minutes. ${fit}. ${energyNote} ${feedback}`, action: null };
    }
    if (/system index|performance|how am i doing|stats/.test(query) || semanticIntent === 'performance') {
      if (!performance) return { text: 'SYSTEM INDEX UNAVAILABLE. No performance state loaded.', action: null };
      return { text: `SYSTEM INDEX ${performance.index}/100. Execution ${performance.execution}, discipline ${performance.discipline}, focus ${performance.focus}, learning ${performance.learning}, consistency ${performance.consistency}. Weakest area: ${performance.weakest.category}.`, action: null, confidence: 0.99 };
    }
    if (/week|trend|improving|progress|history/.test(query) || semanticIntent === 'trend') {
      return { text: this.weekSummary(state), action: null, confidence: 0.94 };
    }
    if (/overdue|late|behind/.test(query) || semanticIntent === 'overdue') {
      const overdue = state ? (state.quests || []).filter(q => !q.done && q.deadline && q.deadline < Date.now()) : [];
      if (!overdue.length) return { text: 'NO OVERDUE QUESTS. Execution queue is clean.', action: null };
      return { text: `${overdue.length} OVERDUE: ${overdue.slice(0, 4).map(q => q.name).join('; ')}. Resolve the oldest first.`, action: () => goPage('quests', document.getElementById('nb-quests')) };
    }
    if (/today|daily summary|day summary/.test(query) || semanticIntent === 'today') {
      return { text: `TODAY: ${context.todayDone} cleared, ${context.activeCount} active, ${context.overdueCount} overdue, ${context.dueReviews} reviews due, streak ${context.streak}. CURRENT PHASE: ${context.phase}.`, action: null };
    }
    if (/shorter|less time|quick version/.test(query)) {
      this.parameters.availableMinutes = 15;
      this.parameters.energy = 'low';
      this.saveParameters();
      return { text: 'CONSTRAINT UPDATED: 15-MINUTE LOW-ENERGY PROTOCOL. Recommendations recalculated.', action: () => this.renderStatus(), confidence: 0.97 };
    }
    if (/longer|more time|challenge me/.test(query)) {
      this.parameters.availableMinutes = 60;
      this.parameters.energy = 'high';
      this.saveParameters();
      return { text: 'CONSTRAINT UPDATED: 60-MINUTE HIGH-ENERGY PROTOCOL. Challenge work permitted.', action: () => this.renderStatus(), confidence: 0.97 };
    }
    const modeMatch = query.match(/(?:set|switch|use)\s+(?:to\s+)?(focus|grind|recovery|hardcore)\s+mode/);
    if (modeMatch) {
      this.parameters.preferredMode = modeMatch[1];
      this.saveParameters();
      return { text: `MODE PARAMETER SET: ${modeMatch[1].toUpperCase()}.`, action: () => { if (state) { state.mode = modeMatch[1]; save(state); render(); } } };
    }
    if (/review|recall|study queue|what do i need to remember/.test(query) || semanticIntent === 'review') {
      if (!due.length) return { text: 'NO REVIEWS DUE. Complete a study task and the System will schedule recall.', action: () => V8?.render() };
      const topics = due.slice(0, 3).map(record => record.topic).join('; ');
      return { text: `${due.length} REVIEW${due.length === 1 ? '' : 'S'} DUE: ${topics}.`, action: () => V8?.reviewTask?.(due[0]) };
    }
    if (/^(start|begin).*(focus|pomodoro|deep work)|focus session/.test(query) || semanticIntent === 'execution') {
      return { text: 'FOCUS SESSION READY. Select a duration and begin.', action: () => V6?.focusMode?.open() };
    }
    if (/deploy|generate|create.*mission|adaptive mission/.test(query) || semanticIntent === 'mission') {
      return { text: recommendation ? `DEPLOYING ${recommendation.difficulty.rank}-RANK ${recommendation.model.category} MISSION.` : 'PERFORMANCE DATA REQUIRED BEFORE DEPLOYMENT.', action: () => V7?.generateMission?.() };
    }
    const addMatch = query.match(/^(?:add|create) (?:a )?(?:quest|task) (?:called |named )?(.+)/);
    if (addMatch && state) {
      const name = addMatch[1].trim();
      return { text: `QUEST QUEUED: ${name}. Opening quest entry.`, action: () => { goPage('quests', document.getElementById('nb-quests')); const field = document.getElementById('qname'); if (field) { field.value = name; field.focus(); } } };
    }
    if (/help|commands|what can you do/.test(query) || semanticIntent === 'help') {
      return { text: 'TYPE COMMANDS TO LIST ALL USABLE COMMANDS. I can also build plans, explain recommendations, remember notes, learn from feedback, report trends, inspect parameters, set energy or time, summarize today, list overdue work, start focus, show reviews, deploy missions, or prepare quests.', action: null };
    }
    return { text: 'COMMAND UNCLEAR. Try: “What should I do?”, “Show my performance”, “Start focus”, or “What reviews are due?”', action: null };
  },

  executeLast() {
    const item = this.history[this.history.length - 1];
    if (!item) return;
    const result = this.respond(item.input);
    if (result.action) result.action();
  },

  renderHistory() {
    const markup = this.history.length ? this.history.slice(-4).map(item => {
      const query = this.escape(item.input);
      const response = this.escape(item.response);
      return '<div class="v9-entry"><div class="v9-query">&gt; ' + query + '</div><div class="v9-response">' + response + '</div></div>';
    }).join('') : '';
    const content = markup || '<div class="v9-empty">NO SYSTEM QUERIES YET.</div>';
    const list = document.getElementById('v9History');
    if (list) list.innerHTML = content;
    const overlayList = document.getElementById('v9OverlayHistory');
    if (overlayList) overlayList.innerHTML = content;
  },

  renderStatus() {
    const status = document.getElementById('v9Status');
    if (!status) return;
    const index = typeof V7 !== 'undefined' ? V7.performance()?.index : null;
    const due = typeof V8 !== 'undefined' ? V8.dueRecords().length : 0;
    const time = this.parameters.availableMinutes ? `${this.parameters.availableMinutes}M` : 'TIME —';
    status.textContent = `LOCAL MODEL · INDEX ${index ?? '—'} · ${due} REVIEWS · ${this.parameters.energy.toUpperCase()} · ${time} · MEM ${this.memory.length}`;
  },

  escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => V9.init());
else V9.init();

window.V9 = V9;
