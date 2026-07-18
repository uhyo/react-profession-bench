# Benchmark v2 Plan

Status: **draft — core decisions settled 2026-07-18** (see §6). Nothing in v1 changes.

v1 is saturating: frontier models cluster at 78–87 on a scale whose practical ceiling
is ~98, and Fable 5 (max) has already recorded a 100. This document diagnoses why,
and proposes a v2 that restores headroom for several future model generations while
fixing the known defects in the evaluator prompt. v2 is the "deliberate, announced
re-baseline" that the v1 freeze policy anticipated — v1 stays frozen and runnable,
v2 starts a new comparable series.

## 1. Evidence of saturation

From the committed n=3 score files (`scores/multi_*.json`):

| condition | mean | max | runs ≥95 |
|---|--:|--:|--:|
| sonnet-5 | 78.2 | 96 | 1/39 |
| gpt-5.6-sol max | 80.2 | 98 | 3/39 |
| fable-5 | 81.3 | 98 | 2/39 |
| opus-4.8 max | 84.0 | 98 | 3/39 |
| fable-5 max | 86.7 | **100** | 8/39 |

Per-spec, for top models:

- **Saturated (top-model means ≥ ~90):** 001 (90–95), 002 (89–94 at max), 012 (92–98,
  pinned at 98 for every frontier run since 第3回), 013 (85–93).
- **Still discriminating:** 004 (70–88), 005 (65–86), 006 (66–76), 008, 009, 010, 011.
- **Category level:** TypeScript Quality is dead at ~4.8/5 — unmoved by generation
  *and* by effort (第7–13回). State Architecture / Effect Hygiene are close behind.

## 2. Why v1 saturates — four root causes

1. **The rubric caps at competence, not excellence.** The expected-signals tiering is
   "tier-1 anti-pattern → 1–2, tier-2 outdated → 3, correct modern API → 4–5"
   (`docs/writing-specs.md`). Once a model reliably picks the modern API, the only
   remaining discrimination is the noisy 4-vs-5 "minor issues" boundary. There is no
   tier above "did the expected thing."
2. **Coarse scale.** 6 categories × integer 1–5, weighted → scores land on a coarse
   grid over an effective 20–100 range. Distinct-quality implementations collapse to
   the same number.
3. **Some specs are too easy for 2026 models.** 001 and 012 no longer create decision
   points that frontier models get wrong.
4. **Judge ceiling and judge noise.** A single Sonnet 4.6 holistic judgment carries
   ±10–15 pts of run-to-run noise, and a mid-2026 judge may not even recognize
   subtleties that separate late-2026+ models. 100% of the score is that one
   stochastic call.

## 3. v2 design

### 3.1 Scoring: checkpoint-based, true 0–100

Replace the holistic 1–5-per-category judgment with **per-spec scored checkpoints**:

- Each spec's `expected-signals.json` (v2 schema) defines **15–25 concrete
  checkpoints**, each with a weight, a category tag (the six v1 categories survive as
  tags, so category-level trend analysis continues), and a tier:
  - **core** — task completion basics; weak models fail these.
  - **competent** — the v1 "correct modern approach" signals.
  - **expert** — deliberately calibrated so that *current* frontier models hit only
    ~40–60%: race/interruption handling, focus restoration on dynamic updates,
    StrictMode-safe effects, cancellation of stale async work, optimistic rollback on
    failure, correct `aria-live` semantics, state preservation across remount, etc.
- The judge returns a verdict per checkpoint — `met` / `partial` / `missed` — **with a
  code quote as evidence**. Verifying a concrete checkpoint is a much easier task than
  holistic taste, which (a) reduces judge noise, (b) reduces dependence on the judge
  model's own React ability, (c) makes scores auditable.
- `score = Σ(met_weight + 0.5·partial_weight) / Σ(total_weight) × 100` — a true
  0–100 scale. The expert tier is where future-model headroom lives: at calibration,
  the best current condition should land around **70–75**, not 87.

**Gates (computed by the runner, not the judge):**

