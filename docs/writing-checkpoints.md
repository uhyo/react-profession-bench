# Writing v2 Checkpoints

How to author `evaluation/v2/<spec>/checkpoints.json`. Companion to
[`docs/writing-specs.md`](writing-specs.md) (spec text authoring, still valid for
v2) and [`docs/benchmark-v2-plan.md`](benchmark-v2-plan.md) (why v2 exists). The
machine-checked shape is `evaluation/v2/checkpoint-schema.json`; this guide covers
the judgment calls the schema can't.

## The model

v1 asked the judge for six holistic 1–5 scores; discrimination died at the noisy
4-vs-5 boundary once models reliably chose modern APIs. v2 instead asks the judge to
**verify 15–25 concrete checkpoints** (met / partial / missed, with quoted
evidence). The runner computes:

```
raw_score = (Σ met_weight + 0.5 × Σ partial_weight) / Σ total_weight × 100
```

A checkpoint file is therefore the *entire* scoring surface for its spec. What you
don't write a checkpoint for, the benchmark doesn't measure.

## Tiers

| Tier | Meaning | Who passes today |
|---|---|---|
| `core` | Task-completion basics: the feature exists and works as specified. | Everything above GPT-4.1-class stubs. |
| `competent` | The correct, modern-React approach — v1's "tier-1/tier-2 anti-pattern avoided, right API chosen". | Current frontier models, usually. |
| `expert` | Craft that current frontier models get wrong regularly: race/interruption handling, focus restoration, StrictMode-safe effects, cancellation of stale async work, optimistic rollback, correct `aria-live` semantics, state preservation across remount, platform APIs where they beat hand-rolled React. | ~40–60% pass rate for the best current conditions — **by construction**, see calibration below. |

Target mix (of total *weight*, not checkpoint count): roughly **25–35% core,
35–45% competent, 25–35% expert**. The expert share is where headroom for future
models lives.

### The calibration rule (the core v2 discipline)

An `expert` checkpoint must be **empirically grounded, both ways**:

1. **Not already saturated:** at least one current frontier condition
   (fable-5-max / opus-4.8-max / gpt-5.6-sol-max in `results/`, `scores/`) fails it
   regularly. If every top model already passes it, it's `competent`, not `expert`.
   Mine past n=3 outputs — the per-spec analyses in `scores/REPORT_*.md` list what
   top models actually still get wrong; that list is the expert-tier quarry.
2. **Not aspirational:** you must be able to sketch the passing code yourself in a
   few lines. A checkpoint no implementation could realistically satisfy inside the
   spec's scope measures nothing.

During calibration (plan §5 phase 6), expert checkpoints that turn out to violate
either bound get re-tiered or rewritten before v2-第1回 is published.

## Writing good checkpoints

**Unconditional.** Every checkpoint must be evaluable on *any* submission. Never
"if they chose Context, then…". Phrase the requirement as an observable property:
"changing notification settings does not re-establish the event subscription" — a
monolith, a reducer app, and a context app can all be judged against it. When the
point *is* a specific API, name it — that's what `competent`/`expert` splits are
for (see the worked example).

**One claim per checkpoint.** If the `met_when` needs "and… and… and…", split it.
Fine-grained checkpoints are what fixed v1's coarse-grid problem; don't rebuild the
holistic blob inside a single checkpoint.

**Don't double-charge.** Two checkpoints that always co-vary (fail together on
every plausible submission) are one checkpoint with double weight — merge them.
Overlap is fine when submissions *can* split them (e.g. "subscription survives
settings changes" vs "uses `useEffectEvent` rather than a ref": a ref-based
solution passes the first and fails the second).

**Judge-checkable.** `met_when` must be decidable by reading code — no "feels
idiomatic", no "appropriate" without saying what appropriate looks like. If you
can't write the criterion concretely, you haven't decided what you're measuring.

