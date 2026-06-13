# react-profession-bench

A benchmark for measuring how well LLMs write **professional-quality React code**.

Unlike general coding benchmarks, this project specifically targets React-specific proficiency: state architecture, effect hygiene, component design, TypeScript quality, and accessibility — the things that separate production-ready code from "it works but I wouldn't ship it."

## How It Works

Each benchmark run is one `(spec × model)` combination and proceeds in two phases.

### Phase 1: Implementation

An LLM agent receives:

- A **spec** (`spec.md`) describing a small React application's behavior and requirements (never hinting at implementation patterns)
- A **data model** (`data-model.ts`) with TypeScript type definitions (and any seed data)

The runner copies the **scaffold** project (Vite + React 19 + TypeScript, with an empty `src/App.tsx`) into a fresh sandbox under the OS temp dir, runs `npm install`, then hands the agent file tools (`Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`) to implement the app. Specs forbid external UI/state libraries — the benchmark measures React knowledge, not library knowledge (the scaffold ships only `react`/`react-dom`).

After implementation the runner runs `tsc -b --noEmit` once and records whether the code compiles (`compiles: true/false`). This is captured alongside the result for reference; the numeric score comes entirely from Phase 2.

### Phase 2: LLM-Judge Evaluation

A separate LLM (the **eval model**, default `sonnet`) scores the submitted code in a **single** call. It receives:

- the original spec,
- the full submitted source,
- the shared rubric (`evaluation/rubric.md`),
- the anti-pattern catalog (`evaluation/anti-patterns.md`) — a reference the judge applies itself while reading the code,
- the per-spec **expected signals** (`evaluation/<spec>/expected-signals.json`), which include this spec's rubric weights.

The judge returns JSON: a 1–5 score (with justification) for each of six categories, the anti-patterns it observed, strengths, and a single `weighted_score`.

| Category | What It Measures |
|---|---|
| State Architecture | Minimal state, no duplication, derived values computed not stored |
| Effect Hygiene | Effects used only for true side effects, proper cleanup and deps |
| Component Design | Single responsibility, proper composition, right abstraction level |
| TypeScript Quality | Precise types, no `any`, discriminated unions, types as documentation |
| Performance Awareness | Justified memoization, stable references, no over-optimization |
| Accessibility & Semantics | Semantic HTML, labels, ARIA, keyboard navigation |

### Scoring

The score for a run **is the judge's `weighted_score`**. Each category's 1–5 score is combined using that spec's weights:

```
weighted_score = Σ(category_score × weight) / 5      # weights sum to 100, scores are 1–5
```

All 5s → **100**; all 1s → **20**. So every score lands in **20–100**.

**Each spec sets its own weights.** `rubric.md` documents default weights (25/20/20/15/10/10); each spec overrides them via `rubric_weights` in its `expected-signals.json` to emphasize the skills it targets. For example:

| Spec | state | effect | component | TS | perf | a11y |
|---|--:|--:|--:|--:|--:|--:|
| 001 Event Registration Form | 25 | 20 | 20 | 15 | 10 | 10 |
| 002 Data Dashboard | 10 | 5 | 25 | 20 | **30** | 10 |
| 013 Settings Undo/Redo | **30** | 10 | 20 | 20 | 10 | 10 |

### Variance and the n=3 methodology

The judge runs **once per implementation**. Because both implementation and judging are stochastic, a single per-spec score swings by **±10–15 points** between runs, which is enough to flip generation-level conclusions. So the methodology is:

1. Run the **whole 13-spec benchmark 3 times** (n=3), each into its own scores file (see the driver below).
2. Average each spec's score across the 3 samples, then average across the 13 specs for the benchmark mean.
3. Treat a difference as a **real improvement only when the per-spec ranges don't overlap** (the new minimum beats the old maximum); otherwise it's within noise.

When comparing two conditions, run **both** at n=3. See [`scores/`](scores/) for completed experiment data and reports.

## Running the Benchmark

