# SYSTEM v7 - Intelligence Layer

SYSTEM v7 adds a local decision engine above the v6 adaptive dashboard. It uses existing quests, deadlines, category history, daily history, focus sessions, and recall accuracy. No network AI or external service is required.

## Performance model

`V7.performance()` returns:

- `execution`: completed quests divided by tracked quests
- `discipline`: penalty derived from overdue quests
- `focus`: recent focused seconds compared with a 14-day target
- `learning`: v5 recall accuracy when the v5 engine is available
- `consistency`: average completion rate across recent daily records
- `index`: weighted SYSTEM INDEX from all five dimensions

```javascript
V7.performance()
V7.recommendation()
```

## Adaptive recommendations

V7 identifies the lowest-scoring category, explains the reason, and chooses a difficulty based on category performance:

- E / 15 minutes: rebuild
- D / 20 minutes: stabilize
- C / 25 minutes: develop
- B / 35 minutes: advance
- A / 45 minutes: challenge

Use the dashboard button or call:

```javascript
V7.generateMission()
```

Generated quests are marked `isV7: true`, include their selected rank, and are blocked when an unfinished v7 mission already exists for that category.

## Dashboard

The v7 panel displays the SYSTEM INDEX, execution, discipline, focus, learning, and consistency scores, plus the selected weakness, priority, reason, recommended mission, and dynamic difficulty. Quest completion refreshes the model immediately.
