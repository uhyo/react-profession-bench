# Evaluation Rubric

This rubric is used by the LLM judge to evaluate React code quality. Each category is scored 1–5, then weighted to produce a final LLM judge score (0–100).

## Instructions for the LLM Judge

For each category below:

1. Read the submitted code carefully.
2. Review the static analysis results provided alongside the code.
3. Quote specific code sections that support your assessment.
4. Assign a score from 1–5 using the descriptors provided.
5. Write a 2–3 sentence justification.

Respond in the specified JSON format.

---

## Category 1: State Architecture (Weight: 25%)

How well does the code manage React state?

| Score | Descriptor |
|---|---|
| 5 | State is minimal with zero duplication. All derived values are computed during render (or via `useMemo`), never stored as separate state. State is lifted to exactly the right level — not too high (causing unnecessary re-renders of the entire tree), not too low (requiring prop drilling or effect-based syncing). Clear ownership of each piece of state. |
| 4 | State is mostly clean. One minor instance of unnecessary state or slightly suboptimal lifting. Derived values are mostly computed correctly. |
| 3 | State works but has noticeable issues: some derived values stored as state, some duplication, or state lifted too high/low. Some state is synced between components via effects rather than shared through proper React patterns. |
| 2 | Significant state problems. Multiple pieces of duplicated state. Derived values frequently stored and synced. Unclear ownership — hard to trace where state lives and why. |
| 1 | State is chaotic. Heavy duplication across components. State is synced via cascading effects. Circular dependencies between state updates. Changing one field triggers a chain of effect-driven updates. |

### What to look for

- Is `wordCount` computed inline or stored as state?
- Is `isFormComplete` / `isNextDisabled` derived or stored?
- Is the preview sidebar rendering form state directly or maintaining its own copy?
- Is phone number formatting done in the event handler or via a useEffect sync loop?
- Is form state shared between steps via lifting/context or synced via effects?

---

## Category 2: Effect Hygiene (Weight: 20%)

Are `useEffect` calls used correctly — only for true side effects?

| Score | Descriptor |
|---|---|
| 5 | Effects are used exclusively for genuine side effects: reading/writing localStorage, setting up timers, subscribing to external sources. Zero instances of effects used for derived state computation or event handling. All effects have correct dependency arrays and proper cleanup where needed (timers, subscriptions). |
| 4 | Effects are mostly correct. One minor misuse or a missing cleanup for a non-critical effect. Dependencies are correct throughout. |
| 3 | Some misuse of effects: 1–2 instances of derived-state effects or event-handling effects. Most cleanup is present. Dependency arrays are mostly correct. |
| 2 | Frequent misuse. Multiple derived-state effects. Missing cleanups. Some incorrect or missing dependency arrays. Effects are used as a primary state synchronization mechanism. |
| 1 | Heavy reliance on effects for everything: derived state, event handling, state sync between components. Missing dependency arrays. No cleanup. The component lifecycle is driven by effect chains rather than React's declarative model. |

### What to look for

- Count the total number of `useEffect` calls. For this spec, 1–3 is healthy (localStorage load/save, possibly a debounce timer). More than 5 is a red flag.
- Does any `useEffect` body only call state setters with computations based on other state? (anti-pattern)
- Does any `useEffect` handle what should be a user interaction? (e.g., validation triggered by effect instead of onBlur)
- Are timers (`setTimeout`, `setInterval`) or event listeners cleaned up in the effect's return function?
- **For specs with async data fetching**: Is Suspense used instead of manual `useEffect` + loading state? React 19's `use()` hook with Suspense boundaries eliminates the need for data-fetching effects entirely. The `useEffect` + `useState` + `isLoading` pattern still works but represents the older approach and should score lower.
- Are error boundaries used for per-section error isolation, or is error handling done via try/catch in useEffect with error state?
- **For specs subscribing to external sources (browser APIs, event buses, WebSockets)**: Is `useSyncExternalStore` used? The `useEffect` + `useState` + `addEventListener` pattern works but is prone to tearing (stale reads between render and commit) and is exactly the problem `useSyncExternalStore` (React 18+) was designed to solve. Look for custom hooks wrapping `useSyncExternalStore` with `subscribe` and `getSnapshot` functions.
- **For specs where effects need latest values without re-triggering**: Is `useEffectEvent` (React 19.2) used? When an effect subscribes to an external source and the callback needs to read the latest notification settings/configuration without re-establishing the subscription, `useEffectEvent` is the correct approach. The ref-based workaround (`useRef` + manual sync) works but is the pattern `useEffectEvent` was designed to replace.

---

## Category 3: Component Design (Weight: 20%)

Are components well-structured with clear responsibilities?

