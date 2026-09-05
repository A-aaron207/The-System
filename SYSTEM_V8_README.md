# SYSTEM v8 - Learning Engine

SYSTEM v8 turns completed study tasks into active recall and spaced-repetition records. It runs locally and uses the existing v5 task engine.

## Study to recall

When a v5 study task finishes, v8 opens a recall check:

1. Explain the topic without notes.
2. Rate confidence from 1 to 5.
3. Receive the next review date and retention estimate.

Each topic keeps its own history in `localStorage['system_v8_learning']` and stores its latest learning fields on the task:

- `recallConfidence`
- `nextReviewAt`
- `retention`

## Scheduling

The local scheduler uses review intervals of 1, 3, 7, 14, 30, and 60 days. Low confidence resets the repetition count and schedules a next-day review. Confidence 3 advances cautiously, confidence 4 advances normally, and confidence 5 advances with a larger interval multiplier.

```javascript
V8.records
V8.dueRecords()
V8.reviewTask(V8.records[0])
V8.submit(1) // confidence from 1 to 5
```

## Dashboard

The home dashboard includes:

- Due review count
- Aggregate retention estimate
- Next review timing
- A review queue for due topics

Selecting a due topic opens the same confidence recall flow. The v5 recall accuracy statistic is synchronized from the v8 confidence history when available.
