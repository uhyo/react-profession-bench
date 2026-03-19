# Spec 009: Task Board with Reusable Components — Design Intent

## Purpose

This spec tests **reusable component design** — the ability to extract shared patterns into well-typed, self-contained components. The centerpiece is the **ActionButton** pattern: a button that accepts an async `action` prop (not `onClick`) and internally manages its pending state via `useTransition`. This convention, recommended by the React 19 documentation, signals to consumers that the component handles async lifecycle automatically.

The task board provides a natural context where the same button pattern appears 4+ times (Start, Complete, Reopen, Delete, Create), making the case for extraction obvious.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Component Design | **30%** | Primary focus. Three reusable components must be extracted. |
| Effect Hygiene | **20%** | `useTransition` inside ActionButton replaces manual isPending state. |
| TypeScript Quality | **20%** | Generic `ToggleGroup<T>`, typed `action` prop, typed actions. |
| Accessibility | 15% | `<dialog>`, `aria-busy`, `aria-pressed`, `role="alert"`. |
| State Architecture | 10% | Task list + filters — straightforward. |
| Performance | 5% | Not performance-sensitive. |

## Key Traps

### Trap 1: ActionButton with `action` Prop + `useTransition`

**Requirements 5, 8, 17, 20** specify that all action buttons show independent pending states and this must be a single reusable component.

- **Expert**: An `ActionButton` component with an `action: () => Promise<void>` prop. Internally, the component calls `startTransition(() => action())` (or `useTransition`). The `isPending` flag from the transition controls the button's disabled state and label. Each button instance has its own transition — clicking "Start" on task A has no effect on "Delete" on task B.

  The naming convention is deliberate: `action` (not `onClick`) signals that this callback will be wrapped in an action/transition and the component handles the pending lifecycle. This is the pattern the React 19 docs recommend for components that handle async operations.

- **Tier-2**: A reusable button with `onClick: () => Promise<void>` + internal `useState<boolean>` for isPending, manually set to `true`/`false` around the await. This works and is reusable, but misses `useTransition` — the pending state is imperative rather than declarative, and doesn't integrate with React's concurrent scheduling.

- **Tier-3**: No reusable component. Each action button has its own inline isPending state and try/catch. The pending logic is duplicated 4+ times across the codebase.

### Trap 2: Generic `ToggleGroup<T>`

**Requirements 11–12, 21** specify that both status and priority filters use the same toggle pattern and must share a single reusable component.

- **Expert**: `ToggleGroup<T extends string>` with typed options and onChange. Call sites get type-safe values: `ToggleGroup<TaskStatus | "all">` ensures `onChange` receives `TaskStatus | "all"`, not `string`.
- **Tier-2**: A reusable component but typed with `string` — works but loses type safety at call sites.
- **Tier-3**: Two separate filter components with duplicated toggle logic.

### Trap 3: Reusable `ConfirmDialog`

**Requirements 15–17, 22** specify a confirmation dialog that's not specific to task deletion.

- **Expert**: Uses `<dialog>` element for native modal behavior (top-layer, Escape to close, focus trapping). The confirm button is an `ActionButton` (reusing the same pattern), so it shows pending state during the delete API call.
- **Tier-2**: A reusable dialog but implemented as a div overlay — requires manual focus trap and Escape handling.
- **Tier-3**: Delete confirmation logic inlined in the task component.

### Trap 4: Form with ActionButton

**Requirements 8–10** describe the creation form. Enter-to-submit and pending state.

- **Expert**: A `<form>` element with `ActionButton` as the submit button. The action handles form data extraction and API call. Enter-to-submit works natively.
- **Novice**: `onClick` on the button + `onKeyDown` on the input.

## Data Model Design

The API functions have a 10% failure rate across the board, testing error handling in the ActionButton pattern. The `fetchTasks` function provides initial data, while `createTask`, `updateTaskStatus`, and `deleteTask` are the async operations that exercise the pending button.

Each API call takes ~1 second (800ms + random variance) — long enough that the pending state is clearly visible, short enough that testing doesn't feel slow.

## Why This Spec Exists

Reusable component design is a core React skill that earlier specs don't directly test. Specs 001–008 focus on which hooks to use; this spec focuses on **how to package behavior into components**. The `action` prop convention and `useTransition` integration represent React 19's recommended pattern for async UI, and the generic `ToggleGroup<T>` tests whether the model can write properly typed reusable components — a skill that distinguishes production React developers from those who copy-paste.