**Anti-patterns are the 'missed' spec.** List the wrong approaches you expect
(reference `AP-nn` from `evaluation/v2/anti-patterns.md` where applicable). They
tell the judge what failure looks like, which is half of what makes verdicts
reproducible.

**Traceability.** `spec_refs` ties each checkpoint to requirement numbers in
`spec.md`. If a checkpoint traces to nothing, either the spec is missing a natural
decision point (fix the spec) or the checkpoint tests trivia (delete it).

## Weights

Integer 1–6. Default **2**. Use 1 for minor polish, 4–6 only for the spec's
centerpiece signals (the thing named in `primary_focus`). Tier does **not** imply
weight — an expert refinement of a side feature can be weight 1; a core "the feed
actually renders events" can be weight 4, because losing it should crater the
score.

Category emphasis (v1's per-spec `rubric_weights`) is now expressed by where the
weight sits: a spec emphasizing effect hygiene simply carries more total checkpoint
weight tagged `effect_hygiene`. Check the distribution over category × tier before
finalizing; every spec should still tag at least 4 of the 6 categories so category
trend lines stay meaningful.

## Worked example (from spec 006)

v1's expected-signal ("useEffectEvent for notification handling", with tier-1/2/3
anti-patterns) becomes **two** checkpoints — the outcome and the modern-API
refinement — so a ref-based solution lands between a naive one and an expert one
instead of collapsing into the 4-vs-5 coin flip:

```json
{
  "id": "006-C04",
  "tier": "competent",
  "category": "effect_hygiene",
  "weight": 4,
  "title": "Subscription survives notification-settings changes",
  "requirement": "Changing sound/toast/keyword/severity settings does not re-establish the event subscription.",
  "met_when": "The subscribing effect's dependency array excludes all notification settings, and the event handler still acts on current settings when an event arrives (via useEffectEvent, or a ref that is reliably kept current).",
  "partial_when": "Only some settings avoid the dependency array, or the handler can read stale settings in some paths.",
  "anti_patterns": [
    "All settings in the effect dependency array — reconnect on every change (missed events during reconnection)",
    "eslint-disable on exhaustive-deps to hide the dependency (stale closure risk)"
  ],
  "spec_refs": ["Requirement 8"]
},
{
  "id": "006-C05",
  "tier": "expert",
  "category": "effect_hygiene",
  "weight": 2,
  "title": "useEffectEvent, not a manual ref, for latest-value reads",
  "requirement": "Latest-value reads inside the subscription/auto-save effects use useEffectEvent rather than the manual ref workaround.",
  "met_when": "Handlers needing current settings/notes are wrapped in useEffectEvent and are not listed in the owning effect's dependencies.",
  "anti_patterns": [
    "useRef + a sync effect (or manual assignment) to smuggle latest values into the effect — works, but is the pattern useEffectEvent replaces"
  ],
  "spec_refs": ["Requirement 8", "Requirements 14-16"]
}
```

And a `core` sibling for the same feature area:

```json
{
  "id": "006-C01",
  "tier": "core",
  "category": "effect_hygiene",
  "weight": 3,
  "title": "Subscription is established and cleaned up",
  "requirement": "The app subscribes to the event source on mount and disconnects on unmount.",
  "met_when": "A single effect establishes the connection and returns a cleanup that disconnects (AP-04 absent).",
  "spec_refs": ["Requirement 1"]
}
```

## Checklist before committing a checkpoint file

- [ ] Validates against `checkpoint-schema.json`; ids sequential, unique.
- [ ] 15–25 checkpoints; tier mix within the target weight bands.
- [ ] Every expert checkpoint cites its evidence trail (which past runs fail it) in
      the PR/commit message — reviewers should not have to trust your intuition.
- [ ] Every checkpoint unconditional, single-claim, judge-checkable.
- [ ] No pair of checkpoints that must co-vary.
- [ ] ≥ 4 categories represented; weight distribution matches the spec's intent
      (`docs/spec-intents/`).
- [ ] `spec_refs` present on every checkpoint that maps to a numbered requirement.