| Score | Descriptor |
|---|---|
| 5 | Components have clear single responsibilities. Each form step is its own component. Shared UI patterns (e.g., form fields with labels and errors) are extracted into reusable components. The composition hierarchy is logical. Components communicate via props in a straightforward way — no prop drilling through more than 2 intermediate layers. Children/render props are used where appropriate. |
| 4 | Good structure overall. Most responsibilities are clear. One component may be slightly overloaded or one composition opportunity is missed. |
| 3 | Adequate structure. Some components do too much (e.g., the entire form in one component, or a step component that also handles global navigation). Some missed composition opportunities. Minor prop drilling. |
| 2 | Poor structure. Several bloated components. Significant mixing of concerns (e.g., validation logic mixed with rendering mixed with persistence). Excessive prop drilling. |
| 1 | Monolithic: the entire app is in one or two massive components. Or the opposite extreme: everything is split into tiny components with no clear benefit, creating indirection without abstraction. |

### What to look for

- Is there a separate component for each form step?
- Is the preview sidebar its own component?
- Is the modal its own component?
- Are form field wrappers (label + input + error) extracted if the pattern repeats?
- Does the component tree depth make sense?

---

## Category 4: TypeScript Quality (Weight: 15%)

How well is TypeScript used to express intent and catch errors?

| Score | Descriptor |
|---|---|
| 5 | Precise types throughout. The provided `data-model.ts` types are used correctly. Component props are typed with interfaces or type aliases (not inline object types in multiple places). No `any` types. Event handlers are properly typed (`React.ChangeEvent<HTMLInputElement>`, etc.). Discriminated unions or string literal types are used where they add clarity. Types serve as documentation — reading the types tells you how a component is used. |
| 4 | Good typing overall. Minor issues: one or two overly broad types, or an event handler typed as `any` in a non-critical spot. Types are present and useful. |
| 3 | Types are present but inconsistent. Some `any` usage. Some components have typed props, others don't. Event handlers are loosely typed. The types add some value but don't fully leverage TypeScript's power. |
| 2 | Minimal typing. Frequent `any` or `unknown` without narrowing. Props are untyped or use inline `{[key: string]: any}`. Types are more of an afterthought than a design tool. |
| 1 | Effectively untyped. `any` everywhere. Type errors are suppressed with `as any` or `@ts-ignore`. TypeScript provides no safety or documentation value. |

### What to look for

- Are the provided types from `data-model.ts` imported and used?
- Are there any `any` types? Count them.
- Are component props defined with named interfaces/types?
- Are event handlers typed correctly or as `any`/`(e: any) => void`?
- Are state variables typed (explicitly or via inference from initial values)?

---

## Category 5: Performance Awareness (Weight: 10%)

Does the code show appropriate awareness of rendering performance?

| Score | Descriptor |
|---|---|
| 5 | `useMemo` is used for genuinely expensive computations (if any exist). `useCallback` is used where callback stability matters (e.g., callbacks passed to memoized children). No premature optimization — memoization is not applied blindly to everything. Object/array literals are not created inline in JSX props where they would cause unnecessary re-renders of memoized children. Where applicable, concurrent rendering APIs (`useDeferredValue`, `useTransition`) are used to keep interactive elements responsive while expensive re-renders are deferred. Visual feedback (e.g., dimmed list) indicates pending updates. |
| 4 | Good awareness. One minor miss — either a missing optimization where it clearly matters, one unnecessary memoization, or concurrent rendering is used but without visual pending feedback. |
| 3 | Inconsistent. Either over-memoizes everything (wrapping every function in `useCallback` and every value in `useMemo` regardless of need) or misses clear optimization opportunities. May use manual debouncing (setTimeout) where concurrent rendering would be more appropriate. |
| 2 | Poor awareness. Creates new objects/functions on every render in performance-sensitive paths. Or applies `React.memo` / `useMemo` / `useCallback` in a way that shows misunderstanding (e.g., memoizing a value that depends on every piece of state). No use of concurrent rendering where it is clearly needed. |
| 1 | No awareness whatsoever. Inline object/function creation everywhere. No use of memoization even where it would clearly help. Or completely wrong usage of memoization APIs. No concurrent rendering consideration. |

### What to look for

- Are there expensive computations that should be memoized?
- Are callbacks passed to child components stable when they should be?
- Is `React.memo` used on any components? Is the usage justified?
- Are object/array literals created inline in JSX props? (e.g., `style={{ ... }}` in a map)
- Where user input triggers expensive list re-renders, is `useDeferredValue` or `useTransition` used to keep the input responsive?
- Is there visual feedback (e.g., reduced opacity) while a deferred/transitioned update is pending?
- Is manual debouncing (`setTimeout`) used as a substitute where concurrent rendering would be more appropriate?

---

## Category 6: Accessibility & HTML Semantics (Weight: 10%)

Does the code use semantic HTML and follow accessibility best practices?

