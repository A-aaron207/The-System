// SYSTEM v8 — ACTIVE RECALL AND SPACED REPETITION
// Converts completed study tasks into scheduled learning reviews.

const V8 = {
  version: '8.0.0',
  storageKey: 'system_v8_learning',
  intervals: [1, 3, 7, 14, 30, 60],
  records: [],
  pendingTask: null,

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      this.records = Array.isArray(data.records) ? data.records : [];
    } catch {
      this.records = [];
    }
  },

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        version: this.version,
        records: this.records.slice(-500),
        savedAt: Date.now(),
      }));
    } catch {}
  },

  recordFor(task) {
    return this.records.find(record => record.taskId === task.id) || null;
  },

  ensureRecord(task) {
    let record = this.recordFor(task);
    if (!record) {
      record = {
        taskId: task.id,
        topic: task.title,
        subject: task.subject,
        confidence: null,
        repetitions: 0,
        intervalDays: 0,
        ease: 2.5,
        retention: 50,
        nextReviewAt: null,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.records.push(record);
    }
    return record;
  },

  dueRecords(now = Date.now()) {
    return this.records.filter(record => record.nextReviewAt && record.nextReviewAt <= now);
  },

  nextReviewLabel(timestamp) {
    if (!timestamp) return 'NOT SCHEDULED';
    const days = Math.max(0, Math.ceil((timestamp - Date.now()) / 86400000));
    if (days <= 0) return 'DUE NOW';
    if (days === 1) return 'TOMORROW';
    return `IN ${days} DAYS`;
  },

  schedule(record, confidence) {
    const index = Math.max(0, Math.min(this.intervals.length - 1, record.repetitions));
    const multiplier = confidence <= 2 ? 0 : confidence === 3 ? 0.65 : confidence === 4 ? 1 : 1.25;
    const intervalDays = confidence <= 2 ? 1 : Math.max(1, Math.round(this.intervals[index] * multiplier));
    record.intervalDays = intervalDays;
    record.nextReviewAt = Date.now() + intervalDays * 86400000;
    record.repetitions = confidence <= 2 ? 0 : record.repetitions + 1;
    record.ease = Math.max(1.3, Math.min(3.2, record.ease + (confidence - 3) * 0.12));
    record.retention = Math.round(Math.max(0, Math.min(100, 45 + confidence * 10 + record.repetitions * 5)));
  },

  begin(task) {
    if (!task) return;
    this.pendingTask = task;
    const record = this.ensureRecord(task);
    const modal = document.getElementById('v8RecallOverlay');
    if (!modal) return;
    const title = document.getElementById('v8RecallTopic');
    const subject = document.getElementById('v8RecallSubject');
    const due = document.getElementById('v8RecallDue');
    if (title) title.textContent = record.topic;
    if (subject) subject.textContent = record.subject || 'GENERAL STUDY';
    if (due) due.textContent = record.nextReviewAt ? `PREVIOUS REVIEW: ${this.nextReviewLabel(record.nextReviewAt)}` : 'FIRST RECALL';
    document.querySelectorAll('.v8-confidence').forEach(button => button.classList.remove('selected'));
    document.getElementById('v8RecallResult').textContent = 'Recall the topic without notes, then rate your confidence.';
    modal.classList.add('show');
  },

  submit(confidence) {
    const task = this.pendingTask;
    if (!task || confidence < 1 || confidence > 5) return;
    const record = this.ensureRecord(task);
    record.confidence = confidence;
    record.history.push({ confidence, reviewedAt: Date.now() });
    record.history = record.history.slice(-30);
    this.schedule(record, confidence);
    task.recallScore = confidence >= 4 ? 'good' : confidence === 3 ? 'partial' : 'fail';
    task.recallConfidence = confidence;
    task.nextReviewAt = record.nextReviewAt;
    task.retention = record.retention;
    this.save();
    if (typeof SYSTEM_V5 !== 'undefined') {
      SYSTEM_V5.stats.recallAccuracy = this.learningAccuracy();
      SYSTEM_V5.saveToStorage();
    }
    const result = document.getElementById('v8RecallResult');
    if (result) result.textContent = `NEXT REVIEW ${this.nextReviewLabel(record.nextReviewAt)} · RETENTION ${record.retention}%`;
    document.querySelectorAll('.v8-confidence').forEach(button => button.classList.toggle('selected', Number(button.dataset.confidence) === confidence));
    setTimeout(() => {
      document.getElementById('v8RecallOverlay')?.classList.remove('show');
      this.pendingTask = null;
      this.render();
    }, 900);
  },

  learningAccuracy() {
    const reviewed = this.records.filter(record => record.confidence !== null);
    if (!reviewed.length) return 50;
    return Math.round(reviewed.reduce((sum, record) => sum + record.confidence * 20, 0) / reviewed.length);
  },

  reviewTask(record) {
    const task = typeof SYSTEM_V5 !== 'undefined' ? SYSTEM_V5.tasks.find(item => item.id === record.taskId) : null;
    this.begin(task || { id: record.taskId, title: record.topic, subject: record.subject });
  },

  render() {
    const due = this.dueRecords();
    const next = this.records.filter(record => record.nextReviewAt).sort((a, b) => a.nextReviewAt - b.nextReviewAt)[0];
    const dueCount = document.getElementById('v8DueCount');
    if (dueCount) dueCount.textContent = due.length;
    const retention = document.getElementById('v8Retention');
    if (retention) retention.textContent = `${this.learningAccuracy()}%`;
    const nextReview = document.getElementById('v8NextReview');
    if (nextReview) nextReview.textContent = next ? this.nextReviewLabel(next.nextReviewAt) : 'NONE';
    const list = document.getElementById('v8ReviewList');
    if (!list) return;
    if (!due.length) {
      list.innerHTML = '<div class="v8-empty">NO REVIEWS DUE. COMPLETE A STUDY TASK TO SCHEDULE ONE.</div>';
      return;
    }
    list.innerHTML = due.slice(0, 4).map(record => `
      <button class="v8-review-item" onclick="V8.reviewTask(V8.records.find(record => record.taskId === '${record.taskId}'))">
        <span><strong>${this.escape(record.topic)}</strong><small>${this.escape(record.subject || 'GENERAL STUDY')}</small></span>
        <span class="v8-review-action">RECALL →</span>
      </button>`).join('');
  },

  escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
  },

  patchV5() {
    if (typeof SYSTEM_V5 === 'undefined' || SYSTEM_V5._v8Patched) return;
    const originalRecall = SYSTEM_V5.showRecallBox;
    SYSTEM_V5.showRecallBox = task => this.begin(task);
    SYSTEM_V5._v8Patched = true;
    this.originalRecall = originalRecall;
  },

  init() {
    this.load();
    this.patchV5();
    this.render();
    setInterval(() => this.render(), 60000);
    console.log(`⚡ SYSTEM V8 (${this.version}) initialized`);
  },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => V8.init());
else V8.init();

window.V8 = V8;
