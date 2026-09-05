# SYSTEM v9 - Local Neural Layer

SYSTEM v9 is a local command interface over the structured v7 performance model and v8 learning engine. It does not send data to an online AI service.

The v9.1 upgrade adds `system-ai-model.js`, a compact deterministic semantic layer with token normalization, synonym aliases, intent similarity scoring, confidence margins, and entity extraction. It improves paraphrase handling without pretending to be a hosted 0.5B-parameter neural network.

## Commands

Use the **SYSTEM AI** panel, the full-screen command interface, or the command palette entry **Ask SYSTEM AI**.

Supported intents include:

- `What should I do?`
- `Show my performance`
- `Start focus`
- `What reviews are due?`
- `Deploy a mission`
- `Add quest called Revise vectors`
- `Make a plan for my day`
- `Why did you choose this mission?`
- `Show my weekly progress`
- `Shorter`
- `Challenge me`
- `Remember that my exam is next month`
- `What do you remember?`
- `That helped`
- `Not useful`
- `Help`

Typing `commands`, `list commands`, or `available commands` returns the complete categorized command catalog. The dashboard also displays: **TYPE COMMANDS TO LIST ALL USABLE COMMANDS.**

## Parameters

V9 keeps a small local parameter model so its answers can reflect your current situation:

- `energy`: low, normal, or high
- `availableMinutes`: the time you have available
- `preferredMode`: focus, grind, recovery, or hardcore
- Current phase of day, active quests, overdue quests, streak, and due reviews

Examples:

```text
I have 25 minutes
I am tired
Set focus mode
What are my parameters?
What is overdue?
Give me today's summary
```

Parameters are stored under `localStorage['system_v9_parameters']`. Recommendations now report time fit, energy guidance, difficulty, and the evidence behind the choice.

## Reasoning layer

V9 classifies each request, attaches confidence metadata to responses, and combines multiple data sources into short plans. A daily plan can include the first due review, the oldest overdue quest, and the current v7 recommendation. Trend queries compare the latest seven daily records. Reasoning queries expose the selected category score and evidence instead of returning a black-box answer.

The `shorter` and `challenge me` follow-ups update the parameters to a 15-minute low-energy protocol or a 60-minute high-energy protocol. These constraints persist and affect later recommendations.

## Memory and feedback

V9 can store short personal notes locally under `localStorage['system_v9_memory']`. It retains the latest 50 notes and can recall the latest five in response to memory queries. Feedback changes the planning bias: `That helped` records a follow-through preference, while `Not useful` marks the next recommendation for reconsideration.

The planner also respects the available-minute budget. It will prioritize due recall and overdue work before the v7 mission, and will omit steps that do not fit the stated time.

Commands return an explanation and may perform a bounded action. For example, review commands open the first due v8 topic, focus commands open focus mode, and deployment commands create the current v7 recommendation.

## Storage

Recent commands and responses are stored locally under `localStorage['system_v9_ai_history']`. Only the latest 30 entries are retained.

## Architecture

V9 does not replace the v7 or v8 engines. It reads their structured outputs:

- `V7.performance()` and `V7.recommendation()` for performance and mission decisions
- `V8.dueRecords()` and `V8.reviewTask()` for learning reviews
- Existing quest and focus controls for execution actions

The service worker uses a versioned v9 cache and pre-caches `system-v9.js`.
