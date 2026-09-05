// SYSTEM v7 — LOCAL INTELLIGENCE LAYER
// Performance model, weakness detection, dynamic difficulty, and recommendations.

const V7 = {
  version: '7.0.0',
  categories: ['STRENGTH', 'INTELLIGENCE', 'DISCIPLINE', 'FOCUS', 'CREATIVITY', 'SOCIAL'],
  weights: { execution: 0.3, discipline: 0.2, focus: 0.2, learning: 0.15, consistency: 0.15 },

  getState() {
    return typeof S === 'undefined' ? null : S;
  },

  categoryModel(category) {
    const state = this.getState();
    if (!state) return null;
    const now = Date.now();
    const quests = (state.quests || []).filter(q => q.cat === category && !q.isPenaltyQuest);
    const completed = quests.filter(q => q.done).length;
    const overdue = quests.filter(q => !q.done && q.deadline && q.deadline < now).length;
    const total = quests.length;
    const execution = total ? Math.round((completed / total) * 100) : 50;
    const discipline = total ? Math.max(0, Math.round(100 - (overdue / total) * 100)) : 50;
    const history = state.catDone?.[category] || 0;
    const mastery = Math.min(100, history * 5);
    const score = Math.round(execution * 0.55 + discipline * 0.25 + mastery * 0.2);
    return { category, total, completed, overdue, execution, discipline, mastery, score };
  },

  performance() {
    const state = this.getState();
    if (!state) return null;
    const models = this.categories.map(category => this.categoryModel(category));
    const quests = (state.quests || []).filter(q => !q.isPenaltyQuest);
    const completed = quests.filter(q => q.done).length;
    const overdue = quests.filter(q => !q.done && q.deadline && q.deadline < Date.now()).length;
    const execution = quests.length ? Math.round((completed / quests.length) * 100) : 50;
    const discipline = quests.length ? Math.max(0, Math.round(100 - (overdue / quests.length) * 100)) : 50;
    const sessions = (state.focusSessions || []).slice(-14);
    const focusSeconds = sessions.reduce((sum, session) => sum + (session.focusedSeconds || 0), 0);
    const focus = Math.min(100, Math.round((focusSeconds / (14 * 25 * 60)) * 100));
    const recall = typeof SYSTEM_V5 !== 'undefined' ? Number(SYSTEM_V5.stats?.recallAccuracy || 50) : 50;
    const days = Object.values(state.weekStats || {}).slice(-7).filter(day => day && day.total > 0);
    const consistency = days.length ? Math.round(days.reduce((sum, day) => sum + (day.done / day.total) * 100, 0) / days.length) : 50;
    const index = Math.round(
      execution * this.weights.execution +
      discipline * this.weights.discipline +
      focus * this.weights.focus +
      recall * this.weights.learning +
      consistency * this.weights.consistency
    );
    const weakest = [...models].sort((a, b) => a.score - b.score || a.completed - b.completed)[0];
    return { models, execution, discipline, focus, learning: recall, consistency, index, weakest };
  },

  difficulty(model) {
    if (model.score < 45) return { rank: 'E', minutes: 15, label: 'REBUILD' };
    if (model.score < 65) return { rank: 'D', minutes: 20, label: 'STABILIZE' };
    if (model.score < 80) return { rank: 'C', minutes: 25, label: 'DEVELOP' };
    if (model.score < 92) return { rank: 'B', minutes: 35, label: 'ADVANCE' };
    return { rank: 'A', minutes: 45, label: 'CHALLENGE' };
  },

  recommendation() {
    const performance = this.performance();
    if (!performance) return null;
    const model = performance.weakest;
    const difficulty = this.difficulty(model);
    const category = model.category.charAt(0) + model.category.slice(1).toLowerCase();
    const reasons = [];
    if (model.total === 0) reasons.push(`no recent ${category} missions`);
    if (model.execution < 70) reasons.push(`${model.execution}% completion`);
    if (model.overdue > 0) reasons.push(`${model.overdue} overdue mission${model.overdue === 1 ? '' : 's'}`);
    if (!reasons.length) reasons.push(`lowest category score at ${model.score}%`);
    return {
      performance,
      model,
      difficulty,
      category,
      mission: this.missionFor(model.category),
      reason: reasons.join(' + '),
      priority: model.score < 50 ? 'HIGH' : model.score < 75 ? 'MEDIUM' : 'LOW',
    };
  },

  missionFor(category) {
    const missions = {
      STRENGTH: 'Complete a 20-minute strength session',
      INTELLIGENCE: 'Study one difficult concept and solve 5 problems',
      DISCIPLINE: 'Clear your highest-priority task without switching',
      FOCUS: 'Complete one distraction-free focus session',
      CREATIVITY: 'Generate 10 solutions to one real problem',
      SOCIAL: 'Have one meaningful conversation or help someone',
    };
    return missions[category] || missions.FOCUS;
  },

  generateMission() {
    const recommendation = this.recommendation();
    const state = this.getState();
    if (!recommendation || !state) return;
    const existing = state.quests?.some(q => q.isV7 && !q.done && q.cat === recommendation.model.category);
    if (existing) {
      showToast('V7 MISSION ALREADY ACTIVE', 'orange');
      return;
    }
    const task = {
      id: `v7_${Date.now()}`,
      name: `[V7] ${recommendation.mission}`,
      diff: recommendation.difficulty.rank,
      cat: recommendation.model.category,
      deadline: null,
      done: false,
      penalized: false,
      repeat: false,
      isPenaltyQuest: false,
      isAdaptive: true,
      isV7: true,
      createdAt: Date.now(),
    };
    state.quests.unshift(task);
    state.todayTotal = (state.todayTotal || 0) + 1;
    state.v7Generated = (state.v7Generated || 0) + 1;
    addLog(`V7 recommendation deployed: "${task.name}" [${task.diff}]`);
    save(state);
    render();
    this.render();
    showToast(`V7 MISSION DEPLOYED · ${recommendation.difficulty.label}`, 'green');
  },

  render() {
    const recommendation = this.recommendation();
    if (!recommendation) return;
    const performance = recommendation.performance;
    const values = {
      v7Index: `${performance.index}`,
      v7Weakness: recommendation.model.category,
      v7Priority: `PRIORITY ${recommendation.priority}`,
      v7Recommendation: recommendation.mission,
      v7Reason: recommendation.reason,
      v7Difficulty: `${recommendation.difficulty.rank}-RANK · ${recommendation.difficulty.minutes} MIN`,
      v7Execution: `${performance.execution}`,
      v7Discipline: `${performance.discipline}`,
      v7Focus: `${performance.focus}`,
      v7Learning: `${performance.learning}`,
      v7Consistency: `${performance.consistency}`,
      v7MissionText: `${recommendation.model.category} · ${recommendation.mission}`,
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
    const indexBar = document.getElementById('v7IndexBar');
    if (indexBar) indexBar.style.width = `${performance.index}%`;
    const weakBar = document.getElementById('v7WeakBar');
    if (weakBar) weakBar.style.width = `${recommendation.model.score}%`;
  },

  init() {
    this.render();
    setInterval(() => this.render(), 60000);
    console.log(`⚡ SYSTEM V7 (${this.version}) initialized`);
  },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => V7.init());
else V7.init();

const v7CompleteQuest = window.completeQ;
if (typeof v7CompleteQuest === 'function' && !v7CompleteQuest._v7Wrapped) {
  const wrappedCompleteQuest = function(id) {
    v7CompleteQuest(id);
    V7.render();
  };
  wrappedCompleteQuest._v7Wrapped = true;
  window.completeQ = wrappedCompleteQuest;
}

window.V7 = V7;