- `tsc -b --noEmit` failure → score × 0.6, both raw and gated values recorded.
  (v1's biggest known grey zone: 008 runs scored 67–85 while not compiling.)
- Stub/no-op submission detection stays implicit (core checkpoints all fail → near 0,
  which the true-0 scale now actually expresses).
- Optional later (v2.1): an automated smoke test (vite build + a few Playwright
  assertions per spec) as a functional gate.

### 3.2 Evaluator fixes (the "outdated prompt" cleanup)

All of these are known-stale lines that were deliberately left untouched to preserve
the v1 baseline. v2 is the re-baseline, so they get fixed **in the v2 rubric only**:

1. **Remove the phantom static-analysis layer.** `rubric.md:10` ("Review the static
   analysis results provided alongside the code") and the whole framing in
   `anti-patterns.md:3` (AST analyzer, base-100, −15/−10/−5 deductions, structural
   metrics table) describe a subsystem that has never existed. v2 rewrites
   anti-patterns.md as what it really is: a reference catalog the judge applies while
   reading.
2. **Fix the score-range statements.** `rubric.md:3` and `:195` say 0–100; the real
   v1 range is 20–100. Moot under checkpoint scoring (true 0–100), but the text must
   match the new math exactly.
3. **Fix the formula prose.** `rubric.md:214` says "divide by 5, multiply by 20"
   (yields 2000). Replace with the actual v2 formula.
4. **De-overfit the shared rubric from spec 001.** `rubric.md:33-37, 80-84, 148-153`
   reference `wordCount`, the preview sidebar, form steps, and the modal — spec-001
   artifacts fed to the judge for all 13 specs. v2: the shared rubric contains only
   generic category guidance; all spec-specific "what to look for" lives in that
   spec's checkpoint file.
5. *(Verified non-issue:* the `useEffectEvent` = React 19.2 claim is correct — it
   shipped stable in 19.2 — and the scaffold (react 19.2.4, vite 8, TS 5.9, strict) is
   current. No changes needed there.)*

**Judge protocol changes:**

- **Re-pin the judge** to `sonnet-5` (version-pinned), with `--effort` now pinned
  *explicitly* (v1 deliberately passed none; v2 sets the baseline on purpose).
  No cross-vendor audit judge: a second vendor is not reliably available (extra
  subscriptions, availability windows), so it can't be part of the standing protocol.
  The bias exposure is accepted and mitigated structurally — checkpoint verdicts with
  quoted evidence leave far less room for vendor taste than holistic 1–5 scores, and
  the verdicts are auditable by hand.
- **Judge calls: k=1 by default.** Evaluator runs are not cheap, and k=3 per
  implementation would noticeably slow a full sweep. Instead, during calibration
  (§5), re-judge one full anchor sample 3× to *measure* residual judge-side variance
  under checkpoint scoring. Only if per-spec judge noise is still large (> ~±5)
  does a `--judge-k 3` (median per checkpoint) option get turned on for reports.
  (Implementation-side noise is still handled by the n=3 whole-benchmark
  methodology, unchanged.)
- **Structured output via enforced JSON schema / tool call** instead of "return ONLY
  JSON" + `repairJsonEscapes` (which exists because parsing broke 5+ times in v1).

### 3.3 Spec portfolio (14 specs: 9 kept + 2 redesigned + 3 new)

Suite size is capped at **14** (one more than v1) to keep full n=3 sweep cost in
check. Retiring two specs frees the slots for three new ones.

- **Retire:** 001 (event form), 012 (multi-tab editor) — no decision points left at
  the frontier.
- **Redesign harder successors:** 002 → dashboard with a real performance budget and
  interruption-heavy filtering; 013 → undo/redo with selective/grouped undo and
  persistence (both currently 85–94 at the top). 012's ideas can return inside a
  harder editor spec (diff view / collaborative cursors) later.
- **Keep with v2 checkpoint files:** 003, 004, 005, 006, 007, 008, 009, 010, 011 —
  spec text mostly untouched (they still discriminate); discrimination is restored by
  adding expert-tier checkpoints, which is much cheaper than authoring new specs.
- **New specs (3), targeting the measured blind spots** (every report since 第7回
  shows all models missing these):
  1. **Refactoring task** (new task *type*): the model receives a working-but-awful
     monolithic implementation plus a change request; score = quality of the result
     and of the diff. This doubles as the **decomposition stress test** — breaking up
     the monolith *is* the task — covering the one dimension that cleanly separated
     GPT-5.6 from Claude, while measuring reading-and-improving-code, the closest
     thing to real professional work.
  2. **Async actions app** — forces `useTransition`/`useActionState`/`useOptimistic`/
     `useFormStatus` interplay with failure rollback and concurrent edits.
  3. **Imperative animation spec** (GitHub issue #1): transient animations —
     enter/exit of list items, reorder (FLIP), attention flashes — where the expert
     move is `Element#animate` (Web Animations API) driven from refs, *not*
     state-toggled CSS classes with `useEffect`/`setTimeout` re-render churn. Expert
     checkpoints: animation interruption/cancellation on rapid updates, cleanup,
     `prefers-reduced-motion`, and keeping transient visual state out of React state
     entirely.

**Modern web API thread.** Beyond React APIs, v2 checkpoints deliberately reward
reaching for the platform where it beats hand-rolled React: the new animation spec
(WAAPI, possibly `document.startViewTransition`), plus expert-tier checkpoints in
kept specs where natural — e.g. `IntersectionObserver` for feed visibility in 007,
`navigator.clipboard` / `matchMedia` where specs touch them, alongside v1's existing
Popover API / CSS anchor positioning (011) and `<dialog>` (009) signals. Rule: the
platform API must be the *genuinely better* choice, so the checkpoint measures
judgment, not trivia.

- New specs get IDs **101+**; the runner gains `--suite v1|v2` so v1 stays runnable
  bit-for-bit.

### 3.4 New reported metrics (not folded into the score)

- **Cost and wall-clock per implementation** (tokens where the backend exposes them) —
  outstanding request since 第8回; enables quality-per-cost curves across effort
  levels.
- **Compile-on-first-try rate** and gated-vs-raw score, per condition.
- **Modern-API adoption grep** (already done ad hoc in reports) becomes a runner
  output.

## 4. Comparability: freezing v1, bridging to v2

1. **Tag/freeze v1**: rubric.md, anti-patterns.md, expected-signals, judge pin
   (sonnet-4.6, no effort flag) remain untouched forever; `--suite v1` runs them.
2. **Bridge runs**: run three anchor conditions on *both* suites at n=3 —
   recommendation: `haiku-4.5` (weak anchor), `sonnet-5` (mid), `fable-5-max` (top).
   This gives a v1↔v2 mapping so the 13 existing reports keep their meaning.
3. v2 reports start a new numbered series (v2-第1回) rather than continuing 第14回.

## 5. Rollout phases

1. **Approve this plan** (open decisions below).
2. **Author v2 rubric + anti-patterns rewrite** (§3.2 items 1–4) and the v2
   checkpoint schema.
3. **Checkpoint files for the 9 kept specs** — mine past n=3 outputs for what top
   models *actually* still get wrong (the reports' per-spec analyses are the source);
   that's what makes expert-tier checkpoints empirical rather than aspirational.
4. **Author the 2 redesigned + 3 new specs** (+ spec-intent docs, including the
   missing ones for 007/008). The refactoring spec additionally needs its
   fixture: the deliberately awful-but-working starting implementation.
5. **Runner work**: `--suite`, checkpoint scoring + gates, optional `--judge-k`,
   schema-enforced judge output, cost/wall-clock capture, judge re-pin (sonnet-5).
6. **Calibration**: anchor runs (§4). Acceptance criteria: best condition mean ≤ ~75;
   ≥ ~10 pts between sonnet-5 and fable-5-max; no spec where the top model averages
   ≥ 90. Iterate expert checkpoints until met. Also re-judge one anchor sample 3× to
   quantify residual judge-side variance (decides whether `--judge-k 3` is ever
   needed, §3.2).
7. **v2-第1回 report** documenting the re-baseline and the bridge mapping.

## 6. Decisions (settled 2026-07-18)

| # | decision | outcome |
|---|---|---|
| 1 | v2 judge model | pinned `sonnet-5` with explicit effort pin. **No** cross-vendor audit judge (second vendor not reliably available; evaluator cost non-trivial). Judge k=1 by default; k=3 only if calibration shows residual judge noise > ~±5 per spec. |
| 2 | compile-failure gate | × 0.6 multiplier, raw score also recorded |
| 3 | refactoring-task spec | **in v2.0**; merged with the decomposition stress test (one spec covers both) |
| 4 | suite size | **14 specs** (net +1 vs v1): 9 kept + 2 redesigned + 3 new (refactoring, async actions, imperative animation per issue #1) |