**Prerequisites:** [Node.js](https://nodejs.org/) **24+** (the runner is TypeScript executed directly via Node's type stripping — no build step) and the [Claude Code](https://claude.ai/claude-code) CLI authenticated. Copilot/Gemini models additionally require the `copilot` CLI.

```bash
# Run all specs against the default models (sonnet, opus, haiku)
node runner/run.ts

# One spec, one model
node runner/run.ts --spec 001-event-registration-form --model sonnet

# Several specs and models (flags are repeatable)
node runner/run.ts --spec 001-event-registration-form --spec 002-data-dashboard --model opus --model haiku

# Use a different judge
node runner/run.ts --model opus --eval-model sonnet

# Preview the run matrix without executing
node runner/run.ts --dry-run

# Full flag list
node runner/run.ts --help
```

### Models

Models are referenced by short **alias**; the backend (Claude CLI / Copilot / Gemini) is deduced from the alias. The registry (`MODEL_REGISTRY` in `runner/run.ts`, also printed by `--help`) includes:

- **Claude aliases** — `sonnet`, `opus`, `haiku` (track latest), and version-pinned ones like `opus-4.8`, `fable-5`, `haiku-4.5`.
- **Effort variants** — e.g. `opus-4.8-max`, `fable-5-max`, which pass `--effort max`. Max effort costs far more (see the budget note below).
- **Copilot/Gemini** — e.g. `gpt-5.4`, `gemini-3-pro-preview`.

To benchmark a new Claude model, add one line to `MODEL_REGISTRY`.

### Long, unattended runs (usage limits, sleep, the driver)

A full sweep — especially at `--effort max` — far exceeds one 5-hour usage window, and on a laptop the host may sleep or reboot mid-run. The runner is built to survive all of this:

- **Incremental scores + `--resume <file>`** — every spec's result is written immediately, and `--resume` skips any spec that already has a score. After any kill, re-run the same command to continue.
- **`--retry-on-limit`** — on a usage limit, wait for the window to refill and retry. Instead of sleeping a fixed ~5h, it **probes to wake**: it polls a cheap health check every ~5 min (capped by the provider's reset time or a 5h05m fallback) and resumes the moment the window is actually back.
- **`--max-transient-retries <n>`** (default 2) — a non-limit failure (e.g. a connection broken by the host sleeping) gets a few immediate short-backoff retries before being recorded.
- **`--keep-awake`** — holds the Windows host awake via `SetThreadExecutionState` (WSL only). Inhibits idle-sleep; lid-close still sleeps, so the transient self-heal is the real guarantee.
- **`--max-budget-usd <n>`** — per-implementation spend cap. Defaults scale by effort: **$5** normally, **$15** for `effort=max` (max effort on the heaviest specs blows a flat $5 mid-run). A budget overage is detected as its own deterministic failure and recorded without futile retries.

**The driver — `runner/run-samples.sh`** — is what you use for n=3 without babysitting. It runs N whole-benchmark samples sequentially, each into its own scores file, re-invoking `--resume` (up to 6 passes) until each file reaches a full 13/13:

```bash
# Three full samples → three scores files, fully unattended
runner/run-samples.sh opus-4.8-max \
  scores/multi_opus-4.8-max-s1.json \
  scores/multi_opus-4.8-max-s2.json \
  scores/multi_opus-4.8-max-s3.json
```

It passes `--retry-on-limit --keep-awake --max-transient-retries 3` for you. For a run that must outlive your shell, launch it detached:

```bash
setsid nohup runner/run-samples.sh fable-5-max \
  scores/multi_fable-5-max-s1.json scores/multi_fable-5-max-s2.json scores/multi_fable-5-max-s3.json \
  > /tmp/run.log 2>&1 &
```

If the machine hard-reboots (full process kill), just relaunch the same command — `--resume` tops each file up from where it stopped.

### Outputs

- **`results/`** (gitignored) — raw per-run artifacts: a working directory with the implemented source, the `evaluation-result.json`, and a `summary_*.json` scorecard.
- **`scores/`** (committed) — the curated JSON the driver writes: an array of per-`(spec, model)` rows, each with `weighted_score`, the six 1–5 `categories`, `compiles`, and `timestamp`. One file per sample; reports in this directory aggregate them.

## Project Structure

```
react-profession-bench/
├── README.md
├── specs/                       # Benchmark specifications (given to the implementer)
│   └── <NNN-name>/
│       ├── spec.md              # Behavioral spec (no implementation hints)
│       └── data-model.ts        # TypeScript types (+ any seed data)
├── scaffold/                    # Template project copied into each sandbox
│   ├── package.json             # react + react-dom only
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/{main.tsx, App.tsx}  # App.tsx starts empty
├── evaluation/                  # Evaluation criteria (NOT shown to the implementer)
│   ├── rubric.md                # Shared 1–5 rubric + weighting formula
│   ├── anti-patterns.md         # Catalog the judge applies
│   └── <NNN-name>/
│       └── expected-signals.json # Per-spec rubric_weights + signals to look for
├── runner/
│   ├── run.ts                   # Orchestration engine (one spec×model per invocation)
│   └── run-samples.sh           # Driver: N whole-benchmark samples for n=3
├── scores/                      # Committed scores files + experiment reports
└── docs/
    ├── writing-specs.md         # Guide for adding new specs
    └── spec-intents/            # Per-spec design intent notes
```

## Specs

Each spec is a self-contained Markdown document describing a small React application. Specs are designed to create **natural decision points** where an expert and a novice would make different choices — without ever mentioning hooks, patterns, or implementation approaches.

### Design Principles

1. **Specs describe behavior, never implementation.** If the spec says "extract form logic into a custom hook," we are testing instruction-following, not React proficiency.
2. **Forbid external libraries** so the benchmark measures React fundamentals.
3. **Keep apps small** (5–15 components, ~500–800 lines) but rich in decision points.
4. **Anti-patterns are more informative than best practices.** It is easier to reliably detect what someone does wrong than to fully enumerate what they do right.

### Available Specs

Each spec has its own rubric weight profile, emphasizing different React skills.

| ID | Name | Primary Focus | Key Signals Tested |
|---|---|---|---|
| 001 | Event Registration Form | State Architecture, Effect Hygiene | Derived state traps, useEffect anti-patterns, validation-on-blur, form handling |
| 002 | Multi-Panel Data Dashboard | Performance, Component Design | Memoization of expensive filtering/sorting, React.memo, generic list composition, discriminated unions |
| 003 | Accessible Interactive Quiz Builder | Accessibility, TypeScript Quality | ARIA patterns, focus management, keyboard navigation, discriminated union narrowing, type-specific components |
| 004 | User Profile Browser | Effect Hygiene, Accessibility | Suspense for data fetching, granular Suspense boundaries, error boundaries, useTransition for navigation, progressive loading, loading skeletons |
| 005 | System Status Dashboard | Effect Hygiene | useSyncExternalStore for browser APIs (online status, viewport, media queries, visibility), external event bus subscription, custom hooks wrapping external stores |
| 006 | Notification Activity Feed | Effect Hygiene | useEffectEvent for stable subscriptions with changing settings, configurable auto-save with latest-value reads, toast management, pause/resume without reconnecting |
| 007 | SNS Post Feed | Effect Hygiene, Performance | useOptimistic for instant like feedback, Activity component for offscreen deprioritization, memoized text parsing, semantic `<article>` elements |
| 008 | Multi-Section Survey Form | Effect Hygiene, Accessibility | `<form action={fn}>` pattern, useActionState, useFormStatus, native Enter-to-submit, `<fieldset>`/`<legend>` grouping |
| 009 | Task Board (Reusable Components) | Component Design, Effect Hygiene, TypeScript | ActionButton with `action` prop + useTransition, generic ToggleGroup`<T>`, reusable ConfirmDialog with `<dialog>` |
| 010 | Tree View File Explorer | Accessibility, Component Design | aria-tree/treeitem pattern, roving tabindex, recursive component rendering, discriminated union for nodes |
| 011 | Tooltip and Popover System | Component Design, Effect Hygiene, Accessibility | HTML Popover API + CSS Anchor Positioning (best), createPortal + ref (fallback), ref-as-prop (React 19), reusable component API |
| 012 | Multi-Tab Document Editor | State Architecture, Performance | React.lazy + Suspense for code splitting, preserving inactive tab state, tab management, memoized Markdown preview |
| 013 | Settings Dashboard with Undo/Redo | State Architecture, TypeScript | useReducer for undo/redo history, `<Context>` (React 19), context splitting, typed action discriminated unions |

## Evaluation Details

See [`evaluation/rubric.md`](evaluation/rubric.md) for the full 1–5 rubric and weighting formula, and [`evaluation/anti-patterns.md`](evaluation/anti-patterns.md) for the catalog of anti-patterns the judge applies.

## Contributing

See [`docs/writing-specs.md`](docs/writing-specs.md) for a guide on writing new specs and evaluation criteria.

## Key Design Decision: Why `useEffect` Matters So Much

The single strongest signal of React proficiency is how a developer uses `useEffect`. The most common mistake — and the one that most clearly reveals a lack of understanding of React's mental model — is using `useEffect` to synchronize derived state:

```tsx
// Anti-pattern: derived state via useEffect
const [bio, setBio] = useState("");
const [wordCount, setWordCount] = useState(0);
useEffect(() => {
  setWordCount(bio.trim().split(/\s+/).length);
}, [bio]);

// Correct: compute during render
const [bio, setBio] = useState("");
const wordCount = bio.trim().split(/\s+/).length;
```

This pattern is so prevalent among LLMs and junior developers that it serves as a litmus test. The benchmark specs are specifically designed to create opportunities where this anti-pattern is tempting.