| Score | Descriptor |
|---|---|
| 5 | Semantic HTML throughout: `<form>`, `<fieldset>`, `<legend>`, `<label>`, `<button>`, `<select>`, `<dialog>` used appropriately. All form inputs have associated labels (via `htmlFor` or wrapping). Error messages use `aria-describedby` or equivalent to associate with inputs. Buttons have explicit `type` attributes. The modal uses `<dialog>` or has proper ARIA roles (`role="dialog"`, `aria-modal`). The step indicator conveys state to screen readers. |
| 4 | Good semantic HTML. Most inputs labeled correctly. Minor gaps — perhaps one missing label association or the modal lacks ARIA attributes. |
| 3 | Some semantic elements used, but gaps. Basic form inputs are labeled but more complex elements (modal, step indicator) lack accessibility. Some `<div>` used where semantic elements would be better. |
| 2 | Minimal semantics. Some `<div onClick>` instead of `<button>`. Missing labels for several inputs. No ARIA attributes. Modal is a styled div with no accessibility consideration. |
| 1 | No semantic HTML. Everything is `<div>` and `<span>`. Click handlers on non-interactive elements. No labels, no ARIA. Form is not a `<form>` element. The UI is completely inaccessible to assistive technology. |

### What to look for

- Is the form wrapped in a `<form>` element?
- Does every input have a `<label>` with correct `htmlFor`?
- Do buttons have `type="button"` or `type="submit"`?
- Is the modal a `<dialog>` or does it have `role="dialog"`?
- Are error messages associated with their inputs via `aria-describedby`?
- Is the step indicator accessible (not just visual)?

---

## Scoring Output Format

The LLM judge must respond in this JSON format:

```json
{
  "categories": {
    "state_architecture": {
      "score": <1-5>,
      "justification": "<2-3 sentences with code references>"
    },
    "effect_hygiene": {
      "score": <1-5>,
      "justification": "<2-3 sentences with code references>"
    },
    "component_design": {
      "score": <1-5>,
      "justification": "<2-3 sentences with code references>"
    },
    "typescript_quality": {
      "score": <1-5>,
      "justification": "<2-3 sentences with code references>"
    },
    "performance_awareness": {
      "score": <1-5>,
      "justification": "<2-3 sentences with code references>"
    },
    "accessibility_semantics": {
      "score": <1-5>,
      "justification": "<2-3 sentences with code references>"
    }
  },
  "anti_patterns_observed": [
    "<description of specific anti-pattern with file and line reference>"
  ],
  "strengths": [
    "<notable positive patterns observed>"
  ],
  "weighted_score": <0-100>
}
```

The `weighted_score` is calculated using per-spec weights from `expected-signals.json`:

```
weighted_score = (
  state_architecture × W_sa +
  effect_hygiene × W_eh +
  component_design × W_cd +
  typescript_quality × W_ts +
  performance_awareness × W_pa +
  accessibility_semantics × W_as
) / 5 × 100 / 100
```

Where `W_*` values are the `rubric_weights` from the spec's `expected-signals.json` (must sum to 100).

Multiply each score by its weight, sum, divide by 5, multiply by 20. A perfect score (all 5s) = 100. The minimum (all 1s) = 20.

### Per-Spec Weight Profiles

| Category | 001 (Form) | 002 (Dashboard) | 003 (Quiz) | 004 (Profile) | 005 (Status) | 006 (Feed) | 007 (SNS) | 008 (Survey) |
|---|---|---|---|---|---|---|---|---|
| State Architecture | **25** | 10 | 15 | 15 | 15 | 15 | 10 | 15 |
| Effect Hygiene | **20** | 5 | 10 | **25** | **30** | **30** | **25** | **25** |
| Component Design | 20 | **25** | 15 | 15 | 15 | 15 | 10 | 10 |
| TypeScript Quality | 15 | 20 | **25** | 10 | 10 | 15 | 10 | 15 |
| Performance Awareness | 10 | **30** | 5 | 15 | 10 | 5 | **25** | 5 |
| Accessibility & Semantics | 10 | 10 | **30** | **20** | 10 | 10 | **20** | **30** |

Each spec emphasizes different categories (bold = primary focus), ensuring the benchmark collectively covers all six dimensions as primary measurement targets.

**Effect Hygiene focus by spec:**
- **Spec 004** measures Suspense adoption — with Suspense + `use()`, data fetching requires zero `useEffect` calls. The traditional pattern works but scores lower.
- **Spec 005** measures `useSyncExternalStore` — subscribing to browser APIs and external stores. The `useEffect` + `useState` + `addEventListener` pattern works but is prone to tearing and is exactly what `useSyncExternalStore` was designed to replace.
- **Spec 006** measures `useEffectEvent` — reading latest values in effects without re-triggering subscriptions. The ref-based workaround works but is the manual pattern that `useEffectEvent` replaces.
- **Spec 007** measures `useOptimistic` — instant UI feedback for async actions (like/unlike). Manual setState-before-API works but is the pattern `useOptimistic` replaces.
- **Spec 008** measures React 19 form actions — `<form action={fn}>`, `useActionState`, `useFormStatus`. The `onSubmit` + `e.preventDefault()` pattern works but misses the declarative form lifecycle.
