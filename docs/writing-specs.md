# Writing Specs and Evaluation Criteria

This guide explains how to add new specs to the benchmark: writing the behavioral spec, designing the data model, defining expected signals, and choosing rubric weights.

## Philosophy

The benchmark measures whether an LLM **knows how to use React properly** — not whether it can follow instructions. Every design decision flows from this principle:

1. **Specs describe behavior, never implementation.** If you write "use a custom hook for X," you are testing instruction-following, not React proficiency. Describe *what the app does*, not *how to build it*.
2. **Create natural decision points.** The spec should present requirements where an expert and a novice would naturally make different choices. The expert's choice should emerge from understanding React's mental model, not from being told what to do.
3. **Each spec has a primary focus.** While all six rubric categories are always scored, each spec should stress-test 1–2 categories by creating multiple decision points in those areas. Different specs cover different categories.
4. **Prefer modern React idioms.** The benchmark values code that uses the right tool for the job. When React provides a dedicated API for a pattern (e.g., `useSyncExternalStore` for external subscriptions, `useEffectEvent` for stable effect callbacks, `Suspense` for async), using that API is the expert choice. Older workarounds (refs, manual state + effects) are functional but score lower.

## What Makes a Good Spec

### Size

- **5–15 components, ~500–800 lines** of implementation. Small enough for one-shot LLM implementation, complex enough to create multiple decision points.
- If the spec would require more than ~15 components, simplify it. If it would require fewer than 5, it's too simple to differentiate expert from novice.

### Trap Density

A good spec sets **at least 3–4 traps** in its primary focus area. A "trap" is a requirement that:
- Has a correct React approach and an obvious-but-wrong approach
- The wrong approach *works* (passes functional tests) but reveals a misunderstanding
- The difference is detectable by a code reviewer (human or LLM)

**Examples of effective traps:**

| Requirement | Expert choice | Novice trap |
|---|---|---|
| "Show a word count below the textarea" | Compute inline: `const count = text.split(/\s+/).length` | `useState` + `useEffect` to sync derived state |
| "Search input must remain responsive while list updates" | `useDeferredValue` / `useTransition` | Synchronous filtering blocking the input, or manual `setTimeout` debounce |
| "Status card updates instantly when user goes offline" | `useSyncExternalStore` with `navigator.onLine` | `useEffect` + `useState` + `addEventListener` |
| "Changing notification settings must not disconnect the event stream" | `useEffectEvent` for the handler | Including settings in `useEffect` deps, or disabling the lint rule |
| "Three sections load independently from the API" | Granular `<Suspense>` boundaries per section | Single boundary, or `useEffect` + `isLoading` state per section |

### Constraints Section

Always include these constraints to ensure the benchmark measures React fundamentals:

- No external state management libraries (Redux, Zustand, Jotai, etc.)
- No external form/UI/data-fetching libraries
- Standard CSS only (no CSS-in-JS)
- Function components only

### Non-Requirements Section

Explicitly list things that are NOT required to prevent over-engineering:

- Responsive design
- Animations/transitions
- Backend integration (unless the spec involves async)
- Dark mode, i18n, etc.

This focuses the LLM on the React patterns being tested, not on peripheral concerns.

## File Structure

Each spec produces files in two directories:

```
specs/{id}-{name}/
├── spec.md            # Behavioral specification (given to implementer)
└── data-model.ts      # TypeScript types + any provided data/APIs

evaluation/{id}-{name}/
└── expected-signals.json   # Evaluation criteria (NOT shown to implementer)
```

### spec.md

The spec follows this structure:

```markdown
# {App Name}

## Overview
One-sentence description.

## Requirements

### Functional Requirements
Numbered list of behavioral requirements.

### {Section Name}
Group related requirements by feature area.

## Data Model
Reference to data-model.ts.

## UI Layout
ASCII art showing the layout structure.

## Constraints
Library/technology restrictions.

## Non-Requirements
Explicitly scoped out features.
```

**Writing tips:**
- Number all requirements sequentially across sections. The expected-signals reference requirements by number.
- Write from the user's perspective: "The user can...", "When the user clicks...", "The input must..."
- Be precise about edge cases (e.g., "If fewer than 10 digits, display raw digits without formatting").
- Never use words like "hook," "state," "effect," "memo," "component," "ref," "context," or "reducer" in the spec. These are implementation concepts.
- It's OK to describe *behavioral* qualities that imply specific APIs without naming them. For example, "The search input must remain responsive at all times" implies concurrent rendering, and "Changing settings must not interrupt the event stream" implies stable callbacks — but neither names the API.

### data-model.ts

Provides TypeScript types that the implementer must use, plus any data or APIs.

**Design principles:**

