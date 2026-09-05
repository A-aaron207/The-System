// SYSTEM AI MODEL — compact local semantic inference layer
// This is a deterministic browser model, not a claim of a hosted 0.5B parameter network.

const SYSTEM_AI_MODEL = {
  version: '0.5-local-1',
  intents: {
    plan: 'plan schedule organize roadmap routine agenda next steps',
    explain: 'why reason explain because logic evidence chose recommendation',
    trend: 'week weekly trend progress history improve improving decline compare',
    review: 'review recall remember study revise revision flashcards retention learn',
    performance: 'performance stats score index metrics doing measure analyze',
    execution: 'focus pomodoro deep work start begin concentrate session',
    mission: 'mission deploy generate recommend priority task objective',
    overdue: 'overdue late behind deadline missed unfinished urgent',
    today: 'today daily summary done completed active phase',
    parameters: 'parameter setting context energy minutes available mode know',
    memory: 'memory note notes remember goals exam save personal',
    feedback: 'helped useful good wrong bad improve feedback correction',
    help: 'help commands capabilities options what can do',
    addQuest: 'add create new quest task called named',
  },
  aliases: {
    pls: 'please',
    asap: 'urgent',
    pomodoro: 'focus',
    revise: 'review',
    revision: 'review',
    studying: 'study',
    organised: 'organize',
    organise: 'organize',
    quicker: 'shorter',
    tired: 'low energy',
    exhausted: 'low energy',
    motivated: 'high energy',
    wiped: 'low energy',
    drained: 'low energy',
  },

  tokenize(text) {
    return String(text || '').toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(token => this.aliases[token] || token)
      .flatMap(token => token.split(' '));
  },

  vector(text) {
    const tokens = this.tokenize(text);
    const vector = Object.create(null);
    tokens.forEach(token => { vector[token] = (vector[token] || 0) + 1; });
    return vector;
  },

  similarity(left, right) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    let dot = 0;
    let leftLength = 0;
    let rightLength = 0;
    keys.forEach(key => {
      dot += (left[key] || 0) * (right[key] || 0);
      leftLength += (left[key] || 0) ** 2;
      rightLength += (right[key] || 0) ** 2;
    });
    return leftLength && rightLength ? dot / Math.sqrt(leftLength * rightLength) : 0;
  },

  extract(text) {
    const source = String(text || '').toLowerCase();
    const minutes = source.match(/(?:have|for|available|got|in)\s+(\d+)\s*(?:minutes?|mins?)/);
    const energy = source.match(/\b(low|normal|high|tired|focused|exhausted|motivated|wiped|drained)\s*(?:energy)?\b/);
    const mode = source.match(/\b(focus|grind|recovery|hardcore)\s*mode\b/);
    const confidence = source.match(/\b([1-5])\s*(?:out of 5|\/5)\b/);
    return {
      minutes: minutes ? Math.max(1, Math.min(720, Number(minutes[1]))) : null,
      energy: energy ? (['tired', 'exhausted', 'wiped', 'drained'].includes(energy[1]) ? 'low' : energy[1] === 'focused' || energy[1] === 'motivated' ? 'high' : energy[1]) : null,
      mode: mode ? mode[1] : null,
      confidence: confidence ? Number(confidence[1]) : null,
    };
  },

  classify(text) {
    const input = this.vector(text);
    const results = Object.entries(this.intents).map(([intent, prototype]) => ({
      intent,
      score: this.similarity(input, this.vector(prototype)),
    }));
    const source = String(text || '').toLowerCase();
    const boosters = [
      ['plan', /\b(plan|schedule|roadmap|organize)\b/],
      ['explain', /\b(why|explain|reason)\b/],
      ['review', /\b(review|recall|revise|flashcard)\b/],
      ['execution', /\b(focus|pomodoro|deep work)\b/],
      ['mission', /\b(deploy|mission|recommend)\b/],
      ['overdue', /\b(overdue|late|behind)\b/],
      ['memory', /\b(remember|memory|note|goal)\b/],
      ['feedback', /\b(helped|useful|wrong|bad)\b/],
    ];
    boosters.forEach(([intent, pattern]) => {
      if (pattern.test(source)) {
        const result = results.find(item => item.intent === intent);
        if (result) result.score += 0.45;
      }
    });
    results.sort((left, right) => right.score - left.score);
    const best = results[0];
    const runnerUp = results[1] || { score: 0 };
    const confidence = Math.max(0, Math.min(0.99, 0.45 + best.score - runnerUp.score));
    return { intent: best.intent, confidence, score: best.score, alternatives: results.slice(1, 3), entities: this.extract(text) };
  },
};

window.SYSTEM_AI_MODEL = SYSTEM_AI_MODEL;