- **Use discriminated unions** when the spec has entities with type-varying structure (messages with text/image/file types, questions with single/multiple/true-false types). This tests TypeScript narrowing.
- **Shape APIs to match React patterns** when possible. For example, the event bus in spec 005 exports `subscribe` + `getSnapshot` — exactly the shape `useSyncExternalStore` expects. The implementer isn't told this, but an expert will recognize it.
- **Include enough data to stress performance** when testing memoization (spec 002 has 200 contacts + 500 messages).
- **Include realistic failure modes** when testing error handling (spec 004's API has a 10% failure rate).

### expected-signals.json

This is the core evaluation document. It tells the evaluator exactly what to look for.

**Top-level structure:**

```json
{
  "spec_id": "NNN",
  "spec_name": "Human-readable name",
  "rubric_weights": {
    "state_architecture": <0-100>,
    "effect_hygiene": <0-100>,
    "component_design": <0-100>,
    "typescript_quality": <0-100>,
    "performance_awareness": <0-100>,
    "accessibility_semantics": <0-100>
  },
  "primary_focus": "Short description of what this spec primarily tests",
  ...signal sections...
}
```

The `rubric_weights` must sum to 100. The primary focus area(s) should have the highest weights (25–30).

**Signal sections to include:**

#### `derived_values_that_must_not_be_state`

List values that should be computed during render, not stored as state. Each entry has:
- `name`: The value (e.g., "wordCount")
- `trigger`: Which requirement creates this decision point
- `correct`: The expert approach
- `anti_pattern`: The novice trap

#### `legitimate_effect_uses`

List effects that *are* correct for this spec (e.g., localStorage save, timer setup). This prevents the evaluator from penalizing correct effects.

#### `event_handler_patterns`

List interactions that should be handled via event handlers, not effects.

#### `component_decomposition`

Expected component structure with `minimum_reasonable`, `maximum_reasonable`, and a list of expected/optional components.

#### Spec-specific signal sections

Add sections specific to the spec's focus area. Naming convention: `{focus}_signals`. Examples:
- `suspense_signals` (spec 004)
- `sync_external_store_signals` (spec 005)
- `effect_event_signals` (spec 006)
- `performance_signals` (spec 002)
- `accessibility_signals` (spec 003)
- `error_handling_signals` (spec 004)

Each signal has:
- `signal`: What to look for
- `trigger`: Which requirement drives it
- `correct`: The expert approach
- `anti_pattern` / `anti_pattern_tier1` / `anti_pattern_tier2`: Progressively less wrong approaches. Tier 1 is worst (completely wrong), tier 2 is the "works but uses the old pattern" approach.

#### `accessibility_checkpoints`

A list of specific accessibility requirements to verify (labels, ARIA, keyboard, focus management).

#### `typescript_signals`

Type-specific quality checks (narrowing, generics, `any` avoidance).

#### `custom_hook_opportunities`

Hooks the expert would extract, with what each wraps.

## Choosing Rubric Weights

The six categories and their typical weight ranges:

| Category | What it measures | Typical range | When to weight high |
|---|---|---|---|
| State Architecture | Minimal state, derived values, proper lifting | 10–25 | Spec has many derived-value traps |
| Effect Hygiene | Effects for side effects only; modern APIs | 5–30 | Spec tests Suspense, useSyncExternalStore, useEffectEvent, or has many effect traps |
| Component Design | Composition, single responsibility, abstraction | 15–25 | Spec has repeated patterns ripe for extraction, or complex parent-child relationships |
| TypeScript Quality | Precise types, narrowing, generics, no `any` | 10–25 | Spec has discriminated unions, generic components, or complex type relationships |
| Performance Awareness | Memoization, concurrent rendering, stable refs | 5–30 | Spec has large data sets, expensive computations, or multiple independent update paths |
| Accessibility & Semantics | ARIA, keyboard, focus management, semantic HTML | 5–30 | Spec has complex interactive widgets, dynamic content, or focus-sensitive flows |

**Rules:**
- Weights must sum to 100.
- The primary focus area(s) should be 25–30.
- No category should be below 5 (all are always relevant to some degree).
- Check the existing weight table in `rubric.md` to ensure the new spec covers areas that need more representation.

## Anti-Pattern Tiering

When a spec tests a specific React API (Suspense, useSyncExternalStore, useEffectEvent, useDeferredValue), define anti-patterns in tiers:

- **Tier 1 (worst):** Completely wrong approach that ignores the problem (e.g., no loading states at all, settings in effect deps causing reconnection)
- **Tier 2 (functional but outdated):** The older React pattern that works but shows lack of knowledge of the modern API (e.g., `useEffect` + `useState` + `isLoading` instead of Suspense, refs instead of `useEffectEvent`)
- **Tier 3 (hack):** Working around the lint rules or type system (e.g., `eslint-disable exhaustive-deps`, `as any`)

This tiering helps the LLM judge calibrate scores: tier 1 is a 1–2, tier 2 is a 3, and the correct approach is a 4–5.

## Checklist Before Submitting a New Spec

- [ ] spec.md contains no implementation terms (hooks, state, effect, memo, component, ref, context, reducer)
- [ ] spec.md has numbered requirements that expected-signals can reference
- [ ] data-model.ts compiles with `tsc --noEmit`
- [ ] expected-signals.json has `rubric_weights` summing to 100
- [ ] At least 3–4 traps in the primary focus area
- [ ] `legitimate_effect_uses` lists all effects that ARE correct (so the evaluator doesn't false-positive)
- [ ] `derived_values_that_must_not_be_state` lists all derived-value traps
- [ ] `component_decomposition` has reasonable min/max counts
- [ ] `accessibility_checkpoints` has at least 3–4 items
- [ ] README.md specs table and rubric weight table are updated
